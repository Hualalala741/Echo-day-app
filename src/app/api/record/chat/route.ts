import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { getConversationConfig } from "@/lib/prompts";
import type OpenAI from "openai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  
  const session = await auth();
  if (!session?.user?.id){
    // 流式响应需要用原生 Response 不能用 NextResponse.json()
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, photoUrl, isFirst, aiLang } = await req.json() as {
    messages: Message[];
    photoUrl: string;
    isFirst: boolean;
    aiLang: 'en' | 'zh';
  };

  // 构建prompt
  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: getConversationConfig(aiLang).system_prompt },
  ];

  // 每个信息都加上图片
  if (photoUrl) {
    apiMessages.push({
      role: "user",
      content: [
        { type: "image_url", image_url: { url: photoUrl, detail: "low" } },
        { type: "text", text: "This is my photo for today. " },
      ],
    });
  }
  for (const m of messages) {
    apiMessages.push({ role: m.role, content: m.content });
  }
  
  // 调用模型
  // 流式：openai 边生成边返回，每生成几个字就发一个 chunk 过来
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: apiMessages,
    max_tokens: 400,
    stream: true,
  });
  // ── 把 OpenAI 的 stream 转成浏览器能读的 ReadableStream ──
  //openai SDK 返回的 stream 是 Node.js 的异步迭代器，格式不同
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller){
      // controller 控制这个流：enqueue 往里面塞数据，close关系流
      // for await... of 逐个读取 chunk
      for await (const chunk of stream){
        // 每个 chunk 的结构：chunk.choices[0].delta.content
        // delta.content 就是这一小段新生成的文字，比如 "你"、"好"、"！"
        const text = chunk.choices[0]?.delta?.content ?? "";
        if(text){
          // 用SSE格式发给浏览器
          // SSE 格式：data: {type: "text", chunk: "..."}\n\n
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({type: "text", chunk: text})}\n\n`));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close(); // 流结束
    }
  })
  // 返回流
  return new Response(readable,{
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache", // 不缓存，每次都要新数据
      Connection: "keep-alive", // 保持连接，不断开
    }
  }
  );
}

