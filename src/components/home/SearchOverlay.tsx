"use client";

import {useState, useRef, useCallback, useEffect} from "react";
import { Loader2, Search, X } from "lucide-react";
import DiaryCard from "@/components/home/DiaryCard";
import type { EntryPreview } from "@/app/home/HomeClient";

const PRIMARY = "#0f58bd";

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntryPreview[]>([]);
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
    setQuery("");
    setResults([]);
    inputRef.current?.blur();
    clearTimeout(debounceRef.current);
  }
  return (
    <>
    {/* 展示在header的部分 */}
    <div className="relative z-50 flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-white">
  <Search className="w-4 h-4 text-slate-400 shrink-0" />
  <input
    value={query}
    onChange={(e) => handleChange(e.target.value)}
    onFocus={() => { if (query.trim()) setOpen(true); }}
    placeholder="搜索日记..."
    className="w-40 sm:w-56 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
  />
  {query && (
    <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
      <X className="w-4 h-4" />
    </button>
  )}
</div>
    {/* 蒙层 */}
    {open && (
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        {/* 搜索面板 */}
        {/* 结果面板-阻止点击冒泡 */}
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-4"
          onClick={(e) => e.stopPropagation()}>

        {/* 搜索结果 */}
        <div>
          {loading && (
            <div>
              <Loader2 className="w-4 h-4 animate-spin" />
              正在搜索...
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div>
              <p>没有找到相关日记</p>
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

{/* 点击空白处关闭 */}
      <div className="flex-1 w-full" onClick={handleClose}/>
    </div>
    )}
    </>
  );
}