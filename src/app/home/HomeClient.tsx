"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CalendarView from "@/components/home/CalendarView";
import TimelineView from "@/components/home/TimelineView";

export type EntryPreview = {
  id: string;
  date: string;
  moodEmoji: string | null;
  moodColorHex: string | null;
  emotionLabel: string | null;
  photoUrl: string;
  diaryText: string | null;
  spotifyTrackName: string | null;
  spotifyArtist: string | null;
};

interface Props {
  entries: EntryPreview[];
  year: number;
  month: number;
  user: { name: string | null; image: string | null };
  todayEntry: { id: string; status: string } | null;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type View = "calendar" | "timeline";

// Design token: #0f58bd
const PRIMARY = "#0f58bd";

export default function HomeClient({ entries, year, month, user, todayEntry }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>("calendar");

  function navigateMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1)  { newMonth = 12; newYear--; }
    router.push(`/home?month=${newYear}-${String(newMonth).padStart(2, "0")}`);
  }

  function handleNewEntry() {
    if (!todayEntry) {
      router.push("/record");
    } else if (todayEntry.status === "DRAFT") {
      router.push("/record?resume=true");
    } else {
      router.push(`/diary/${todayEntry.id}`);
    }
  }

  const newEntryLabel = !todayEntry
    ? "New Entry"
    : todayEntry.status === "DRAFT"
    ? "Resume Draft"
    : "View Today";

  const firstName = user.name?.split(" ")[0] ?? "there";
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f6f7f8" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 md:px-10 lg:px-20">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: PRIMARY }}
            >
              <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Echo Day</span>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* New Entry */}
            <button
              onClick={handleNewEntry}
              className="flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: PRIMARY }}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{newEntryLabel}</span>
            </button>

            {/* Divider + avatar area */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              {/* Avatar */}
              <div className="relative cursor-pointer">
                <Avatar className="w-10 h-10 border-2" style={{ borderColor: PRIMARY }}>
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback
                    className="text-sm font-semibold"
                    style={{ backgroundColor: "#dbeafe", color: PRIMARY }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome + Toggle */}
      <div className="px-6 md:px-10 lg:px-20 pt-8 pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {entries.length > 0
              ? `You have ${entries.length} entr${entries.length === 1 ? "y" : "ies"} this month.`
              : "Start recording your day!"}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-slate-200 rounded-xl p-1 gap-1">
          {(["calendar", "timeline"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                view === v
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v === "calendar" ? "Calendar" : "Timeline"}
            </button>
          ))}
        </div>
      </div>

      {/* Month nav */}
      {view === "calendar" && (
        <div className="px-6 md:px-10 lg:px-20 pb-3 flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-colors text-xl leading-none"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-slate-600">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-colors text-xl leading-none"
          >
            ›
          </button>
        </div>
      )}

      {/* Content */}
      <main className="px-6 md:px-10 lg:px-20 pb-16">
        {view === "calendar" ? (
          <CalendarView entries={entries} year={year} month={month} />
        ) : (
          <TimelineView entries={entries} />
        )}
      </main>
    </div>
  );
}
