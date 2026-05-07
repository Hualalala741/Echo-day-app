import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm";
import { PROMPT_C_SYSTEM } from "../prompts";
import { AssessDiarySchema } from "../schemas";
import type { ChatGraphState, Slot } from "../state";

export async function assessDiary(state: ChatGraphState) {
  const structured = llm.withStructuredOutput(AssessDiarySchema);

  const userContent = `## 已记录的事件列表\n${JSON.stringify(state.events, null, 2)}\n\n## 各时段已被主动引导的次数\n${JSON.stringify(state.slotProbeCount, null, 2)}\n\n请评估整体充实度并给出引导建议。`;

  const result = await structured.invoke([
    new SystemMessage(PROMPT_C_SYSTEM),
    new HumanMessage(userContent),
  ]);

  if (result.diary_sufficient) {
    return { action: "ready_to_finalize" as const, diarySufficient: true };
  }

  if (result.suggested_slot) {
    const slot = result.suggested_slot as Slot;
    const updatedProbeCount = {
      ...state.slotProbeCount,
      [slot]: state.slotProbeCount[slot] + 1,
    };
    return {
      action: "probe_slot" as const,
      targetSlot: slot,
      diarySufficient: false,
      slotProbeCount: updatedProbeCount,
    };
  }

  return { action: "let_user_lead" as const, diarySufficient: false };
}
