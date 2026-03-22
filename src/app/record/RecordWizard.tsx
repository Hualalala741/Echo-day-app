"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, Mic } from "lucide-react";
import Step1Photo from "./Step1Photo";
import Step2Voice from "./Step2Voice";
import Step3Review from "./Step3Review";
import Step4Music from "./Step4Music";

export type Draft = {
  id: string;
  photoUrl: string;
  transcript?: string | null;
};

export type GeneratedContent = {
  diaryText: string;
  valence: number;
  arousal: number;
  musicSearchQuery: string;
  musicReason: string;
};

interface Props {
  userId: string;
  existingDraft: { id: string; status: string; photoUrl: string; transcript: string | null } | null;
}

const STEPS = ["Photo Upload", "AI Voice Conversation", "Review", "Finalize"];

export default function RecordWizard({ userId, existingDraft }: Props) {
  const router = useRouter();

  const initialStep = existingDraft?.photoUrl ? 1 : 0;
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState<Draft | null>(
    existingDraft ? { id: existingDraft.id, photoUrl: existingDraft.photoUrl, transcript: existingDraft.transcript } : null
  );
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);

  function handleClose() {
    router.push("/home");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f7f8" }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 md:px-10 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mic className="w-6 h-6" style={{ color: "#0f58bd" }} />
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Echo Day</h2>
        </div>
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
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
                  {done && <CheckCircle className="w-4 h-4" style={{ color: "#0f58bd" }} />}
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
            onComplete={(d) => { setDraft(d); setStep(1); }}
          />
        )}
        {step === 1 && draft && (
          <Step2Voice
            draft={draft}
            onComplete={(transcript) => {
              setDraft((prev) => prev ? { ...prev, transcript } : prev);
              setStep(2);
            }}
          />
        )}
        {step === 2 && draft && (
          <Step3Review
            draft={draft}
            onComplete={(content) => { setGenerated(content); setStep(3); }}
          />
        )}
        {step === 3 && draft && generated && (
          <Step4Music
            draft={draft}
            generated={generated}
            onComplete={(entryId) => router.push(`/diary/${entryId}?new=true`)}
          />
        )}
      </main>
    </div>
  );
}
