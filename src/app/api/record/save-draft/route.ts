import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest){
  const session = await auth();
  if(!session?.user?.id) return NextResponse.json({error: "Unauthorized"}, {status: 401});

  const body = await req.json();
  const {
    draftId,
    currentStep,
    conversationMessages,
    diaryText,
    valence,
    arousal,
    musicSearchQuery,
    musicReason,
  } = body;
  if (!draftId) return NextResponse.json({ error: "Missing draftId" }, { status: 400 });

  const entry = await prisma.diaryEntry.findFirst({
    where: { id: draftId, userId: session.user.id },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  if (conversationMessages !== undefined) {
    updateData.conversationMessages = conversationMessages; // JSON 字段，存完整对话
  }

  if (currentStep !== undefined) {
    updateData.currentStep = currentStep;
  }

  if (diaryText !== undefined) {
    updateData.diaryText = diaryText;
  }
  if (valence !== undefined) {
    updateData.valence = valence;
  }
  if (arousal !== undefined) {
    updateData.arousal = arousal;
  }
  if (musicSearchQuery !== undefined) {
    updateData.musicSearchQuery = musicSearchQuery;
  }
  if (musicReason !== undefined) {
    updateData.musicReason = musicReason;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ ok: true, id: entry.id });
  }

  const updated = await prisma.diaryEntry.update({
    where: { id: draftId },
    data: updateData,
  });

  return NextResponse.json({ ok: true, id: updated.id });

};