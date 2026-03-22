import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    diaryText?: string;
    moodEmoji?: string;
    emotionLabel?: string;
    moodColorHex?: string;
  };

  const entry = await prisma.diaryEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.diaryEntry.update({
    where: { id },
    data: {
      ...(body.diaryText !== undefined && { diaryText: body.diaryText }),
      ...(body.moodEmoji !== undefined && { moodEmoji: body.moodEmoji }),
      ...(body.emotionLabel !== undefined && { emotionLabel: body.emotionLabel }),
      ...(body.moodColorHex !== undefined && {
        moodColorHex: body.moodColorHex,
        moodEmojiSource: "USER_MODIFIED",
      }),
    },
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.diaryEntry.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if( entry.photoKey){
    const {error: storageError} = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([entry.photoKey]);

    if(storageError) return NextResponse.json(
      { error: `Failed to delete photo: ${storageError.message}` },
      { status: 500 });
  }

  await prisma.diaryEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
