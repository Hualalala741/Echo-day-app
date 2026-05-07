import { z } from "zod";

export const AssessStateSchema = z.object({
  state: z.enum(["opening", "expanding", "wrapping", "ending"]),
  needs_history: z.boolean(),
  reason: z.string(),
});

export const AssessEventSchema = z.object({
  event_summary: z.string(),
  scores: z.object({
    w1_what: z.number().int().min(0).max(2),
    w2_who: z.number().int().min(0).max(2),
    w3_where_when: z.number().int().min(0).max(2),
    w4_how: z.number().int().min(0).max(2),
    w5_why_it_mattered: z.number().int().min(0).max(2),
  }),
  total: z.number().int().min(0).max(10),
  slot: z.enum(["morning", "afternoon", "evening", "unknown"]),
  reason: z.string(),
});

export const AssessDiarySchema = z.object({
  slot_status: z.object({
    morning: z.enum(["fully_covered", "weakly_covered", "not_covered"]),
    afternoon: z.enum(["fully_covered", "weakly_covered", "not_covered"]),
    evening: z.enum(["fully_covered", "weakly_covered", "not_covered"]),
  }),
  diary_sufficient: z.boolean(),
  suggested_slot: z.enum(["morning", "afternoon", "evening"]).nullable(),
  hint: z.string(),
  reason: z.string(),
});

export type AssessStateOutput = z.infer<typeof AssessStateSchema>;
export type AssessEventOutput = z.infer<typeof AssessEventSchema>;
export type AssessDiaryOutput = z.infer<typeof AssessDiarySchema>;
