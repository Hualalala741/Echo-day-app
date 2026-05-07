import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm";
import { PROMPT_A_SYSTEM } from "../prompts";
import { AssessStateSchema } from "../schemas";
import type { ChatGraphState } from "../state";

export async function assessState(state: ChatGraphState) {
  const structured = llm.withStructuredOutput(AssessStateSchema);

  const historyText =
    state.conversationHistory.length > 0
      ? state.conversationHistory
          .map((t) => `${t.role === "user" ? "用户" : "AI"}：${t.content}`)
          .join("\n")
      : "（空）";

  const userContent = `## 对话历史\n${historyText}\n\n## 用户最新消息\n${state.userMessage}\n\n请判断状态。`;

  const result = await structured.invoke([
    new SystemMessage(PROMPT_A_SYSTEM),
    new HumanMessage(userContent),
  ]);

  return {
    userState: result.state,
    needsHistory: result.needs_history,
  };
}
