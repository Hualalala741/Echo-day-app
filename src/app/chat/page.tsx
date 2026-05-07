"use client";

import { useMemo, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

type ConversationTurn = { role: "user" | "ai"; content: string };

function extractText(
  content: { type: string; text?: string }[]
): string {
  return content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("");
}

function ChatPage() {
  const [thinkingLabel, setThinkingLabel] = useState<string | null>(null);
  // ref 让 adapter 闭包里能拿到最新的 setter
  const setThinkingRef = useRef(setThinkingLabel);
  setThinkingRef.current = setThinkingLabel;

  const adapter: ChatModelAdapter = useMemo(
    () => ({
      async *run({ messages, abortSignal }) {
        // 把 assistant-ui 的 messages 转成我们的 ConversationTurn[]
        const history: ConversationTurn[] = messages.slice(0, -1).map((m) => ({
          role: m.role === "user" ? "user" : "ai",
          content: extractText(
            m.content as { type: string; text?: string }[]
          ),
        }));

        const lastMsg = messages[messages.length - 1];
        const userMessage = extractText(
          lastMsg.content as { type: string; text?: string }[]
        );

        const res = await fetch("/api/chat/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage,
            conversationHistory: history,
          }),
          signal: abortSignal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") break;
              try {
                const event = JSON.parse(raw) as {
                  type: string;
                  label?: string;
                  chunk?: string;
                };
                if (event.type === "status") {
                  setThinkingRef.current(event.label ?? null);
                } else if (event.type === "text" && event.chunk) {
                  setThinkingRef.current(null);
                  fullText += event.chunk;
                  yield { content: [{ type: "text", text: fullText }] };
                }
              } catch {
                // ignore malformed SSE lines
              }
            }
          }
        } finally {
          setThinkingRef.current(null);
        }

        yield { content: [{ type: "text", text: fullText }] };
      },
    }),
    []
  );

  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="relative flex h-screen flex-col">
        <Thread />

        {/* 思考过程提示：节点处理期间显示在输入框上方 */}
        {thinkingLabel && (
          <div className="pointer-events-none absolute bottom-20 left-4 flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            {thinkingLabel}
          </div>
        )}
      </div>
    </AssistantRuntimeProvider>
  );
}

export default ChatPage;
