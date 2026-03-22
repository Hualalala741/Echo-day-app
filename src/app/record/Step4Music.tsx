"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RefreshCw, Check, Music2, SkipForward } from "lucide-react";
import type { Draft, GeneratedContent } from "./RecordWizard";

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  previewUrl: string | null;
}

interface Props {
  draft: Draft;
  generated: GeneratedContent;
  onComplete: (entryId: string) => void;
}

export default function Step4Music({ draft, generated, onComplete }: Props) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    searchTracks(generated.musicSearchQuery);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentIdx]);

  async function searchTracks(query: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Music search failed");
      const data: SpotifyTrack[] = await res.json();
      setTracks(data);
      setCurrentIdx(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to find music");
    } finally {
      setLoading(false);
    }
  }

  function togglePlay() {
    const track = tracks[currentIdx];
    if (!track?.previewUrl || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.src = track.previewUrl;
      audioRef.current.play();
    }
    setIsPlaying((p) => !p);
  }

  async function handleConfirm() {
    const track = tracks[currentIdx];
    if (!track) return;
    setSaving(true);
    try {
      const res = await fetch("/api/record/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          diaryText: generated.diaryText,
          valence: generated.valence,
          arousal: generated.arousal,
          musicSearchQuery: generated.musicSearchQuery,
          musicReason: generated.musicReason,
          spotifyTrackId: track.id,
          spotifyTrackName: track.name,
          spotifyArtist: track.artist,
          spotifyAlbumArt: track.albumArt,
          spotifyPreviewUrl: track.previewUrl,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { entryId } = await res.json();
      onComplete(entryId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  const track = tracks[currentIdx];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Step 4: Your Song</h1>
        <p className="text-slate-500 text-lg">Echo picked music that matches your day's mood.</p>
      </div>

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      <div className="max-w-xl">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center gap-3 text-slate-500 text-sm">
            <Music2 className="w-5 h-5 animate-pulse" style={{ color: "#0f58bd" }} />
            Finding the perfect song…
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : track ? (
          <>
            {/* Reason */}
            {generated.musicReason && (
              <p className="text-sm text-slate-500 italic mb-4 px-1">"{generated.musicReason}"</p>
            )}

            {/* Track card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-5">
                {/* Album art */}
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                  {track.albumArt && (
                    <img src={track.albumArt} alt={track.name} className="w-full h-full object-cover" />
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{track.name}</p>
                  <p className="text-sm text-slate-500 truncate">{track.artist}</p>
                  {track.previewUrl && (
                    <p className="text-xs text-slate-400 mt-1">30s preview available</p>
                  )}
                </div>
                {/* Play button */}
                <button
                  onClick={togglePlay}
                  disabled={!track.previewUrl}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 transition-opacity disabled:opacity-30"
                  style={{ backgroundColor: "#0f58bd" }}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setCurrentIdx((i) => Math.min(i + 1, tracks.length - 1))}
                disabled={currentIdx >= tracks.length - 1}
                className="flex items-center gap-2 px-4 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                <SkipForward className="w-4 h-4" />
                Next song
              </button>

              <button
                onClick={() => searchTracks(generated.musicSearchQuery)}
                className="flex items-center gap-2 px-4 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Re-suggest
              </button>

              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#0f58bd", boxShadow: "0 4px 14px rgba(15,88,189,0.2)" }}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? "Saving…" : "This is the one!"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">No tracks found.</p>
        )}
      </div>
    </div>
  );
}
