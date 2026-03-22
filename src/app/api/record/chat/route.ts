import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";

const SYSTEM_PROMPT = `You are Echo, a warm and curious AI journaling companion.
Your role is to gently guide the user to reflect on their day through natural conversation.
- Ask about what happened and how they felt
- Be empathetic, non-judgmental, and never give advice
- Ask one follow-up question at a time
- Keep responses concise (2-3 sentences max)
- If this is the first message, greet them warmly and ask about their photo/day`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, photoUrl, isFirst } = await req.json() as {
    messages: Message[];
    photoUrl: string;
    isFirst: boolean;
  };

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // On first message, include the photo for vision
  if (isFirst && photoUrl) {
    apiMessages.push({
      role: "user",
      content: [
        { type: "image_url", image_url: { url: photoUrl, detail: "low" } },
        { type: "text", text: "This is my photo for today. Please start our conversation." },
      ],
    });
  } else {
    for (const m of messages) {
      apiMessages.push({ role: m.role, content: m.content });
    }
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: apiMessages,
    max_tokens: 150,
  });

  const reply = completion.choices[0].message.content ?? "";
  return NextResponse.json({ reply });
}

// fix import type
import type OpenAI from "openai";
