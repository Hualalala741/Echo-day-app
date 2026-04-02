import {prisma} from "@/lib/prisma";
import { getEmbedding } from "@/lib/openai";

async function main() {
  const entries = await prisma.diaryEntry.findMany({
    where: {
      status:"COMPLETE",
      diaryText: {
        not: null,
      },
      embedding: null,
    },
    select:{id:true, diaryText:true},
  });
  console.log(`Found ${entries.length} entries to backfill`);

  for(const entry of entries) {
    try {
      const vector = await getEmbedding(entry.diaryText!);
      await prisma.$queryRaw`
      UPDATE "DiaryEntry"
      SET "embedding" = ${JSON.stringify(vector)}::vector
      WHERE "id" = ${entry.id}
      `;
      console.log(`✓ ${entry.id}`);
    } catch (error) {
      console.error(`✗ ${entry.id}: ${error}`);
    }
  }
  console.log("Done");
  await prisma.$disconnect();
}

main()