import {prisma} from "@/lib/prisma";
import { getEmbedding } from "@/lib/openai";

async function main() {
  const entries = await prisma.$queryRaw<{id: string; diaryText: string}[]>`
    SELECT "id", "diaryText" FROM "DiaryEntry"
    WHERE "status" = 'COMPLETE' AND "diaryText" IS NOT NULL AND "embedding" IS NULL
  `;

  for(const entry of entries) {
    try {
      const vector = await getEmbedding(entry.diaryText!);
      await prisma.$queryRaw`
      UPDATE "DiaryEntry"
      SET "embedding" = ${JSON.stringify(vector)}::vector
      WHERE "id" = ${entry.id}
      `;
    } catch (error) {
      console.error(`✗ ${entry.id}: ${error}`);
    }
  }
  await prisma.$disconnect();
}

main()