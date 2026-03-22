import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getMood } from "@/lib/mood-map";

const SYSTEM = `You are a poetic diary writer. Based on the conversation transcript and photo context, generate a diary entry and emotional analysis.

Return ONLY valid JSON with this exact shape:
{
  "diaryText": "First-person diary entry, 150-220 characters in Chinese, warm and personal tone",
  "valence": 0.75,
  "arousal": 0.4,
  "musicSearchQuery": "Spotify search string that matches the mood (artist + genre or vibe)",
  "musicReason": "One sentence explaining why this music fits today's mood"
}`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { draftId, transcript } = await req.json() as { draftId: string; transcript: string };

  const draft = await prisma.diaryEntry.findFirst({
    where: { id: draftId, userId: session.user.id },
    select: { photoUrl: true },
  });
  if (!draft) return new Response("Not found", { status: 404 });

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "image_url", image_url: { url: draft.photoUrl, detail: "low" } },
    {
      type: "text",
      text: `Here is today's conversation transcript:\n\n${transcript}\n\nPlease write the diary entry and analysis now.`,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    max_tokens: 600,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as {
    diaryText: string;
    valence: number;
    arousal: number;
    musicSearchQuery: string;
    musicReason: string;
  };

  // Map valence/arousal → mood
  const mood = getMood(parsed.valence, parsed.arousal);

  // Persist transcript + draft diary data
  await prisma.diaryEntry.update({
    where: { id: draftId },
    data: {
      transcript,
      diaryText: parsed.diaryText,
      valence: parsed.valence,
      arousal: parsed.arousal,
      moodEmoji: mood.emoji,
      moodColorHex: mood.colorHex,
      emotionLabel: mood.label,
      moodEmojiSource: "AI",
      musicSearchQuery: parsed.musicSearchQuery,
      musicReason: parsed.musicReason,
    },
  });

  // SSE: stream diary text character by character, then send metadata
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      // Stream diary text
      for (const char of parsed.diaryText) {
        send({ type: "text", chunk: char });
        await new Promise((r) => setTimeout(r, 18));
      }

      // Send metadata
      send({
        type: "meta",
        content: {
          diaryText: parsed.diaryText,
          valence: parsed.valence,
          arousal: parsed.arousal,
          musicSearchQuery: parsed.musicSearchQuery,
          musicReason: parsed.musicReason,
        },
      });

      controller.enqueue(encoder.encode(`data: "[DONE]"\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import type OpenAI from "openai";
