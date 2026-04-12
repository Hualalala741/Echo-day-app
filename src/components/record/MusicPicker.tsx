"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Check, Music2, SkipForward, AlertCircle, SkipBack } from "lucide-react";

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  previewUrl: string | null;
}

const PAGE_SIZE = 5;

interface Props {
  musicSearchQuery?: string;
  musicReason?: string;
  onConfirm: (track: SpotifyTrack) => void | Promise<void>;
  saving: boolean;
}

export default function MusicPicker({ musicSearchQuery, musicReason, onConfirm, saving }: Props) {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [searchOffset, setSearchOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = musicSearchQuery?.trim();
    if (!q) {
      setTracks([]);
      setCurrentIdx(0);
      setSearchOffset(0);
      setError(null);
      setLoading(false);
      return;
    }
    setSearchOffset(0);
    void searchTracks(q, 0);
  }, [musicSearchQuery]);

  async function searchTracks(query: string, offset: number) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/spotify/search?q=${encodeURIComponent(query)}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Music search failed");
      let data: SpotifyTrack[] = await res.json();
      let usedOffset = offset;

      if (data.length === 0 && offset > 0) {
        const resFirst = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&offset=0`);
        if (!resFirst.ok) throw new Error("Music search failed");
        data = await resFirst.json();
        usedOffset = 0;
      }

      setTracks(data);
      setCurrentIdx(0);
      setSearchOffset(usedOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to find music");
    } finally {
      setLoading(false);
    }
  }

  function handleNextBatch() {
    const q = musicSearchQuery?.trim();
    if (!q) return;
    void searchTracks(q, searchOffset + PAGE_SIZE);
  }
  const track = tracks[currentIdx];

  async function handleConfirm() {
    if (!track || saving) return;
    await onConfirm(track);
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Music2 className="h-4 w-4 shrink-0 text-[#0f58bd]" />
        <span className="text-xs font-semibold text-slate-500">Today&apos;s Song</span>
      </div>

      {!musicSearchQuery?.trim() ? (
        <p className="text-sm text-slate-400">Music will be recommended after diary generation…</p>
      ) : loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/90 p-4 text-sm text-slate-500">
          <Music2 className="h-4 w-4 animate-pulse text-[#0f58bd]" />
          Searching for songs…
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>Search failed, please retry</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const q = musicSearchQuery?.trim();
              if (q) void searchTracks(q, searchOffset);
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-red-700 transition-colors hover:bg-red-100 active:scale-[0.98]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="font-medium">Retry</span>
          </button>
        </div>
      ) : track ? (
        <div className="space-y-4">
          {musicReason && (
            <p className="px-0.5 text-sm italic leading-relaxed text-slate-600">
              &ldquo;{musicReason}&rdquo;
            </p>
          )}

          <div className="overflow-hidden rounded-xl bg-slate-100/80">
            <iframe
              key={track.id}
              src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=1`}
              height={152}
              width="100%"
              title="Spotify"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="block border-0"
              style={{ borderRadius: "12px" }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNextBatch}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                More
              </button>
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.max(i - 1, 0))}
                disabled={currentIdx <= 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <SkipBack className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => Math.min(i + 1, tracks.length - 1))}
                disabled={currentIdx >= tracks.length - 1}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Next
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={saving}
              className="inline-flex h-11 shrink-0 w-[20%] items-center justify-center gap-2 rounded-xl bg-[#0f58bd] px-5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f58bd] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              )}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No songs found</p>
      )}
    </div>
  );
}
