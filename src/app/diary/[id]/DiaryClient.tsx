"use client";

import { useState, useRef, useEffect ,useCallback} from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, X, Check, Play, Pause, Music2, ChevronDown, Trash } from "lucide-react";
import { MOODS } from "@/lib/mood-map";
import Script from "next/script";

interface Entry {
  id: string;
  date: string;
  photoUrl: string;
  diaryText: string;
  moodEmoji: string;
  moodColorHex: string;
  emotionLabel: string;
  spotifyTrackId: string | null;
  spotifyTrackName: string | null;
  spotifyArtist: string | null;
  spotifyAlbumArt: string | null;
  spotifyPreviewUrl: string | null;
}

interface Props {
  entry: Entry;
  isNew: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

export default function DiaryClient({ entry, isNew }: Props) {
  const router = useRouter();

  // Intro mask: shown on revisit, hidden on first creation
  const [showMask, setShowMask] = useState(!isNew);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(entry.diaryText);
  const [editMood, setEditMood] = useState({ emoji: entry.moodEmoji, label: entry.emotionLabel, colorHex: entry.moodColorHex });
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

    // Music player
  const embedRef = useRef<any>(null);
  const spotifyEmbedRef = useRef<HTMLDivElement|null>(null);

  function initEmbed(IFrameAPI: any) {
    console.log("initEmbed called", {
      el: !!spotifyEmbedRef.current,
      alreadyCreated: !!embedRef.current,
      trackId: entry.spotifyTrackId,
    });
    if(!spotifyEmbedRef.current|| embedRef.current) return;
    // 确保 DOM 节点还在文档里
  if (!document.contains(spotifyEmbedRef.current)) return;
  console.log("initEmbed creating controller");
    IFrameAPI.createController(
      spotifyEmbedRef.current,
      {uri: `spotify:track:${entry.spotifyTrackId}`,height: 152},
      (controller: any)=>{
        console.log("controller created!", controller);
        embedRef.current = controller;
      }
    )
  }
  // callback ref: Dom挂载时，如果API已经加载就立即创建
  const spotifyRefCb = useCallback((el: HTMLDivElement|null) => {
    console.log("spotifyRefCb", { el: !!el, apiCached: !!(window as any).__spotifyIFrameAPI });
    // 卸载时清理
  if (!el) {
    embedRef.current?.destroy?.();
    embedRef.current = null;
    spotifyEmbedRef.current = null;
    return;
  }
    
    spotifyEmbedRef.current = el;
    if (embedRef.current) return;// 已有 controller，不重复创建

    const api = (window as any).__spotifyIFrameAPI;
    if (api) {
      initEmbed(api);
    }
    
  },[entry.spotifyTrackId]);

  function handleSpotifyScriptLoad() {
    console.log("Script onLoad fired");

  // 情况1: API 我们之前已缓存
  if ((window as any).__spotifyIFrameAPI) {
    console.log("API already cached, reusing");
    initEmbed((window as any).__spotifyIFrameAPI);
    return;
  }

  // 情况2: 首次加载，等回调
  (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
    console.log("onSpotifyIframeApiReady fired");
    (window as any).__spotifyIFrameAPI = IFrameAPI;
    initEmbed(IFrameAPI);
  };
  }
  



  function handleEnterDay() {
    setShowMask(false);
    embedRef.current?.togglePlay();
  }

  function handleBack() {
    if (dirty) {
      if (!confirm("You have unsaved changes. Leave anyway?")) return;
    }
    router.push("/home");
  }

  function handleEditToggle() {
    if (editing && dirty) {
      if (!confirm("Discard unsaved changes?")) return;
      setEditText(entry.diaryText);
      setEditMood({ emoji: entry.moodEmoji, label: entry.emotionLabel, colorHex: entry.moodColorHex });
      setDirty(false);
    }
    setEditing((e) => !e);
    setShowMoodPicker(false);
  }
  async function handleDelete(){
    if(!confirm("Are you sure you want to delete this diary?")) return;
    try{
      const res = await fetch(`/api/diary/${entry.id}`,{method: "DELETE"})
      if(!res.ok){
        let message = "Delete failed";
        const data = await res.json();
        if(data && typeof data.error === "string") message = data.error;
        throw new Error(message);
      }
      router.push("/home");
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/diary/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diaryText: editText,
          moodEmoji: editMood.label,
          emotionLabel: editMood.label,
          moodColorHex: editMood.colorHex,
        }),
      });
      setDirty(false);
      setEditing(false);
      // Refresh page data
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // Mood color as rgba for overlay
  const hex = editMood.colorHex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const moodOverlay = `rgba(${r}, ${g}, ${b}, 0.18)`;

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" /> */}
      {entry.spotifyTrackId && (
        <Script
          src="https://open.spotify.com/embed/iframe-api/v1"
          strategy="afterInteractive"
          onLoad={handleSpotifyScriptLoad}
        />
      )}
      {/* Full-screen photo background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${entry.photoUrl})` }}
      />

      {/* Mood color overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: moodOverlay }} />

      {/* Bottom gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* ── INTRO MASK ── */}
      {showMask && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6"
          style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, 0.55)`, backdropFilter: "blur(2px)" }}
        >
          <div className="text-center text-white">
            <p className="text-sm font-medium uppercase tracking-widest opacity-70 mb-2">
              {formatDate(entry.date)}
            </p>
            <img src={MOODS[entry.moodEmoji].icon} alt={entry.moodEmoji} className="w-60 h-60" />
            <p className="text-lg font-semibold opacity-90">{entry.emotionLabel}</p>
          </div>
          <button
            onClick={handleEnterDay}
            className="mt-2 px-8 py-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-sm hover:bg-white/30 transition-all"
          >
            Enter This Day
          </button>
          <ChevronDown className="w-5 h-5 text-white/50 animate-bounce" />
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between p-6 max-w-2xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleEditToggle}
                  className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="flex items-center gap-1.5 px-4 h-10 rounded-full text-white text-sm font-bold disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: "#0f58bd" }}
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save
                </button>
              </>
            ) : (
              <>
              <button
                onClick={handleEditToggle}
                className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="w-10 h-10 rounded-full bg-red-500/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/50 transition-colors"
              >
                <Trash className="w-4 h-4" />
              </button> 
              </>
            )}
          </div>
        </div>

        {/* Bottom content */}
        <div className="pb-4 space-y-5">
          {/* Date + Mood */}
          <div className="flex items-center gap-3">
            {/* Mood badge */}
            <button
              onClick={() => editing && setShowMoodPicker((s) => !s)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 ${editing ? "cursor-pointer hover:bg-black/50" : "cursor-default"}`}
            >
              <img src={MOODS[editMood.emoji].icon} alt={editMood.emoji} className="w-10 h-10" />
              <span className="text-white text-sm font-medium">{editMood.label}</span>
            </button>
            <span className="text-white/60 text-sm">{formatDate(entry.date)}</span>
          </div>

          {/* Mood picker */}
          {showMoodPicker && editing && (
            <div className="grid grid-cols-3 gap-2 bg-black/50 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              {Object.values(MOODS).map((m) => (
                <button
                  key={m.label}
                  onClick={() => {
                    setEditMood({ emoji: m.label, label: m.label, colorHex: m.colorHex });
                    setDirty(true);
                    setShowMoodPicker(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-medium transition-colors ${
                    editMood.label === m.label ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                >
                  <img src={m.icon} alt={m.label} className="w-10 h-10" />
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Diary text */}
          {editing ? (
            <textarea
              value={editText}
              onChange={(e) => { setEditText(e.target.value); setDirty(true); }}
              className="w-full bg-black/30 backdrop-blur-sm rounded-2xl border border-white/20 p-4 text-white text-base leading-relaxed resize-none outline-none placeholder-white/40 min-h-[160px]"
              placeholder="Write your diary entry…"
            />
          ) : (
            <p className="text-white text-base leading-relaxed drop-shadow">
              {editText}
            </p>
          )}

          {/* Music player */}
          {entry.spotifyTrackId && (
            <div  className="rounded-2xl overflow-hidden">
              {/* <iframe
                src={`https://open.spotify.com/embed/track/${entry.spotifyTrackId}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ borderRadius: "16px", border: "none" }}
              /> */}
              <div 
                ref={spotifyRefCb}
                id="spotify-embed"
                className="rounded-2xl overflow-hidden"
                style={{minHeight: "152px"}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
