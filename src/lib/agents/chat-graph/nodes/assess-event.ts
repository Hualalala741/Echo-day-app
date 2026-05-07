import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm";
import { PROMPT_B_SYSTEM } from "../prompts";
import { AssessEventSchema } from "../schemas";
import { mergeEvents } from "../utils/merge-events";
import type { ChatGraphState, EventRecord } from "../state";

export async function assessEvent(state: ChatGraphState) {
  const structured = llm.withStructuredOutput(AssessEventSchema);

  const historyText =
    state.conversationHistory.length > 0
      ? state.conversationHistory
          .map((t) => `${t.role === "user" ? "用户" : "AI"}：${t.content}`)
          .join("\n")
      : "（空）";

  const userContent = `## 对话历史\n${historyText}\n\n## 用户最新消息\n${state.userMessage}\n\n请评估事件深度。`;

  const result = await structured.invoke([
    new SystemMessage(PROMPT_B_SYSTEM),
    new HumanMessage(userContent),
  ]);

  const newEvent: EventRecord = {
    summary: result.event_summary,
    scores: result.scores,
    total: result.total,
    slot: result.slot,
  };

  const updatedEvents = mergeEvents(state.events, newEvent);

  return {
    currentEvent: newEvent,
    events: updatedEvents,
  };
}
