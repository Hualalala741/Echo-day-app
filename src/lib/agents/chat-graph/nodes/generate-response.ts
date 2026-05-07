import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm";
import { PROMPT_D_SYSTEM } from "../prompts";
import type { ChatGraphState } from "../state";

export async function generateResponse(state: ChatGraphState) {
  const { action, lowestDimension, targetSlot, historicalContext } = state;

  const historyText =
    state.conversationHistory.length > 0
      ? state.conversationHistory
          .map((t) => `${t.role === "user" ? "用户" : "AI"}：${t.content}`)
          .join("\n")
      : "（空）";

  const histContextText =
    historicalContext &&
    (historicalContext.relevantDiaries.length > 0 ||
      historicalContext.recentDiaries.length > 0)
      ? JSON.stringify(historicalContext)
      : "（无）";

  const userContent = `## 对话历史
${historyText}

## 用户最新消息
${state.userMessage}

## 决策信息
- action: ${action}
- lowest_dimension: ${lowestDimension ?? "无"}
- target_slot: ${targetSlot ?? "无"}

## 历史日记（如有）
${histContextText}

请生成 AI 回应。`;

  const result = await llm.invoke([
    new SystemMessage(PROMPT_D_SYSTEM),
    new HumanMessage(userContent),
  ]);

  const aiResponse =
    typeof result.content === "string"
      ? result.content
      : result.content
          .filter((c) => c.type === "text")
          .map((c) => (c as { type: "text"; text: string }).text)
          .join("");

  return { aiResponse };
}
