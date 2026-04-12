import { prisma } from "@/lib/prisma";

const emojiToKey: Record<string, string> = {
  "😠": "angry",
  "😲": "surprised",
  "🤩": "excited",
  "😢": "sad",
  "😐": "neutral",
  "😊": "happy",
  "😔": "depressed",
  "😴": "tired",
  "😌": "calm",
};

async function main() {
  for (const [emoji, key] of Object.entries(emojiToKey)) {
    const result = await prisma.diaryEntry.updateMany({
      where: { moodEmoji: emoji },
      data: { moodEmoji: key },
    });
    console.log(`${emoji} -> ${key}: ${result.count} rows updated`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());