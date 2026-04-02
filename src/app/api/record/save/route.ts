import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMood } from "@/lib/mood-map";
import { getEmbedding } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    draftId: string;
    diaryText: string;
    valence: number;
    arousal: number;
    musicSearchQuery: string;
    musicReason: string;
    spotifyTrackId: string;
    spotifyTrackName: string;
    spotifyArtist: string;
    spotifyAlbumArt: string;
    spotifyPreviewUrl: string | null;
  };

  // Verify ownership
  const existing = await prisma.diaryEntry.findFirst({
    where: { id: body.draftId, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mood = getMood(body.valence, body.arousal);

  const entry = await prisma.diaryEntry.update({
    where: { id: body.draftId },
    data: {
      status: "COMPLETE",
      diaryText: body.diaryText,
      valence: body.valence,
      arousal: body.arousal,
      moodEmoji: existing.moodEmoji ?? mood.emoji,
      moodColorHex: existing.moodColorHex ?? mood.colorHex,
      emotionLabel: existing.emotionLabel ?? mood.label,
      moodEmojiSource: existing.moodEmojiSource ?? "AI",
      musicSearchQuery: body.musicSearchQuery,
      musicReason: body.musicReason,
      spotifyTrackId: body.spotifyTrackId,
      spotifyTrackName: body.spotifyTrackName,
      spotifyArtist: body.spotifyArtist,
      spotifyAlbumArt: body.spotifyAlbumArt,
      spotifyPreviewUrl: body.spotifyPreviewUrl,
    },
  });
  // 计算embedding
  try {
    const vector = await getEmbedding(body.diaryText);
    await prisma.$queryRaw`
      UPDATE "DiaryEntry"
      SET "embedding" = ${JSON.stringify(vector)}::vector
      WHERE "id" = ${body.draftId}
      `;
  } catch (error) {
    console.error("Error calculating embedding:", error);
  }

  return NextResponse.json({ entryId: entry.id });
}
