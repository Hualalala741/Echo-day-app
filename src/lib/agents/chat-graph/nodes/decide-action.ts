import type { ChatGraphState } from "../state";

export function decideAction(state: ChatGraphState) {
  const { userState, currentEvent } = state;

  if (userState === "opening" || userState === "expanding") {
    if (!currentEvent) {
      return { action: "listen" as const };
    }

    const scores = currentEvent.scores;
    const entries = Object.entries(scores) as [string, number][];

    // 找 5W 中分数最低的维度
    const [lowestKey, lowestVal] = entries.reduce(
      (min, cur) => (cur[1] < min[1] ? cur : min),
      entries[0]
    );

    if (lowestVal === 0) {
      return { action: "deepen_current" as const, lowestDimension: lowestKey };
    }

    return { action: "listen" as const };
  }

  // wrapping / ending → 进入 Node 5（返回 undefined，让条件边路由到 assess_diary）
  return {};
}
