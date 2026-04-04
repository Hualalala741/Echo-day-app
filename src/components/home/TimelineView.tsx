"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { EntryPreview } from "@/app/home/HomeClient";
import DiaryCard from "./DiaryCard";

// 格式化日期
function formatCardDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  }).toUpperCase();
}

// 卡片标题
function cardTitle(entry: EntryPreview) {
  const d = new Date(entry.date);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return entry.emotionLabel ? `${entry.emotionLabel} ${weekday}` : weekday;
}

export default function TimelineView() {
  const router = useRouter();

  // state
  const [entries, setEntries] = useState<EntryPreview[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null); // 下一页的 cursor
  const [isLoading, setIsLoading] = useState(false); // 底部spinner
  const [initialLoading, setInitialLoading] = useState(true); // 骨架屏
  const [hasMore, setHasMore] = useState(true); // 是否还有更多数据
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);// 开始日期

  // refs
  const sentinelRef = useRef<HTMLDivElement>(null);// 放在列表底部的"哨兵"元素，被观察到时触发加载

  const fetchingRef = useRef(false); // 防止重复请求

  // 请求数据
  const fetchPage = useCallback(
    async (cursor: string | null, replace: boolean) =>{
      // 用ref做锁， 比state更合适
      // setState 是异步的，两次快速调用之间state可能还没更新
      if(fetchingRef.current) return;
      fetchingRef.current = true;
      setIsLoading(true);

      try{
        const params = new URLSearchParams();
        if(cursor){
          params.set("cursor", cursor)
        }else if(startDate){
          params.set("startDate", format(startDate, "yyyy-MM-dd"))
        }
        // 如果两个都没有就是默认最新开始
        const res = await fetch(`/api/diary/timeline?${params}`)
        if(!res.ok){
          throw new Error("Failed to fetch timeline data")
        }
        const data = await res.json();
        
        setEntries(
          (prev: EntryPreview[])=>{
            const newEntries = replace ? data.entries : [...prev,...data.entries]
            return newEntries;
          }
        )
        setNextCursor(data.nextCursor)
        setHasMore(data.nextCursor !==null);
      }catch(error){
        console.error("timeline fetch error:", error);
      }finally{
        setIsLoading(false);
        fetchingRef.current = false;
        setInitialLoading(false);
      }
    },
    [startDate] // startDate变了，fetch会重新创建，下面useEffect会重新执行
    // 为什么不是cursor是startDate
    // useCallback主要是为了让这个函数的引用地址不要变
    // 主要是因为下面这个useEffect 一定要依赖这个函数
  )

  useEffect(() => {
    setEntries([]);
    setNextCursor(null);
    setHasMore(true);
    setInitialLoading(true); // 骨架屏
    fetchPage(null, true); // cursor=null表示从头开始，replace表示替换
  }, [fetchPage]);


  /// IntersectionObserver - 无限滚动的核心
  /**
   * IntersectionObserver 是浏览器原生 API，用来监听一个元素是否进入了视口。
   * 比起监听 scroll 事件，它的优势是：
   *   - 不需要手动计算 scrollTop、元素高度等
   *   - 浏览器内部优化过，性能更好
   *   - 不会像 scroll 事件那样每帧都触发回调
   *
   * 工作原理：
   *   1. 我们在列表最底部放一个高度为 1px 的空 div（sentinel，"哨兵"）
   *   2. 用 IntersectionObserver 观察这个哨兵
   *   3. 当用户滚动到列表底部，哨兵进入视口 → 回调触发 → 加载下一页
   *   4. 新数据渲染后把哨兵推到更下面 → 等用户再滚下来 → 再次触发
   *
   * rootMargin: "200px" 的作用：
   *   让哨兵在距离视口底部还有 200px 的时候就算"可见"，
   *   这样用户还没真正滚到底就开始加载了，体验更流畅（预加载）
   */
  useEffect(()=>{
    const el = sentinelRef.current;
    if(!el) return;

    const observer = new IntersectionObserver((observed)=>{
      // observed[0] 就是观察的哨兵元素
      // isIntersecting=true 表示哨兵元素进入了视口
      if(observed[0].isIntersecting && hasMore && !fetchingRef.current){
        fetchPage(nextCursor, false);
      }
    },
    {rootMargin: "200px"} // 提前200px加载下一页
  );
  observer.observe(el); // 开始观察哨兵元素
  return ()=> observer.disconnect(); // 卸载时停止观察,防止内存泄露
  }, [hasMore, fetchPage, nextCursor])

  // 渲染
  return (
    <div >

      {/* 日期筛选 */}
      <div className="flex items-center gap-2 mb-5">
        <Popover>
          <PopoverTrigger 
          render={<Button variant="outline" className="flex items-center gap-2"/>}>
            <CalendarIcon className="size-4" />
            {startDate ? format(startDate, "yyyy-MM-dd") : "选择日期"}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              disabled={{after: new Date()}}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        {startDate && (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-slate-400 hover:text-slate-600"
      onClick={() => setStartDate(undefined)}
    >
      <X className="h-4 w-4" />
    </Button>
  )}
        
      </div>


      {/* 骨架屏 */}
      {initialLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-start animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 bg-white rounded-2xl border m-2 border-slate-100 p-4 space-y-3">
                <div className="h-4 bg-slate-100 mb-2 rounded w-2/3" />
                <div className="h-3 bg-slate-100 mb-2 rounded w-full" />
                <div className="h-3 bg-slate-100 mb-2 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

       {/* 空状态 */}
       {!initialLoading && !isLoading && entries.length === 0 && (
        <div className="py-20 text-center text-sm text-slate-400">
            无日记记录
        </div>
       )}



      {/* Vertical line */}
      <div className="w-px bg-slate-200" />

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
            <div className="flex-1 min-w-0">
              <DiaryCard entry={entry} />
            </div>
          </div>
        ))}
      </div>
      {/* 到底了 */}
      {!hasMore && entries.length > 0 &&(
        <div className="py-4 text-center text-sm text-slate-400">
          --- 就这么多啦～ ---
        </div>
      )}

      
    </div>
  );
}
