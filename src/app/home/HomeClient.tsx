"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus ,Globe, Camera, Sun, Moon} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CalendarView from "@/components/home/CalendarView";
import TimelineView from "@/components/home/TimelineView";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useHomeStore } from "@/store/useHomeStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchOverlay from "@/components/home/SearchOverlay";
import { Spinner } from "@/components/ui/spinner";
import { useThemeStore } from "@/store/useThemeStore";

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
  user: { name: string | null; image: string | null; email: string | null; preferredLang: 'en' | 'zh' };
  todayEntry: { id: string; status: string } | null;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type View = "calendar" | "timeline";


export default function HomeClient({ entries, year, month, user, todayEntry }: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'zh'>(user.preferredLang);
  const {viewMode, setViewMode} = useHomeStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {theme, toggleTheme} = useThemeStore();


  function handleLangChange(newLang: 'en' | 'zh'){
    setLang(newLang);
    fetch('/api/user/preferences', {
      method: 'PATCH', 
      body: JSON.stringify({preferredLang: newLang}),
    }).catch(error => {
      console.error(error);
      alert((error as Error).message);
    });
  }

  function navigateMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1)  { newMonth = 12; newYear--; }
    router.push(`/home?month=${newYear}-${String(newMonth).padStart(2, "0")}`);
  }

  function handleNewEntry() {
    if (!todayEntry) { // 没有今天的日记，则创建新的日记
      router.push("/record");
    } else if (todayEntry.status === "DRAFT") { // 有今天的日记，但状态为草稿，则提示继续编辑（这里应该要询问，是否继续编辑））
      // setShowConfirm(true);
      router.push("/record?resume=true");
    } else { // 有今天的日记，则提示重写
      setShowConfirm(true);
    }
  }
  async function handleReplace() {
    if(deleting) return;
    setDeleting(true);
    if(todayEntry?.id){
      try{
        const res = await fetch(`/api/diary/${todayEntry.id}`,{method:"DELETE"})
        if(!res.ok){
          throw new Error(`Delete failed: ${res.status}`)
        }
      }catch(error){
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

  const firstName = user.name?.split(" ")[0] ?? "there";
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl,setAvatarUrl] = useState(user.image ?? null);
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>)=>{
    setUploading(true)
    const file = e.target.files?.[0];
    if(!file)return;
    const form = new FormData()
    form.append('file', file);
    try{
      const res = await fetch('/api/user/avatar', {method:"POST",body:form})
      if(!res.ok) throw new Error("Upload failed");
      const {image} = await res.json(); // 公共url
      setAvatarUrl(image);
    }catch(err){
      console.error(err);
      alert((err as Error).message);
    }finally{
      setUploading(false);
    }
  }
  //  style={{ backgroundColor: "#f6f7f8" }}

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-[100] bg-card border-b border-border px-6 md:px-10 lg:px-20">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center"
            >
              <Sparkles className="w-5 h-5 text-brand-foreground" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Echo Day</span>
          </div>
          <SearchOverlay />

          {/* Right section */}
          <div className="flex items-center gap-4">
            {/* New Entry */}
            <button
              onClick={handleNewEntry}
              className="flex items-center bg-brand gap-1.5 h-10 px-4 rounded-lg text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{newEntryLabel}</span>
            </button>

            {/* Divider + avatar area */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              {/* Avatar */}
              <div className="relative cursor-pointer">

                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="cursor-pointer rounded-full outline-none hover:opacity-80 hover:scale-105 transition-all"
                  >
                    <Avatar className="w-10 h-10 border-2" style={{ borderColor: "var(--border)" }}>
                      <AvatarImage src={avatarUrl ?? undefined} />
                      <AvatarFallback
                        className="text-sm font-semibold"
                        style={{ backgroundColor: "color-mix(in srgb, var(--brand) 15%, transparent)", color: "var(--brand)" }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-45 z-[200]">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium text-foreground">{user.name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuItem className="cursor-pointer">
                      {uploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Spinner className="w-4 h-4 mr-2"/>
                        Uploading...
                       </div>
                      ):( 
                        <div className="rounded-ful flex items-center justify-center group-hover:opacity-100 transition-opacity"
                         onClick={(e)=>{e.stopPropagation();fileInputRef.current?.click()}}>
                        <Camera className="w-4 h-4 mr-2" />
                        Change Avatar
                       </div>)
                  }
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />
                  <div className="flex items-center px-2 gap-2">
                  <span className="text-sm font-medium text-foreground">Model Language</span>
                  <Globe className="w-4 h-4 mr-2" />  
                  </div>
                  <div
                  className="mx-2 my-1.5 flex items-center bg-muted rounded-lg p-0.5 gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                  > 
                  
                  
                  
                  {(["en", "zh"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => handleLangChange(l)}
                      className={`flex-1 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        lang === l
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {l === "en" ? "English" : "中文"}
                    </button>
                  ))}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="flex items-center px-2">
                  <span className="text-sm font-medium text-foreground">Theme</span>
                  <div
                  className="mx-2 my-1.5 flex items-center bg-muted rounded-lg p-0.5 gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                  > 
                  {(["light","dark"] as const).map((t)=>{
                    return (
                      <button key={t}
                        onClick={()=>{
                          if(t === theme) return;
                          toggleTheme();
                        }}
                        className={`flex-1 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          t === theme
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t === "light" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                        </button>
                    )
                  })}
                  </div>
                  </div>
            
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="cursor-pointer "
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
                </DropdownMenu>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome + Toggle */}
      <div className="px-6 md:px-10 lg:px-20 mb-4 pt-8 pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entries.length > 0
              ? `You have ${entries.length} entr${entries.length === 1 ? "y" : "ies"} this month.`
              : "Start recording your day!"}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-card rounded-xl p-1 gap-1">
          {(["calendar", "timeline"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                viewMode === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "calendar" ? "Calendar" : "Timeline"}
            </button>
          ))}
        </div>
      </div>

      {/* Month nav */}
      {viewMode === "calendar" && (
        <div className="px-6 md:px-10 lg:px-20 mb-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors text-xl leading-none"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors text-xl leading-none"
          >
            ›
          </button>
        </div>
      )}
    
      {/* Content */}
      <main className="px-6 z-50 md:px-10 lg:px-20 pb-16">
        {viewMode === "calendar" ? (
          <CalendarView entries={entries} year={year} month={month} />
        ) : (
          <TimelineView/>
        )}
      </main>

      
      <AlertDialog open={showConfirm}>
        <AlertDialogContent>
        <AlertDialogHeader>
        <AlertDialogTitle>Notice</AlertDialogTitle>
        <AlertDialogDescription>
        Starting over will delete today&apos;s existing diary. Are you sure you want to continue?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setShowConfirm(false)} disabled={deleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleReplace} disabled={deleting} className='bg-red-500 hover:bg-red-600 disabled:opacity-50'>
          {deleting ? <><Spinner className="w-4 h-4 mr-2" />Deleting...</> : "Confirm"}
        </AlertDialogAction>
      </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 更换头像 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className='hidden'
        onChange={handleAvatarUpload}
      />
      
    </div>
  );
}
