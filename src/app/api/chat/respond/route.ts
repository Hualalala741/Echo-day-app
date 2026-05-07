import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatGraph } from "@/lib/agents/chat-graph/graph";
import type { ConversationTurn, EventRecord, SlotProbeCount } from "@/lib/agents/chat-graph/state";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const { userMessage, conversationHistory } = (await req.json()) as {
    userMessage: string;
    conversationHistory: ConversationTurn[];
  };

  // 取今日 ChatSession（没有则创建）
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const chatSession = await prisma.chatSession.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today },
    update: {},
  });

  const events = (chatSession.events as EventRecord[]) ?? [];
  const slotProbeCount: SlotProbeCount = {
    morning: chatSession.morningProbes,
    afternoon: chatSession.afternoonProbes,
    evening: chatSession.eveningProbes,
  };

  const encoder = new TextEncoder();
  let finalState: Awaited<ReturnType<typeof chatGraph.invoke>> | null = null;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // streamEvents 让我们监听 Node 6 的 token chunks
        const eventStream = chatGraph.streamEvents(
          {
            userMessage,
            conversationHistory,
            userId,
            events,
            slotProbeCount,
          },
          { version: "v2" }
        );

        const NODE_LABELS: Record<string, string> = {
          assess_state: "正在判断状态…",
          retrieve_history: "正在检索历史日记…",
          assess_event: "正在评估事件深度…",
          assess_diary: "正在评估日记充实度…",
          generate_response: "正在生成回应…",
        };

        for await (const event of eventStream) {
          // 节点启动时发状态提示
          if (event.event === "on_chain_start" && event.name in NODE_LABELS) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "status", label: NODE_LABELS[event.name] })}\n\n`
              )
            );
          }

          // 只取 generate_response 节点的流式 token
          if (
            event.event === "on_chat_model_stream" &&
            event.metadata?.langgraph_node === "generate_response"
          ) {
            const chunk = event.data?.chunk;
            const text =
              typeof chunk?.content === "string"
                ? chunk.content
                : Array.isArray(chunk?.content)
                ? chunk.content
                    .filter((c: { type: string }) => c.type === "text")
                    .map((c: { type: string; text: string }) => c.text)
                    .join("")
                : "";

            if (text) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", chunk: text })}\n\n`
                )
              );
            }
          }

          // 抓最终 state
          if (event.event === "on_chain_end" && event.name === "LangGraph") {
            finalState = event.data?.output;
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("[chat/respond] stream error", err);
        controller.error(err);
      }
    },
  });

  // 流结束后写回数据库（fire-and-forget，不阻塞响应）
  // 用 waitUntil 替代不行（Edge runtime），改成在流关闭前同步写
  // 实际上 ReadableStream.start 里的 await 已经保证了顺序
  // 但 start() 不 await return，所以用 TransformStream 代理一下

  const { readable: proxyReadable, writable } = new TransformStream();

  (async () => {
    const reader = readable.getReader();
    const writer = writable.getWriter();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
      await writer.close();

      // 流结束后持久化
      if (finalState) {
        const state = finalState as {
          events?: EventRecord[];
          slotProbeCount?: SlotProbeCount;
          aiResponse?: string;
        };

        await prisma.chatSession.update({
          where: { id: chatSession.id },
          data: {
            events: (state.events ?? events) as object[],
            morningProbes: state.slotProbeCount?.morning ?? slotProbeCount.morning,
            afternoonProbes: state.slotProbeCount?.afternoon ?? slotProbeCount.afternoon,
            eveningProbes: state.slotProbeCount?.evening ?? slotProbeCount.evening,
          },
        });

        await prisma.chatMessage.createMany({
          data: [
            { sessionId: chatSession.id, role: "user", content: userMessage },
            {
              sessionId: chatSession.id,
              role: "ai",
              content: state.aiResponse ?? "",
            },
          ],
        });
      }
    } catch (err) {
      console.error("[chat/respond] db write error", err);
      await writer.abort(err);
    }
  })();

  return new Response(proxyReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
