import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DiaryClient from "./DiaryClient";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}

export default async function DiaryPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { new: isNew } = await searchParams;

  const entry = await prisma.diaryEntry.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!entry || entry.status !== "COMPLETE") notFound();

  return (
    <DiaryClient
      entry={{
        id: entry.id,
        date: entry.date.toISOString(),
        photoUrl: entry.photoUrl,
        diaryText: entry.diaryText ?? "",
        moodEmoji: entry.moodEmoji ?? "",
        moodColorHex: entry.moodColorHex ?? "#6366f1",
        emotionLabel: entry.emotionLabel ?? "",
        spotifyTrackId: entry.spotifyTrackId,
        spotifyTrackName: entry.spotifyTrackName,
        spotifyArtist: entry.spotifyArtist,
        spotifyAlbumArt: entry.spotifyAlbumArt,
        spotifyPreviewUrl: entry.spotifyPreviewUrl,
      }}
      isNew={isNew === "true"}
    />
  );
}
