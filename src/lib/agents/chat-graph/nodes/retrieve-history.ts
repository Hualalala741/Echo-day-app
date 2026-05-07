import { supabase } from "@/lib/supabase";
import { getEmbedding } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import type { ChatGraphState } from "../state";

export async function retrieveHistory(state: ChatGraphState) {
  const embedding = await getEmbedding(state.userMessage);

  // pgvector 语义检索
  const { data: relevant } = await supabase.rpc("match_diary_entries", {
    query_embedding: embedding,
    match_threshold: 0.75,
    match_count: 3,
    user_id: state.userId,
  });

  // 最近 3 天日记
  const recent = await prisma.diaryEntry.findMany({
    where: { userId: state.userId },
    orderBy: { date: "desc" },
    take: 3,
    select: { date: true, diaryText: true },
  });

  return {
    historicalContext: {
      relevantDiaries: relevant ?? [],
      recentDiaries: recent,
    },
  };
}
