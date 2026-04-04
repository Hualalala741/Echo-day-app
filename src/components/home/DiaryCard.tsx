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
    className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md transition-shadow duration-150 min-w-0"
  >
    {/* Title row */}
    <div className="flex items-baseline justify-between gap-2 mb-2">
      <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
        {cardTitle(entry)}
      </h3>
      <span className="text-xs text-slate-400 font-medium shrink-0">
        {formatCardDate(entry.date)}
      </span>
    </div>

    {/* Excerpt */}
    {entry.diaryText && (
      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">
        {entry.diaryText}
      </p>
    )}

    {/* Photo */}
    {entry.photoUrl && (
      <div className="rounded-xl overflow-hidden bg-slate-100">
        <img
          src={entry.photoUrl}
          alt=""
          className="w-full object-cover max-h-52"
        />
      </div>
    )}

  </div>
  )
}