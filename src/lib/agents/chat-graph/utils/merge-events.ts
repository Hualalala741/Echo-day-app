import type { EventRecord } from "../state";

// 将新事件合并进已有事件列表：同 slot 取 total 最高的那条，否则 append
export function mergeEvents(
  existing: EventRecord[],
  newEvent: EventRecord
): EventRecord[] {
  if (newEvent.slot === "unknown") {
    return [...existing, newEvent];
  }

  const sameSlotIdx = existing.findIndex((e) => e.slot === newEvent.slot);
  if (sameSlotIdx === -1) {
    return [...existing, newEvent];
  }

  if (newEvent.total > existing[sameSlotIdx].total) {
    const updated = [...existing];
    updated[sameSlotIdx] = newEvent;
    return updated;
  }

  return existing;
}
