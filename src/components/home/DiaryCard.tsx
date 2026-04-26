"use client";

import {useRouter} from "next/navigation";
import type {EntryPreview} from "@/app/home/HomeClient";

function formatCardDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US",{
    month: "short", day: "numeric", timeZone: "UTC",
  }).toUpperCase();
}

function cardTitle(entry: EntryPreview) {
  const d = new Date(entry.date);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return entry.emotionLabel ? `${entry.emotionLabel} ${weekday}` : weekday;
}

interface Props {
  entry: EntryPreview;
}

export default function DiaryCard({entry}: Props) {
  const router = useRouter();
  return (
    <div
    onClick={() => router.push(`/diary/${entry.id}`)}
    className="relative rounded-2xl border border-border/50 p-4 cursor-pointer min-w-0 before:content-[''] before:absolute before:-inset-px before:rounded-[inherit] before:pointer-events-none before:border before:border-foreground/20 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
    style={{ backgroundColor:(entry.moodColorHex ?? "#ffffff")+"33", }}
  >
    {/* Title row */}
    <div className="flex items-baseline justify-between gap-2 mb-2">
      <h3 className="font-bold text-foreground text-base leading-tight truncate">
        {cardTitle(entry)}
      </h3>
      <span className="text-xs text-muted-foreground font-medium shrink-0">
        {formatCardDate(entry.date)}
      </span>
    </div>

    {/* Excerpt */}
    {entry.diaryText && (
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
        {entry.diaryText}
      </p>
    )}

    {/* Photo */}
    {entry.photoUrl && (
      <div className="rounded-xl overflow-hidden bg-muted aspect-[16/9]">
        <img
          src={entry.photoUrl}
          alt={`${entry.date} Diary photo`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    )}

  </div>
  )
}