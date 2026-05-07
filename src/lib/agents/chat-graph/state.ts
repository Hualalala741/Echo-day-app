import { Annotation } from "@langchain/langgraph";

export type ConversationTurn = {
  role: "user" | "ai";
  content: string;
};

export type EventRecord = {
  summary: string;
  scores: {
    w1_what: number;
    w2_who: number;
    w3_where_when: number;
    w4_how: number;
    w5_why_it_mattered: number;
  };
  total: number;
  slot: "morning" | "afternoon" | "evening" | "unknown";
};

export type SlotProbeCount = {
  morning: number;
  afternoon: number;
  evening: number;
};

export type UserState = "opening" | "expanding" | "wrapping" | "ending";

export type ActionType =
  | "deepen_current"
  | "listen"
  | "probe_slot"
  | "let_user_lead"
  | "ready_to_finalize";

export type Slot = "morning" | "afternoon" | "evening";

export const ChatGraphAnnotation = Annotation.Root({
  // ===== 输入 =====
  userMessage: Annotation<string>(),
  conversationHistory: Annotation<ConversationTurn[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  userId: Annotation<string>(),

  // ===== 跨调用累积 =====
  events: Annotation<EventRecord[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  slotProbeCount: Annotation<SlotProbeCount>({
    reducer: (_prev, next) => next,
    default: () => ({ morning: 0, afternoon: 0, evening: 0 }),
  }),

  // ===== Node 1 写入 =====
  userState: Annotation<UserState | undefined>(),
  needsHistory: Annotation<boolean | undefined>(),

  // ===== Node 2 写入 =====
  historicalContext: Annotation<
    | {
        relevantDiaries: unknown[];
        recentDiaries: unknown[];
      }
    | undefined
  >(),

  // ===== Node 3 写入 =====
  currentEvent: Annotation<EventRecord | undefined>(),

  // ===== Node 4 / 5 写入 =====
  action: Annotation<ActionType | undefined>(),
  lowestDimension: Annotation<string | undefined>(),
  targetSlot: Annotation<Slot | undefined>(),
  diarySufficient: Annotation<boolean | undefined>(),
  suggestedSlot: Annotation<Slot | undefined>(),

  // ===== Node 6 写入 =====
  aiResponse: Annotation<string | undefined>(),
});

export type ChatGraphState = typeof ChatGraphAnnotation.State;
