"use client";

import { useState, useEffect, useRef } from "react";
import { Wand2, ArrowLeft, Edit } from "lucide-react";
import type { Draft, GeneratedContent, Message } from "./RecordWizard";
import MusicPicker, { type SpotifyTrack } from "@/components/record/MusicPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  draft: Draft;
  aiLang: 'en' | 'zh';
  onBack: () => void | Promise<void>;
  onComplete: (entryId: string) => void;
  saveDraft: (data: {
    draftId: string;
    currentStep?: number;
    conversationMessages?: Message[] | null;
    diaryText?: string | null;
    valence?: number | null;
    arousal?: number | null;
    musicSearchQuery?: string | null;
    musicReason?: string | null;
  }) => Promise<void>;
}

/** 服务端或本地已有生成结果时，跳过 /api/record/generate */
function hasStoredGeneration(d: Draft): boolean {
  const text = d.diaryText?.trim();
  return !!text && d.valence != null && d.arousal != null;
}

export default function Step3Review({ draft, aiLang, onBack, onComplete, saveDraft }: Props) {
  const hasSavedDiary = hasStoredGeneration(draft);
  const [loading, setLoading] = useState(!hasSavedDiary);
  const [diaryText, setDiaryText] = useState(() =>
    hasSavedDiary ? (draft.diaryText ?? "") : ""
  );
  const [generated, setGenerated] = useState<GeneratedContent | null>(
    hasSavedDiary
      ? {
          diaryText: draft.diaryText ?? "",
          valence: draft.valence ?? 0,
          arousal: draft.arousal ?? 0,
          musicSearchQuery: draft.musicSearchQuery ?? "",
          musicReason: draft.musicReason ?? "",
        }
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backDialogOpen, setBackDialogOpen] = useState(false);
  const [backPending, setBackPending] = useState(false);
  const didSaveAfterGenRef = useRef(false);

  useEffect(() => {
    if (hasSavedDiary) return;
    const controller = new AbortController();
    void generate(controller.signal);
    return () => controller.abort();
  }, []);

  async function generate(signal: AbortSignal) {
    didSaveAfterGenRef.current = false;
    setLoading(true);
    setError(null);
    setDiaryText("");
    try {
      const res = await fetch("/api/record/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, conversationMessages: draft.conversationMessages, aiLang }),
        signal,
      });
      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") continue;
            try {
              const data = JSON.parse(raw);
              if (data.type === "text") setDiaryText((prev) => prev + data.chunk);
              if (data.type === "meta") setGenerated(data.content);
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  // 本次会话内生成完成后：同步草稿（含 currentStep=2；generate 接口已写库，此处对齐 currentStep 与父级 draft）
  useEffect(() => {
    if (hasSavedDiary) return;
    if (!generated || loading) return;
    if (didSaveAfterGenRef.current) return;
    didSaveAfterGenRef.current = true;
    void saveDraft({
      draftId: draft.id,
      currentStep: 2,
      diaryText: generated.diaryText,
      valence: generated.valence,
      arousal: generated.arousal,
      musicSearchQuery: generated.musicSearchQuery,
      musicReason: generated.musicReason,
    }).catch(() => {
      didSaveAfterGenRef.current = false;
    });
  }, [hasSavedDiary, generated, loading, draft.id, saveDraft]);

  async function handleConfirmBack() {
    setBackPending(true);
    try {
      await onBack();
      setBackDialogOpen(false);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBackPending(false);
    }
  }

  async function handleMusicConfirm(track: SpotifyTrack) {
    if (!generated) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/record/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          diaryText,
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
      const { entryId } = (await res.json()) as { entryId: string };
      onComplete(entryId);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => setBackDialogOpen(true)}
        className="flex items-center gap-2 text-lg font-semibold text-slate-600 hover:text-[#0f58bd] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Conversation
      </button>

      <AlertDialog open={backDialogOpen} onOpenChange={setBackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Go back?</AlertDialogTitle>
            <AlertDialogDescription>
              Going back will discard the current diary. It will be regenerated when you return to this step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={backPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={backPending}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmBack();
              }}
              className="bg-[#0f58bd] hover:bg-[#0c4a9e]"
            >
              {backPending ? "Processing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Step 3: Diary & Music</h1>
        <p className="text-slate-500 text-lg">Echo will generate your diary. Edit it and confirm today&apos;s song before saving.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
        <div className="rounded-xl bg-white p-2 shadow-sm border border-slate-200">
          <div
            className="aspect-[4/3] w-full rounded-lg bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${draft.photoUrl})` }}
          />
        </div>

        <div className="flex flex-col gap-4 min-h-0">
          {loading && (
            <div className="flex items-center gap-3 text-sm text-slate-500 bg-white rounded-xl p-4 border border-slate-200">
              <Wand2 className="w-4 h-4 animate-spin" style={{ color: "#0f58bd" }} />
              Generating your diary…
            </div>
          )}

          <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[320px] lg:min-h-[400px]">
            <div className="flex items-center px-4 py-3 border-b border-slate-100 shrink-0">
              <Edit className="w-4 h-4 text-[#0f58bd] mr-2" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Diary</span>
            </div>
            <textarea
              value={diaryText}
              onChange={(e) => setDiaryText(e.target.value)}
              className="flex-1 w-full p-4 text-sm text-slate-700 leading-relaxed resize-none outline-none min-h-[240px] lg:min-h-[300px]"
              placeholder="Your diary will appear here…"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">
              {error}
              <button
                type="button"
                onClick={() => {
                  const c = new AbortController();
                  void generate(c.signal);
                }}
                className="ml-2 underline text-[#0f58bd]"
              >
                Regenerate
              </button>
            </p>
          )}
        </div>
      </div>
      <MusicPicker
        musicSearchQuery={generated?.musicSearchQuery}
        musicReason={generated?.musicReason}
        onConfirm={handleMusicConfirm}
        saving={saving}
      />
      {saveError && <p className="text-sm text-red-500">{saveError}</p>}
    </div>
  );
}
