"use client";

import { useRouter } from "next/navigation";
import type { EntryPreview } from "@/app/home/HomeClient";

interface Props {
  entries: EntryPreview[];
}

function formatCardDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  }).toUpperCase();
}

function cardTitle(entry: EntryPreview) {
  const d = new Date(entry.date);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return entry.emotionLabel ? `${entry.emotionLabel} ${weekday}` : weekday;
}

export default function TimelineView({ entries }: Props) {
  const router = useRouter();

  if (entries.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        No entries this month yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4.75 top-6 bottom-6 w-px bg-slate-200" />

      <div className="space-y-5">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="flex gap-4 items-start">
            {/* Emoji circle */}
            <div
              className="relative z-10 w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 text-xl border-2 shadow-sm"
              style={{ borderColor: idx === 0 ? (entry.moodColorHex ?? "#0f58bd") : "#e2e8f0" }}
            >
              {entry.moodEmoji ?? "📓"}
            </div>

            {/* Card */}
            <div
              onClick={() => router.push(`/diary/${entry.id}`)}
              className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md transition-shadow duration-150 min-w-0"
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
          </div>
        ))}
      </div>
    </div>
  );
}
