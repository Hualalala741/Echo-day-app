import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase, PHOTO_BUCKET } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `${session.user.id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(key, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(key);

  // Today at midnight (UTC date)
  const today = new Date();
  const dateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  // Upsert draft — one entry per user per day
  const entry = await prisma.diaryEntry.upsert({
    where: { userId_date: { userId: session.user.id, date: dateOnly } },
    create: {
      userId: session.user.id,
      date: dateOnly,
      status: "DRAFT",
      photoUrl: publicUrl,
      photoKey: key,
    },
    update: {
      photoUrl: publicUrl,
      photoKey: key,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ id: entry.id, photoUrl: publicUrl, transcript: null });
}
