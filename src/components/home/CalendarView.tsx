"use client";

import { useRouter } from "next/navigation";
import type { EntryPreview } from "@/app/home/HomeClient";
import { MOODS, type MoodKey } from "@/lib/mood-map";

interface Props {
  entries: EntryPreview[];
  year: number;
  month: number; // 1-indexed
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView({ entries, year, month }: Props) {
  const router = useRouter();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDate = today.getDate();

  // Build a map: day-of-month → entry
  const entryByDay = new Map<number, EntryPreview>();
  for (const e of entries) {
    const d = new Date(e.date);
    entryByDay.set(d.getUTCDate(), e);
  }

  // First day of month (0=Sun...6=Sat), convert to Mon-based (0=Mon...6=Sun)
  const firstDow = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDow + 6) % 7; // Mon-based offset
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-card rounded-2xl border border-border  shadow-sm">
      {/* Day header */}
      <div className="grid grid-cols-7 border-b border-border bg-brand/30 rounded-t-2xl">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const entry = day ? entryByDay.get(day) : undefined;
          const isToday = isCurrentMonth && day === todayDate;

          return (
            <div
              key={idx}
              onClick={() => entry && router.push(`/diary/${entry.id}`)}
              className={`
                relative min-h-[90px] max-h-[120px] p-2 border-b border-r border-border
                flex flex-col items-center
                ${entry ? "cursor-pointer group" : ""}
              `}
              style={{ backgroundColor: entry?.moodColorHex ? `${entry.moodColorHex}33` : undefined }}
            >
              {day && (
                <>
                  {/* Date number */}
                  <span
                    className={`
                      w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium
                      ${isToday
                        ? "bg-brand text-brand-foreground"
                        : "text-muted-foreground"
                      }
                    `}
                  >
                    {day}
                  </span>

                  {/* Mood emoji */}
                  {entry?.moodEmoji && (
                    <img
                      src={MOODS[entry.moodEmoji as MoodKey].icon}
                      alt={entry.moodEmoji}
                      className="flex-1 max-h-[70%] min-h-0 w-auto object-contain"
                    />
                  )}

                  {/* Hover preview card */}
                  {entry && (
                    <div className="
                      absolute bottom-full left-1/2 -translate-x-1/2 z-[102] w-52
                      bg-card rounded-xl shadow-xl border border-border
                      opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100
                      transition-all duration-150 pointer-events-none overflow-hidden
                    ">
                      {/* Photo */}
                      <div className="h-25 bg-muted overflow-hidden">
                        <img
                          src={entry.photoUrl}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Text */}
                      <div className="p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          {entry.moodEmoji && (
                            <img
                            src={MOODS[entry.moodEmoji as MoodKey].icon}
                            alt={entry.moodEmoji}
                            className="w-10 h-10"
                          />
                          )}
                          {entry.emotionLabel && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {entry.emotionLabel}
                            </span>
                          )}
                        </div>
                        {entry.diaryText && (
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {entry.diaryText}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No entries this month yet.
        </div>
      )}
    </div>
  );
}
