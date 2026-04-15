"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowUpIcon, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useHomeStore } from "@/store/useHomeStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DiaryCard from "./DiaryCard";
import { MOODS } from "@/lib/mood-map";


export default function TimelineView() {
  const router = useRouter();
  // state
  const {startDate, setStartDate} = useHomeStore();// 开始日期

  // refs
  const sentinelRef = useRef<HTMLDivElement>(null);// 放在列表底部的"哨兵"元素，被观察到时触发加载
  const filterRef = useRef<HTMLDivElement>(null);// 日期筛选器元素
  const [filterVisible, setFilterVisible] = useState(true);


  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["timeline", startDate?.toISOString()], // startDate变了，queryKey变了，会重新请求
    queryFn: async({pageParam})=>{
      // pageParam是cursor 第一页是undefined
      // 这里写原来的fetchPage的逻辑
      const params = new URLSearchParams();
      if(pageParam){
        params.set("cursor", pageParam)
      }else if(startDate){
        params.set("startDate", format(startDate,"yyyy-MM-dd"))
      }
      const res = await fetch(`/api/diary/timeline?${params}`)
      if(!res.ok) throw new Error("Failed to fetch timeline data")
      const data = await res.json()
      return data
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined, // 取出后端返回的nextCursor
  })
  // useInfiniteQuery 会自动处理分页，不需要我们手动处理
  //数据结构：data = {
//   pages: [
//     { entries: [...], nextCursor: "abc" },   // 第一页
//     { entries: [...], nextCursor: "def" },   // 第二页
//     { entries: [...], nextCursor: null },     // 最后一页
//   ],
//   pageParams: [null, "abc", "def"]
// }

const entries = data?.pages.flatMap((page)=>page.entries)??[];

  


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
      if(observed[0].isIntersecting && hasNextPage && !isFetchingNextPage){
        fetchNextPage();
      }
    },
    {rootMargin: "200px"} // 提前200px加载下一页
  );
  observer.observe(el); // 开始观察哨兵元素
  return ()=> observer.disconnect(); // 卸载时停止观察,防止内存泄露
  }, [hasNextPage, fetchNextPage])

  // 监听filter还在不在窗口
  useEffect(()=>{
    const el = filterRef.current;
    if(!el) return;
    const observer = new IntersectionObserver(
      ([entry])=>{
        setFilterVisible(entry.isIntersecting)
      },
      { rootMargin: "-30px 0px 0px 0px" }
    );
    observer.observe(el);
    return ()=> observer.disconnect();
  },[])

  // 回到顶部
  const [showTop,setShowTop] = useState(false);
  useEffect(()=>{
    function onScroll(){
      setShowTop(window.scrollY > window.innerHeight); // 滚动到窗口高度时，显示回到顶部按钮
    }
    window.addEventListener("scroll",onScroll);
    return ()=> window.removeEventListener("scroll",onScroll);
  },[])

  // 滚动监听
  const [floatingDate,setFloatingDate] = useState<string|undefined>("");
  useEffect(()=>{
    function onScroll(){
      const cards = document.querySelectorAll('[data-date]');
      let current='';
      for(const card of cards){
        const rect = card.getBoundingClientRect();
        if(rect.top>=0){
          current = card.getAttribute('data-date') ?? '';
          break;
        }
      }
      if(current !== floatingDate){
        setFloatingDate(current);
      }
    }
    window.addEventListener('scroll',onScroll);
    return ()=>window.removeEventListener('scroll',onScroll);
  },[])

  // 渲染
  return (
    <div >

      {/* 日期筛选 */}
      <div className="flex items-center gap-2 mb-5" ref={filterRef}>
        <Popover>
          <PopoverTrigger 
          render={<Button variant="outline" className="flex items-center gap-2"/>}>
            <CalendarIcon className="size-4" />
            {startDate ? format(startDate, "yyyy-MM-dd") : "Select date"}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto z-0 p-0">
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
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setStartDate(undefined)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {/* 日期浮标 */}
      {!filterVisible&&floatingDate && !isLoading && (
        <div className="fixed top-[68px] left-6 md:left-10 lg:left-20 z-20">
        <span className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground font-medium shadow-sm'>
            <CalendarIcon className="size-4 text-foreground/70" />
            {floatingDate?.slice(0, 10)}
          </span>
        </div>
      )}



      {/* 骨架屏 */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-start animate-pulse">
              <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
              <div className="flex-1 bg-card rounded-2xl border m-2 border-border p-4 space-y-3">
                <div className="h-4 bg-muted mb-2 rounded w-2/3" />
                <div className="h-3 bg-muted mb-2 rounded w-full" />
                <div className="h-3 bg-muted mb-2 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

       {/* 空状态 */}
       {!isLoading && entries.length === 0 && (
        <div className="py-20 text-center text-sm text-muted-foreground">
            No diary entries
        </div>
       )}



      {/* Vertical line */}
      <div className="w-px bg-muted" />

      <div className="space-y-5">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="flex gap-4 items-start" data-date={entry.date}>
            {/* Emoji circle */}
            {/* <div
              className="relative z-10 w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 text-xl border-2 shadow-sm"
              style={{ borderColor: idx === 0 ? (entry.moodColorHex ?? "#0f58bd") : "#e2e8f0" }}
            > */}
              <img src={MOODS[entry.moodEmoji as keyof typeof MOODS].icon} alt={entry.moodEmoji} 
              className={"w-15 h-15 shadow-sm rounded-full shadow-sm"} 
              style={{ borderColor: MOODS[entry.moodEmoji as keyof typeof MOODS].colorHex ?? "#0f58bd" ,
                borderWidth: "2px",
              }} /> 
            {/* </div> */}
            <div className="flex-1 min-w-0">
              <DiaryCard entry={entry} />
            </div>
          </div>
        ))}
      </div>
      <div ref={sentinelRef} style={{ height: 1 }} />
      {/* 到底了 */}
      {!hasNextPage && entries.length > 0 &&(
        <div className="py-4 text-center text-sm text-muted-foreground">
          --- That&apos;s all ---
        </div>
      )}

      {/* 回到顶部 */}
      {showTop &&
      <Button
        onClick={()=>window.scrollTo({top:0, behavior:'smooth'})}
        className="fixed bottom-10 right-5 rounded-2xl border w-10 h-10 border-border bg-brand text-brand-foreground shadow-sm hover:bg-muted">
          <ArrowUpIcon className="size-4" />
      </Button>
      }
      
    </div>
  );
}
