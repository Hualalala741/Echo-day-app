import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/openai";

export async function GET(req: NextRequest) {
  const session = await auth();
  if(!session?.user?.id) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if(!query) return NextResponse.json({entries: []});
  const vector = await getEmbedding(query); // 搜索词的向量
  const vectorLiteral = `'[${vector.join(",")}]'::vector`;

  try { 
    const entries = await prisma.$queryRawUnsafe(`
      SELECT id, date, "diaryText", "photoUrl",
             "moodEmoji", "moodColorHex", "emotionLabel",
             1 - (embedding::vector <=> ${vectorLiteral}) as similarity
      FROM "DiaryEntry"
      WHERE "userId" = $1
        AND status = 'COMPLETE'
        AND embedding IS NOT NULL
        AND 1-(embedding::vector <=> ${vectorLiteral})>= 0.35
      ORDER BY embedding::vector <=> ${vectorLiteral}
      LIMIT 20
    `, session.user.id);
      return NextResponse.json({entries: entries});
  }
  catch (e: unknown) {
    console.error("Search error:", e instanceof Error ? e.message : String(e));
  return NextResponse.json({ error: "Search failed" }, { status: 500 });

  }
}