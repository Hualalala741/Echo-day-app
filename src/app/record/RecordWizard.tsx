"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, Mic, Moon, Sun } from "lucide-react";
import dynamic from "next/dynamic";
import { useThemeStore } from "@/store/useThemeStore";

const Step1Photo = dynamic(() => import("./Step1Photo"), {
  loading: () => <StepSkeleton />,
});
const Step2Voice2 = dynamic(() => import("./Step2Voice2"), {
  loading: () => <StepSkeleton />,
});
const Step3Review = dynamic(() => import("./Step3Review"), {
  loading: () => <StepSkeleton />,
});
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export type Draft = {
  id: string;
  photoUrl: string;
  conversationMessages?: Message[] | null;
  diaryText?: string | null;
  valence?: number | null;
  arousal?: number | null;
  musicSearchQuery?: string | null;
  musicReason?: string | null;
};

export type GeneratedContent = {
  diaryText: string;
  valence: number;
  arousal: number;
  musicSearchQuery: string;
  musicReason: string;
};


function normalizeConversationMessages(raw: unknown): Message[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: Message[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if ((o.role === "user" || o.role === "assistant") && typeof o.content === "string") {
      out.push({ role: o.role, content: o.content });
    }
  }
  return out.length > 0 ? out : null;
}

interface Props {
  userId: string;
  existingDraft: {
    id: string;
    status: string;
    photoUrl: string;
    currentStep: number;
    conversationMessages: unknown;
    diaryText: string | null;
    valence: number | null;
    arousal: number | null;
    musicSearchQuery: string | null;
    musicReason: string | null;
  } | null;
  userImage: string | null;
  userPreferredLang: 'en' | 'zh' | null;
}

const STEPS = ["Photo Upload", "AI Voice Conversation", "Review & Music"];

export default function RecordWizard({ userId, userImage, userPreferredLang, existingDraft}: Props) {
  const router = useRouter();
  const initialStep = Math.min(existingDraft?.currentStep ?? 0, 2);
  const [step, setStep] = useState(initialStep);
  const [aiLang, setAiLang] = useState(userPreferredLang ?? 'en');
  const {theme, toggleTheme} = useThemeStore();
  const [draft, setDraft] = useState<Draft | null>(
    existingDraft
      ? {
          id: existingDraft.id,
          photoUrl: existingDraft.photoUrl,
          conversationMessages: normalizeConversationMessages(existingDraft.conversationMessages),
          diaryText: existingDraft.diaryText,
          valence: existingDraft.valence,
          arousal: existingDraft.arousal,
          musicSearchQuery: existingDraft.musicSearchQuery,
          musicReason: existingDraft.musicReason,
        }
      : null
  );
  function handleClose() {
    router.push("/home");
  }
  const saveDraft = useCallback(
    async (data: {
      draftId: string;
      currentStep?: number;
      conversationMessages?: Message[] | null;
      diaryText?: string | null;
      valence?: number | null;
      arousal?: number | null;
      musicSearchQuery?: string | null;
      musicReason?: string | null;
    }) => {
      const payload: Record<string, unknown> = { draftId: data.draftId };
      if (data.currentStep !== undefined) payload.currentStep = data.currentStep;
      if (data.conversationMessages !== undefined) payload.conversationMessages = data.conversationMessages;
      if (data.diaryText !== undefined) payload.diaryText = data.diaryText;
      if (data.valence !== undefined) payload.valence = data.valence;
      if (data.arousal !== undefined) payload.arousal = data.arousal;
      if (data.musicSearchQuery !== undefined) payload.musicSearchQuery = data.musicSearchQuery;
      if (data.musicReason !== undefined) payload.musicReason = data.musicReason;
      const res = await fetch("/api/record/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Save failed");
      }
      setDraft((prev) => {
        if (!prev || prev.id !== data.draftId) return prev;
        const next = { ...prev };
        if (data.conversationMessages !== undefined) {
          next.conversationMessages = data.conversationMessages;
        }
        if (data.diaryText !== undefined) next.diaryText = data.diaryText;
        if (data.valence !== undefined) next.valence = data.valence;
        if (data.arousal !== undefined) next.arousal = data.arousal;
        if (data.musicSearchQuery !== undefined) next.musicSearchQuery = data.musicSearchQuery;
        if (data.musicReason !== undefined) next.musicReason = data.musicReason;
        return next;
      });
    },
    []
  );

  const handleBackFromReview = useCallback(async () => {
    if (!draft) return;
    await saveDraft({
      draftId: draft.id,
      currentStep: 1,
      diaryText: null,
      valence: null,
      arousal: null,
      musicSearchQuery: null,
      musicReason: null,
    });
    setStep(1);
  }, [draft, saveDraft]);

  function handleStep2Complete(messages: Message[] | null){
    setDraft((prev) => prev ? { ...prev, conversationMessages: messages } : prev);
    setStep(2);
  }
  useEffect(() => {
    //当前页面要关闭时，自动保存草稿
    // draft或step变化，自动触发
    const handleBeforeUnload = () => {
      if (!draft) return;
      const payload: Record<string, unknown> = { draftId: draft.id, currentStep: step };
      // Step2 内对话由子组件 saveDraft 写库；父级 conversationMessages 易滞后，beacon 勿覆盖
      if (step !== 1 && draft.conversationMessages != null) {
        payload.conversationMessages = draft.conversationMessages;
      }
      navigator.sendBeacon("/api/record/save-draft", JSON.stringify(payload));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return ()=>window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [draft, step]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 md:px-10 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mic className="w-6 h-6 text-brand"/>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Echo Day</h2>
        </div>
        <div className="flex items-center gap-2">
        <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        {/* Stepper */}
        <div className="flex flex-wrap items-center gap-2 mb-8 text-sm">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <span key={i} className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 font-medium ${
                    active ? "font-bold" : done ? "text-slate-400" : "text-slate-400"
                  }`}
                  style={active ? { color: "#0f58bd" } : {}}
                >
                  {done && <CheckCircle className="w-4 h-4 text-brand"/>}
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="text-slate-300">/</span>
                )}
              </span>
            );
          })}
        </div>

        {/* Steps */}
        {step === 0 && (
          <Step1Photo
            userId={userId}
            existingPhotoUrl={existingDraft?.photoUrl ?? null}
            existingDraftId={existingDraft?.id ?? null}
            onComplete={(d) => {
              setDraft(d);
              setStep(1);
              void saveDraft({ draftId: d.id, currentStep: 0 }).catch((e) => {
                console.error(e);
                alert(e instanceof Error ? e.message : "Save failed");
              });
            }}
          />
        )}
        {step === 1 && draft && (
          <Step2Voice2
            aiLang={aiLang}
            // onLangChange={setAiLang}
            draft={draft}
            saveDraft={saveDraft}
            onBack={()=>setStep(0)}
            onLangChange={(lang)=>{setAiLang(lang); fetch('/api/user/preferences', {
              method: 'PATCH',
              body: JSON.stringify({preferredLang: lang}),
            }).catch(error => {
              console.error(error);
              alert((error as Error).message);
            });}}
            onComplete={handleStep2Complete}
            initalMessages={draft.conversationMessages}
          />
        )}
        {step === 2 && draft && (
          <Step3Review
            draft={draft}
            aiLang={aiLang}
            onBack={handleBackFromReview}
            onComplete={(entryId) => router.push(`/diary/${entryId}?new=true`)}
            saveDraft={saveDraft}
          />
        )}
      </main>
    </div>
  );
}
function StepSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-1/3 bg-muted rounded" />
      <div className="h-64 bg-muted rounded-xl" />
      <div className="h-4 w-2/3 bg-muted rounded" />
    </div>
  );
}