import { prisma } from "@/lib/prisma";
import HomeContent from "./HomeContent";

interface Props {
  userId: string;
  month?: string;
}

export async function HomeData({ userId, month }: Props) {
  let year: number, monthIdx: number;
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    [year, monthIdx] = month.split("-").map(Number);
    monthIdx -= 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  const startOfMonth = new Date(year, monthIdx, 1);
  const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59);

  const [entries, todayEntry] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth }, status: "COMPLETE" },
      select: {
        id: true, date: true, moodEmoji: true, moodColorHex: true,
        emotionLabel: true, photoUrl: true, diaryText: true,
        spotifyTrackName: true, spotifyArtist: true,
      },
      orderBy: { date: "desc" },
    }),
    prisma.diaryEntry.findFirst({
      where: {
        userId,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      select: { id: true, status: true },
    }),
  ]);

  return (
    <HomeContent
      entries={entries.map((e) => ({ ...e, date: e.date.toISOString() }))}
      year={year}
      month={monthIdx + 1}
      todayEntry={todayEntry ? { id: todayEntry.id, status: todayEntry.status } : null}
    />
  );
}