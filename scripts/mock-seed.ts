import { PrismaClient } from "../src/generated/prisma";
import OpenAI from "openai";
import "dotenv/config";

const prisma = new PrismaClient();
const openai = new OpenAI(); // reads OPENAI_API_KEY from env

const USER_ID = "cmmx88kdj00009faqwe194zr6";
const TOTAL = 300;

// --- Random helpers ---
function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomIndex(max: number): number {
  return Math.floor(Math.random() * max);
}

// --- Generate real embeddings for templates ---
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(`🔄 Generating embeddings for ${texts.length} templates...`);
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

// --- Mood system (matches app's getMood grid) ---
type MoodInfo = { label: string; icon: string; colorHex: string };
const MOODS_MAP: Record<string, MoodInfo> = {
  angry:     { label: "Angry",      icon: "/moods/angry.svg",      colorHex: "#E46A6A" },
  surprised: { label: "Surprised",  icon: "/moods/surprised.svg",  colorHex: "#E7A15A" },
  excited:   { label: "Excited",    icon: "/moods/excited.svg",    colorHex: "#E5C85E" },
  sad:       { label: "Sad",        icon: "/moods/sad.svg",        colorHex: "#6F86B6" },
  neutral:   { label: "Neutral",    icon: "/moods/neutral.svg",    colorHex: "#B8C2C1" },
  happy:     { label: "Happy",      icon: "/moods/happy.svg",      colorHex: "#58C987" },
  depressed: { label: "Depressed",  icon: "/moods/depressed.svg",  colorHex: "#BCA3C9" },
  tired:     { label: "Tired",      icon: "/moods/tired.svg",      colorHex: "#7E8E9D" },
  calm:      { label: "Calm",       icon: "/moods/calm.svg",       colorHex: "#5DB9AE" },
};

// valence (0-1, neg→pos) × arousal (0-1, calm→excited) → 3×3 grid
const GRID: string[][] = [
  // arousal: high (0.66-1)
  ["angry", "surprised", "excited"],
  // arousal: mid  (0.33-0.66)
  ["sad", "neutral", "happy"],
  // arousal: low  (0-0.33)
  ["depressed", "tired", "calm"],
];

function getMoodFromVA(valence: number, arousal: number) {
  const vIdx = valence < 0.33 ? 0 : valence < 0.66 ? 1 : 2;
  const aIdx = arousal >= 0.66 ? 0 : arousal >= 0.33 ? 1 : 2;
  const key = GRID[aIdx][vIdx];
  return { key, ...MOODS_MAP[key] };
}

const DIARY_TEMPLATES = [
  "今天天气不错，出门走了一圈，心情舒畅。",
  "工作上遇到了一些挑战，但最终还是解决了，有种成就感。",
  "和朋友聊了很久，聊到了以前的事情，感慨万千。",
  "学了一个新的技术，感觉打开了新世界的大门。",
  "今天有点累，早早就休息了。希望明天会更好。",
  "做了一顿好吃的饭，犒劳一下自己。生活需要仪式感。",
  "读了一本很好的书，里面的观点让我思考了很多。",
  "跑步五公里，大汗淋漓，运动完整个人都轻松了。",
  "今天效率很高，把待办事项全部清空了，爽！",
  "有点焦虑，不过深呼吸之后感觉好多了。一步一步来吧。",
  "下雨天窝在家里写代码，听着雨声，意外地很专注。",
  "逛了博物馆，看到了很多有意思的展品，开阔了眼界。",
  "和家人视频通话，虽然离得远但心很近。",
  "调了一整天的 bug，最后发现是个拼写错误，哭笑不得。",
  "尝试了一家新的咖啡店，拿铁很不错，环境也适合工作。",
];

const SPOTIFY_TRACKS = [
  { id: "4cOdK2wGLETKBW3PvgPWqT", name: "Never Gonna Give You Up", artist: "Rick Astley" },
  { id: "7qiZfU4dY1lWllzX7mPBI3", name: "Shape of You", artist: "Ed Sheeran" },
  { id: "0VjIjW4GlUZAMYd2vXMi3b", name: "Blinding Lights", artist: "The Weeknd" },
  { id: "3n3Ppam7vgaVa1iaRUc9Lp", name: "Mr. Brightside", artist: "The Killers" },
  { id: "1BxfuPKGuaTgP7aM0Bbdwr", name: "Cruel Summer", artist: "Taylor Swift" },
];

const PHOTO_SIZES = [
  [800, 600],
  [640, 480],
  [1024, 768],
  [900, 600],
  [750, 500],
  [600, 600],
  [1080, 720],
];

// --- Generate dates: from 2026-02-13 backwards, no earlier than 2024-01-01 ---
function generateDates(count: number): Date[] {
  const dates: Date[] = [];
  const start = new Date("2026-02-13");
  const earliest = new Date("2024-01-01");
  let dayOffset = 0;
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - dayOffset);
    d.setHours(0, 0, 0, 0);
    if (d < earliest) break; // stop if we'd go before 2024
    dates.push(d);
    // Skip 1-3 days randomly
    dayOffset += Math.floor(Math.random() * 3) + 1;
  }
  return dates;
}

async function main() {
  console.log(`🚀 Seeding ${TOTAL} mock diary entries...`);

  // Step 1: Generate real embeddings for all 15 templates (one API call)
  const templateEmbeddings = await getEmbeddings(DIARY_TEMPLATES);
  console.log(`✅ Got ${templateEmbeddings.length} embeddings`);

  const dates = generateDates(TOTAL);

  // Check existing entries to avoid unique constraint violations
  const existing = await prisma.diaryEntry.findMany({
    where: { userId: USER_ID },
    select: { date: true },
  });
  const existingSet = new Set(existing.map((e) => e.date.toISOString().split("T")[0]));

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dateStr = date.toISOString().split("T")[0];

    if (existingSet.has(dateStr)) {
      skipped++;
      continue;
    }

    const valence = randomFloat(0, 1);
    const arousal = randomFloat(0, 1);
    const mood = getMoodFromVA(valence, arousal);
    const track = randomPick(SPOTIFY_TRACKS);
    const templateIdx = randomIndex(DIARY_TEMPLATES.length);
    const diaryText = DIARY_TEMPLATES[templateIdx];
    const embedding = templateEmbeddings[templateIdx];
    const [w, h] = randomPick(PHOTO_SIZES);
    const seed = `mock-${i}-${dateStr}`;
    const photoUrl = `https://picsum.photos/seed/${seed}/${w}/${h}`;
    const photoKey = `mock/${USER_ID}/${dateStr}.jpg`;

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "DiaryEntry" (
        "id", "userId", "date", "status", "currentStep",
        "photoUrl", "photoKey",
        "diaryText", "transcript",
        "valence", "arousal", "moodEmoji", "moodColorHex", "emotionLabel",
        "musicSearchQuery", "musicReason",
        "spotifyTrackId", "spotifyTrackName", "spotifyArtist",
        "embedding",
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, 'COMPLETE', 3,
        $3, $4,
        $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13,
        $14, $15, $16,
        $17::vector,
        NOW(), NOW()
      )
      `,
      USER_ID,
      date,
      photoUrl,
      photoKey,
      diaryText,
      diaryText,
      valence,
      arousal,
      mood.key,        // moodEmoji stores the icon path
      mood.colorHex,
      mood.label.toLowerCase(),
      `${mood.label.toLowerCase()} music`,
      `因为你今天感觉${mood.label}，推荐这首歌`,
      track.id,
      track.name,
      track.artist,
      `[${embedding.join(",")}]`
    );

    inserted++;
    if (inserted % 50 === 0) {
      console.log(`  ✅ Inserted ${inserted}/${TOTAL}...`);
    }
  }

  console.log(`\n🎉 Done! Inserted: ${inserted}, Skipped (duplicate date): ${skipped}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());