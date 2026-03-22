"use client";

import { useState, useRef, useEffect } from "react";
import { MicOff, CheckCircle, Mic, Send } from "lucide-react";
import type { Draft } from "./RecordWizard";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  draft: Draft;
  onComplete: (transcript: string) => void;
}

type RecordState = "idle" | "recording" | "processing";

export default function Step2Voice({ draft, onComplete }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Kick off first AI greeting on mount
  useEffect(() => {
    sendToAI([], true);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isAiThinking]);

  async function sendToAI(history: Message[], isFirst = false) {
    setIsAiThinking(true);
    try {
      const res = await fetch("/api/record/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, photoUrl: draft.photoUrl, isFirst }),
      });
      if (!res.ok) throw new Error("Chat failed");
      const { reply } = await res.json();
      const aiMsg: Message = { role: "assistant", content: reply };
      setMessages((prev) => [...prev, aiMsg]);

      // TTS if not muted
      if (!isMuted) {
        const ttsRes = await fetch("/api/record/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: reply }),
        });
        if (ttsRes.ok) {
          const blob = await ttsRes.blob();
          const url = URL.createObjectURL(blob);
          if (audioRef.current) audioRef.current.src = url;
          audioRef.current?.play();
        }
      }
    } catch {
      // silently ignore
    } finally {
      setIsAiThinking(false);
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await handleAudioBlob(blob);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecordState("recording");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecordState("processing");
  }

  async function handleAudioBlob(blob: Blob) {
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/record/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error("Transcription failed");
      const { text } = await res.json();
      if (text.trim()) await handleUserMessage(text);
    } catch {
      // ignore
    } finally {
      setRecordState("idle");
    }
  }

  async function handleUserMessage(text: string) {
    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    await sendToAI(updated);
  }

  async function handleTextSend() {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    await handleUserMessage(text);
  }

  function handleMicClick() {
    if (recordState === "idle") startRecording();
    else if (recordState === "recording") stopRecording();
  }

  function buildTranscript() {
    return messages.map((m) => `${m.role === "user" ? "Me" : "Echo"}: ${m.content}`).join("\n\n");
  }

  const isRecording = recordState === "recording";
  const isProcessing = recordState === "processing";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Step 2: AI Voice Conversation</h1>
        <p className="text-slate-500 text-lg">Tell Echo about this moment. It's listening to your story.</p>
      </div>

      <audio ref={audioRef} className="hidden" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: photo */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-2 shadow-sm border border-slate-200">
            <div className="aspect-[4/3] w-full rounded-lg bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${draft.photoUrl})` }} />
          </div>
          <div className="flex items-center gap-2 px-2">
            <span className="text-slate-400 text-sm">📷</span>
            <p className="text-sm text-slate-500 italic">Your photo for today</p>
          </div>
        </div>

        {/* Right: voice interface */}
        <div className="flex flex-col gap-6">
          {/* Waveform / status */}
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[160px]">
            {isRecording ? (
              <>
                <WaveformBars active />
                <p className="text-xs font-bold uppercase tracking-widest mt-4 animate-pulse" style={{ color: "#0f58bd" }}>
                  Listening…
                </p>
              </>
            ) : isProcessing ? (
              <>
                <WaveformBars active={false} />
                <p className="text-xs font-bold uppercase tracking-widest mt-4 text-slate-400">Transcribing…</p>
              </>
            ) : isAiThinking ? (
              <>
                <WaveformBars active={false} />
                <p className="text-xs font-bold uppercase tracking-widest mt-4 animate-pulse" style={{ color: "#0f58bd" }}>
                  Echo is thinking…
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Press the mic to speak</p>
            )}
          </div>

          {/* Transcript */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Live Transcription</h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div ref={scrollRef} className="p-4 space-y-4 max-h-72 overflow-y-auto">
                {messages.length === 0 && !isAiThinking && (
                  <p className="text-sm text-slate-400 text-center py-4">Conversation will appear here…</p>
                )}
                {messages.map((m, i) =>
                  m.role === "assistant" ? (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                        style={{ backgroundColor: "#dbeafe", color: "#0f58bd" }}>E</div>
                      <div className="bg-slate-50 rounded-2xl rounded-tl-none p-3 text-sm text-slate-700 leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-3 justify-end">
                      <div className="rounded-2xl rounded-tr-none p-3 text-sm text-slate-700 leading-relaxed border"
                        style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}>
                        {m.content}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-500 text-sm">
                        M
                      </div>
                    </div>
                  )
                )}
                {isAiThinking && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                      style={{ backgroundColor: "#dbeafe", color: "#0f58bd" }}>E</div>
                    <div className="bg-slate-50 rounded-2xl rounded-tl-none p-3 flex gap-1 items-center">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Text input */}
              <div className="border-t border-slate-100 flex items-center gap-2 px-3 py-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
                  placeholder="Or type here…"
                  className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent"
                />
                <button onClick={handleTextSend} disabled={!textInput.trim()}
                  className="text-slate-400 hover:text-[#0f58bd] disabled:opacity-40 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted((m) => !m)}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-sm"
            >
              <MicOff className="w-5 h-5" />
              {isMuted ? "Unmute" : "Mute"}
            </button>

            <button
              onClick={handleMicClick}
              disabled={isProcessing || isAiThinking}
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl transition-all shadow-sm text-sm text-white disabled:opacity-50 ${
                isRecording ? "bg-red-500 hover:bg-red-600" : ""
              }`}
              style={!isRecording ? { backgroundColor: "#0f58bd" } : {}}
            >
              <Mic className="w-5 h-5" />
              {isRecording ? "Stop" : isProcessing ? "Processing…" : "Speak"}
            </button>

            <button
              onClick={() => onComplete(buildTranscript())}
              disabled={messages.length === 0}
              className="flex-[2] flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl transition-all text-sm text-white disabled:opacity-40"
              style={{ backgroundColor: "#0f58bd", boxShadow: "0 4px 14px rgba(15,88,189,0.2)" }}
            >
              <CheckCircle className="w-5 h-5" />
              Finish Conversation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaveformBars({ active }: { active: boolean }) {
  const heights = [16, 32, 48, 64, 40, 56, 24, 48, 16, 40, 64, 32, 56];
  return (
    <div className="flex items-end gap-1 h-16">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm transition-all ${active ? "animate-pulse" : "opacity-30"}`}
          style={{
            height: active ? h : h * 0.4,
            backgroundColor: "#0f58bd",
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}
