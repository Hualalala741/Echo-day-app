import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { month } = await searchParams;

  // Parse month from query param (YYYY-MM) or default to current month
  let year: number, monthIdx: number;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    [year, monthIdx] = month.split("-").map(Number);
    monthIdx -= 1; // 0-indexed
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  const startOfMonth = new Date(year, monthIdx, 1);
  const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59);

  const entries = await prisma.diaryEntry.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startOfMonth, lte: endOfMonth },
      status: "COMPLETE",
    },
    select: {
      id: true,
      date: true,
      moodEmoji: true,
      moodColorHex: true,
      emotionLabel: true,
      photoUrl: true,
      diaryText: true,
      spotifyTrackName: true,
      spotifyArtist: true,
    },
    orderBy: { date: "desc" },
  });

  // Check today's entry status
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayEntry = await prisma.diaryEntry.findFirst({
    where: {
      userId: session.user.id,
      date: { gte: todayStart, lte: todayEnd },
    },
    select: { id: true, status: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredLang: true, image: true, name: true },
  });

  const serialized = entries.map((e) => ({
    ...e,
    date: e.date.toISOString(),
  }));

  return (
    <HomeClient
      entries={serialized}
      year={year}
      month={monthIdx + 1}
      user={{
        name: session.user.name ?? null,
        image: user?.image ?? null,
        email: session.user.email ?? null,
        preferredLang: user?.preferredLang as 'en' | 'zh' | null ?? "en",
      }}
      todayEntry={todayEntry ? { id: todayEntry.id, status: todayEntry.status } : null}
    />
  );
}
