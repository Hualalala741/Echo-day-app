"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CalendarView from "@/components/home/CalendarView";
import { useHomeStore } from "@/store/useHomeStore";
import { Spinner } from "@/components/ui/spinner";

// 模块级缓存：进程内只下载/执行一次，组件多次挂载也复用。
// 用一个普通变量保存「已加载完毕的模块」，绕过 React.lazy 的"必须先 throw 一次 promise"限制。
type TimelineViewMod = typeof import("@/components/home/TimelineView");
let timelineModule: TimelineViewMod | null = null;
let timelinePromise: Promise<TimelineViewMod> | null = null;

function preloadTimelineView(): Promise<TimelineViewMod> {
  if (timelineModule) return Promise.resolve(timelineModule);
  if (!timelinePromise) {
    timelinePromise = import("@/components/home/TimelineView").then((mod) => {
      timelineModule = mod;
      return mod;
    });
  }
  return timelinePromise;
}


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

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type View = "calendar" | "timeline";

interface Props {
  entries: EntryPreview[];
  year: number;
  month: number;
  todayEntry: { id: string; status: string } | null;
}

export default function HomeContent({ entries, year, month, todayEntry }: Props) {
  const router = useRouter();
  const { viewMode, setViewMode } = useHomeStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 用模块级缓存初始化：如果已经预加载过（hover/上次访问），首次渲染就同步拿到组件，零闪烁。
  const [TimelineComp, setTimelineComp] = useState<ComponentType | null>(
    () => timelineModule?.default ?? null
  );

  function loadTimelineView() {
    if (TimelineComp) return; // 已经加载过了
    preloadTimelineView().then((mod) => setTimelineComp(() => mod.default));
  }

  function navigateMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    router.push(`/home?month=${newYear}-${String(newMonth).padStart(2, "0")}`);
  }

  function handleNewEntry() {
    if (!todayEntry) {
      router.push("/record");
    } else if (todayEntry.status === "DRAFT") {
      router.push("/record?resume=true");
    } else {
      setShowConfirm(true);
    }
  }

  async function handleReplace() {
    if (deleting) return;
    setDeleting(true);
    if (todayEntry?.id) {
      try {
        const res = await fetch(`/api/diary/${todayEntry.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      } catch (error) {
        console.error(error);
        alert((error as Error).message);
        setDeleting(false);
        return;
      }
    }
    router.push("/record");
  }

  const newEntryLabel = !todayEntry
    ? "New Diary"
    : todayEntry.status === "DRAFT"
    ? "Continue Draft"
    : "Start Over";

  return (
    <>
      {/* 左：New Entry（原统计文案位置，与 Welcome 同列对齐）；右：视图切换 */}
      <div className="px-6 md:px-10 lg:px-20 pt-1 pb-3 mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center bg-card rounded-xl p-1 gap-1 shrink-0">
          {(["calendar", "timeline"] as View[]).map((v) => {
            // 仅 Timeline 需要预热（Calendar 是默认视图，已在主 bundle 里）
            const prefetchHandlers =
              v === "timeline"
                ? {
                    onMouseEnter: loadTimelineView,
                    onFocus: loadTimelineView,
                    onTouchStart: loadTimelineView,
                  }
                : undefined;
            const handleClick = () => {
              if (v === "timeline") loadTimelineView(); // 兜底：键盘党直接 click 也能触发
              setViewMode(v);
            };
            return (
              <button
                key={v}
                type="button"
                onClick={handleClick}
                {...prefetchHandlers}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                  viewMode === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "calendar" ? "Calendar" : "Timeline"}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleNewEntry}
          className="flex items-center bg-brand gap-1.5 h-10 px-4 rounded-lg text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 shrink-0"
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span className="hidden sm:inline">{newEntryLabel}</span>
        </button>
        
      </div>

      {/* Month nav */}
      {viewMode === "calendar" && (
        <div className="px-6 md:px-10 lg:px-20 mb-4 pb-3 flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors text-xl leading-none">‹</button>
          <span className="text-sm font-semibold text-foreground">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={() => navigateMonth(1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors text-xl leading-none">›</button>
        </div>
      )}

      {/* Content */}
      <main className="px-6 z-50 md:px-10 lg:px-20 pb-16">
        {viewMode === "calendar" ? (
          <CalendarView entries={entries} year={year} month={month} />
        ) : (
          <div className="mx-auto w-full max-w-2xl">
            {TimelineComp ? <TimelineComp /> : null}
          </div>
        )}
      </main>

      <AlertDialog open={showConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notice</AlertDialogTitle>
            <AlertDialogDescription>Starting over will delete today&apos;s existing diary. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)} disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplace} disabled={deleting} className="bg-red-500 hover:bg-red-600 disabled:opacity-50">
              {deleting ? <><Spinner className="w-4 h-4 mr-2" />Deleting...</> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}