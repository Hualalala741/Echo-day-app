import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RecordWizard from "./RecordWizard";

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string, replace?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { resume, replace } = await searchParams;
  const replacingComplete =  replace === "true";

  // Check for existing draft today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const draft = await prisma.diaryEntry.findFirst({
    where: {
      userId: session.user.id,
      date: { gte: today, lt: tomorrow },
    },
    select: {
      id: true,
      status: true,
      photoUrl: true,
      currentStep: true,
      conversationMessages: true,
      diaryText: true,
      valence: true,
      arousal: true,
      musicSearchQuery: true,
      musicReason: true,
    },
  });

  // If resuming a complete entry, redirect to diary
    if (draft?.status === "COMPLETE" && !resume&& !replacingComplete) {
      redirect(`/diary/${draft.id}`);
    } 

  return (
    <RecordWizard
      userId={session.user.id}
      existingDraft={
        draft
          ? {
              id: draft.id,
              status: draft.status,
              photoUrl: draft.photoUrl,
              currentStep: draft.currentStep,
              conversationMessages: draft.conversationMessages,
              diaryText: draft.diaryText,
              valence: draft.valence,
              arousal: draft.arousal,
              musicSearchQuery: draft.musicSearchQuery,
              musicReason: draft.musicReason,
            }
          : null
      }
    />
  );
}
