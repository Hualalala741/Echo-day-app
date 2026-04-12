import type OpenAI from "openai";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { getMood } from "@/lib/mood-map";
import { getDiaryConfig } from "@/lib/prompts";
import { resolveTranscriptFromBody } from "@/lib/conversation-transcript";
import { estimateDiaryLength } from "@/lib/diary-length";


export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as {
    draftId: string;
    transcript?: string;
    conversationMessages?: unknown;
    aiLang: 'en' | 'zh';
  };
  const { draftId, aiLang } = body;
  const transcript = resolveTranscriptFromBody(body);

  if (!draftId) return new Response("Missing draftId", { status: 400 });
  if (!transcript.trim()) return new Response("Missing conversation", { status: 400 });

  const draft = await prisma.diaryEntry.findFirst({
    where: { id: draftId, userId: session.user.id },
    select: { photoUrl: true },
  });
  if (!draft) return new Response("Not found", { status: 404 });

  const convMessages = Array.isArray(body.conversationMessages)
    ? (body.conversationMessages as { role: string; content: string }[])
    : [];
  const lengthRange = estimateDiaryLength(convMessages, aiLang);
  const targetLength = `${lengthRange.min}–${lengthRange.max}`;

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "image_url", image_url: { url: draft.photoUrl, detail: "low" } },
    {
      type: "text",
      text: `Here is today's conversation transcript:\n\n${transcript}\n\nPlease write the diary entry and analysis now.`,
    },
  ];

  const diaryConfig = getDiaryConfig(aiLang, { target_length: targetLength });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: diaryConfig.system_prompt },
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

  const mood = getMood(parsed.valence, parsed.arousal);

  await prisma.diaryEntry.update({
    where: { id: draftId },
    data: {
      transcript,
      diaryText: parsed.diaryText,
      valence: parsed.valence,
      arousal: parsed.arousal,
      moodEmoji: mood.key,
      moodColorHex: mood.colorHex,
      emotionLabel: mood.label,
      moodEmojiSource: "AI",
      musicSearchQuery: parsed.musicSearchQuery,
      musicReason: parsed.musicReason,
    },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      for (const char of parsed.diaryText) {
        send({ type: "text", chunk: char });
        await new Promise((r) => setTimeout(r, 18));
      }

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
