"use client";

import {useState, useRef, useCallback, useEffect} from "react";
import { Loader2, Search, X } from "lucide-react";
import DiaryCard from "@/components/home/DiaryCard";
import type { EntryPreview } from "@/app/home/HomeClient";
import { useSearchStore } from "@/store/useSearchStore";

const PRIMARY = "#0f58bd";

export default function SearchOverlay() {
  const {open, setOpen} = useSearchStore();
  const {query, setQuery} = useSearchStore();
  const {results, setResults} = useSearchStore();
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (q: string) => {
    if(!q.trim()){
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/diary/search?q=${encodeURIComponent(q.trim())}`);
      if(!res.ok) throw new Error("Failed to search diary entries");
      const data = await res.json();
      setResults(data.entries);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // debounce
  function handleChange(value: string) {
    setQuery(value);
    if(value.trim()) {
      setOpen(true);
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void search(value);
    }, 500);
  }

  useEffect(() => {
    if(open) {
      inputRef.current?.focus();
    }
  }, [open]);
  // 关闭
  useEffect(()=>{
    function onKeyDown(e: KeyboardEvent) {
      if(e.key === "Escape") {
        setOpen(false);
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleClose() {
    setOpen(false);
    inputRef.current?.blur();
    clearTimeout(debounceRef.current);
  }
  return (
  <div className="relative">
    {/* 展示在header的部分 */}
  <div className="relative z-50 flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-white">
  <Search className="w-4 h-4 text-slate-400 shrink-0" />
  <input
    value={query}
    onChange={(e) => handleChange(e.target.value)}
    onFocus={() => { if (query.trim()) setOpen(true); }}
    placeholder="Search diaries..."
    className="w-40 sm:w-56 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
  />
  {query && (
    <button onClick={
      () => {
        handleClose();
        setQuery("");
        setResults([]);
        inputRef.current?.blur();
        clearTimeout(debounceRef.current);
      }
    } className="text-slate-400 hover:text-slate-600">
      <X className="w-4 h-4" />
    </button>
  )}
</div>
    {/* 蒙层 */}
    {open && (
      <div 
      onClick={handleClose}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        {/* 搜索面板 */}
        {/* 结果面板-阻止点击冒泡 */}
        <div className="absolute top-[10%] w-full sm:max-w-md md:max-w-lg lg:max-w-2xl bg-white rounded-xl shadow-lg p-4 overflow-y-auto max-h-[88%]"
          onClick={(e) => e.stopPropagation()}>
        {/* 搜索结果 */}
        <div>
          {loading && (
            <div>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div>
              <p>No diaries found</p>
            </div>
          )}
          {!loading && query.trim() && results.length > 0 && (
            <div className="space-y-4">
              {results.map((entry) => (
                <DiaryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    )}
    </div>
  );
}