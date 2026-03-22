"use client";

import { useState, useEffect } from "react";
import { Wand2 } from "lucide-react";
import type { Draft, GeneratedContent } from "./RecordWizard";

interface Props {
  draft: Draft;
  onComplete: (content: GeneratedContent) => void;
}

export default function Step3Review({ draft, onComplete }: Props) {
  const [loading, setLoading] = useState(true);
  const [diaryText, setDiaryText] = useState("");
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    generate(controller.signal);
    return () => controller.abort();
  }, []);

  async function generate(signal: AbortSignal) {
    setLoading(true);
    setError(null);
    setDiaryText("");
    try {
      const res = await fetch("/api/record/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, transcript: draft.transcript }),
        signal,
      });
      if (!res.ok) throw new Error("Generation failed");

      // SSE stream
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
            } catch { /* ignore */ }
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

  function handleContinue() {
    if (!generated) return;
    onComplete({ ...generated, diaryText });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Step 3: Review Your Diary</h1>
        <p className="text-slate-500 text-lg">Echo has written your entry. Edit it as you like.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: photo */}
        <div className="rounded-xl bg-white p-2 shadow-sm border border-slate-200">
          <div className="aspect-[4/3] w-full rounded-lg bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${draft.photoUrl})` }} />
        </div>

        {/* Right: generated diary */}
        <div className="flex flex-col gap-4">
          {loading && (
            <div className="flex items-center gap-3 text-sm text-slate-500 bg-white rounded-xl p-4 border border-slate-200">
              <Wand2 className="w-4 h-4 animate-spin" style={{ color: "#0f58bd" }} />
              Generating your diary…
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Diary Entry</span>
              {generated && (
                <span className="text-xl">{generated.musicReason ? "✨" : ""}</span>
              )}
            </div>
            <textarea
              value={diaryText}
              onChange={(e) => setDiaryText(e.target.value)}
              className="w-full p-4 text-sm text-slate-700 leading-relaxed resize-none outline-none min-h-[260px]"
              placeholder="Your diary will appear here…"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}
              <button onClick={generate} className="ml-2 underline text-[#0f58bd]">Retry</button>
            </p>
          )}

          <button
            onClick={handleContinue}
            disabled={!generated || loading}
            className="flex items-center justify-center gap-2 h-12 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#0f58bd", boxShadow: "0 4px 14px rgba(15,88,189,0.2)" }}
          >
            Continue to Music
          </button>
        </div>
      </div>
    </div>
  );
}
