"use client";
import { useLocalRuntime, AssistantRuntimeProvider, type ChatModelAdapter, type ThreadMessageLike } from "@assistant-ui/react";
import {Thread} from "@/components/assistant-ui/thread";
import { useState, useRef, useEffect } from "react";
import { Draft } from "./RecordWizard";
import { AiLang } from "./RecordWizard";
import { ArrowLeft, CheckCircle, Languages, Mic, MicOff } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";


interface Message {
  role: "user" | "assistant";
  content: string;
}
interface Props {
  draft: Draft;
  aiLang: AiLang;
  onBack: ()=>void;
  onLangChange: (lang: AiLang) => void;
  onComplete: (messages: Message[] | null) => void;
  saveDraft: (data: {
    draftId: string;
    currentStep?: number;
    conversationMessages?: Message[] | null;
  }) => Promise<void>;
  initalMessages?: Message[] | null;
}
type RecordState = "idle" | "recording" | "processing";
export default function Step2Voice2({ draft, aiLang, saveDraft,initalMessages, onBack, onComplete, onLangChange }: Props) {

  // 录音相关的state和ref
  const [recordState, setRecordState] = useState<RecordState>("idle"); // ui显示状态
  const mediaRecorderRef = useRef<MediaRecorder |null>(null); // 录音器，浏览器api
  const recordingStreamRef = useRef<MediaStream|null>(null); // 录音流 麦克风实时声音
  const chunksRef = useRef<Blob[]>([]); // 录音块 

  // TTS相关的state和ref
  const audioRef = useRef<HTMLAudioElement|null>(null); // 用来播放tts的音频
  const ttsUrlRef = useRef<string|null>(null); // tts的资源
  const [isMuted, setIsMuted] = useState(false); // 静音
  const isMutedRef = useRef(false); // 获取到即时状态

 
  //开始录音
  const startRecording = async () => { 
    // stream 音频流
    const stream = await navigator.mediaDevices.getUserMedia({audio: true}); // 获取麦克风权限
    const mr = new MediaRecorder(stream); //把流传给录音器
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = async ()=>{ // 定义停止录音时回调
      stream.getTracks().forEach((t) => t.stop());// 停止每条轨道
      const blob = new Blob(chunksRef.current, {type:"audio/webm"});
      await handleAudioBlob(blob); // 处理录音块
    }
    mr.start(); // 开始录音
    mediaRecorderRef.current = mr;
    recordingStreamRef.current = stream;
    setRecordState("recording"); // 更新ui状态
  }
  function stopRecording(){
    mediaRecorderRef.current?.stop();
    setRecordState("processing");
  }
  async function handleAudioBlob(blob: Blob){
    try{
      const form = new FormData();
      form.append("audio",blob,"recording.webm");
      const res = await fetch("/api/record/transcribe",{method: "POST",body: form});
      if(!res.ok) throw new Error("Transcription failed");
      const {text} = await res.json();
      // 如果文本不为空，则调用ai接口
      if(text.trim()) await sendTextAsUser(text); // 用runtime发送
    } catch{
      // ignore
    } finally {
      setRecordState("idle");
    }
  }
  function handleMicClick(){
    if(recordState === "idle") startRecording();
    else if(recordState === "recording") stopRecording();
  }
  function sendTextAsUser(text: string){
    runtime.thread.append({
      role: "user",
      content: [{type:"text", text}],
    })
  }

  // 适配器
  const adapter: ChatModelAdapter = {
    // 当用户发消息时（需要ai信息的时候），调用这个方法
    // 加了 * 号变成 async generator，这样就能用 yield 逐步返回数据
    async *run({messages, abortSignal}){
      // 把messages转换为给模型的apiMessages
      const apiMessages = messages.map((m)=>({
        role: m.role,
        content: m.content
        .filter((c)=>c.type === "text")
        .map((c)=>c.text) //提取文本
        .join("") // 如何拼接
      }));

      // 调用api/record/chat接口
      const res = await fetch("/api/record/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          messages: apiMessages,
          photoUrl: draft.photoUrl,
          isFirst: apiMessages.filter((m) => m.role === "assistant").length === 0,
          aiLang,
        }),
        signal: abortSignal,
      });
      if(!res.ok) throw new Error("Chat failed");


      // ---读取流---
      // res.body 是 ReadableStream，需要用 ReadableStreamReader 读取
      // 用reader一块一块读取数据，每次读取一块数据就yield出去
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();// 把字节转回字符串（跟后端的 encoder 对应）
      let fullText = "";
      while(true){
        // 读取一块数据
        // done: 是否读完了
        const {done, value} = await reader.read();
        if(done) break;
        const text = decoder.decode(value, {stream: true});
        const lines = text.split("\n");
        for(const line of lines){
          if(!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();//
          if(data === "[DONE]") break;
          try{
            const chunk = JSON.parse(data);
            fullText += chunk.chunk;
            yield {content: [{type: "text", text: fullText}]};
          } catch(e){
            console.error(e);
          }
        }
      }

      // 模型说话
      if(!isMutedRef.current&&fullText.trim()){
        const ttsRes = await fetch("/api/record/tts",{
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({text: fullText}),
        });
        if(ttsRes.ok&&!isMutedRef.current){
          const blob = await ttsRes.blob();
          const url = URL.createObjectURL(blob);
          ttsUrlRef.current = url;
          if(audioRef.current) audioRef.current.src = url;
          audioRef.current?.play();
        }
      }
      // 保存对话
      const allMessages = [
        ...apiMessages,
        {role: "assistant", content: fullText},
      ]
      saveDraft({
        draftId: draft.id,
        currentStep: 1,
        conversationMessages: allMessages as Message[],
      }).catch((e) => console.error(e));
      // 前端ui需要的格式
      yield {
        content: [{type: "text" as const, text: fullText}]
      }
    }
  }
   // initalMessage
  const convertedInitalMessages: ThreadMessageLike[] = initalMessages?.map((m)=>({
    role: m.role as "user" | "assistant",
    content: [{type: "text", text: m.content}],
  })) || [];


  const runtime = useLocalRuntime(adapter,{
    initialMessages: convertedInitalMessages,
  });
  function releaseMedia(){
    const mr = mediaRecorderRef.current;
    if(mr&&mr.state !== "inactive"){
      mr.onstop = null; 
      mr.stop();
    }
    mediaRecorderRef.current = null;
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordingStreamRef.current = null;
    // 释放tts资源
    if(ttsUrlRef.current){
      URL.revokeObjectURL(ttsUrlRef.current);
      ttsUrlRef.current = null;
    }
    //停止audio
    if(audioRef.current){
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }

  function toggleMute(){
    isMutedRef.current = !isMutedRef.current;
    if(isMutedRef.current&&audioRef.current){
      audioRef.current.pause();
      audioRef.current.src = "";
      if(ttsUrlRef.current) URL.revokeObjectURL(ttsUrlRef.current);
      ttsUrlRef.current = null;
    }
    setIsMuted((prev) => !prev);
  }
  
  function getCurrentMessages(){
    const threadMessages = runtime.thread.getState().messages;
    return threadMessages
         .filter((m)=> m.role === "user" || m.role === "assistant")
         .map((m)=>({
          role: m.role as "user" | "assistant",
          content: m.content
          .filter((c)=>c.type === "text")
          .map((c)=>(c as {type: "text"; text: string}).text)
          .join("")
         }))
  }
  async function handleFinishConversation(){
    const messages = getCurrentMessages();
    try{
      await saveDraft({
        draftId: draft.id,
        currentStep: 1,
        conversationMessages: messages as unknown as Message[],
      });
      releaseMedia();
      onComplete(messages as unknown as Message[]);
    } catch(e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Save failed");
    }
  }



  useEffect(()=>{
    // 释放媒体资源
    return ()=>{
      releaseMedia();
    }

  },[])
  const isRecording = recordState === "recording";
  const isProcessing = recordState === "processing";

  return (
    <div >

      {/* back按钮 */}
      <button
        type='button'
        onClick={()=>{onBack();releaseMedia();}}
        className='flex items-center gap-2 text-lg font-semibold text-slate-600 hover:text-[#0f58bd] transition-colors'>
          <ArrowLeft className="w-4 h-4" />
          返回照片
       </button>
      <div className="mb-8 mt-4">
        <h1 className="text-3xl mb-2 md:text-4xl font-black text-slate-900 mb-2">
          第二步：AI语音对话
        </h1>
        <div className="flex">
        <p className="text-slate-500 text-lg">
          告诉Echo关于这个时刻的故事。它正在倾听你的故事。
        </p>
        {/* 语言切换 */}
        <div className="flex items-center gap-2 ml-auto">
          <Languages className="w-4 h-4 text-slate-500"/>
          <span className="text-xs text-slate-500">模型语言</span>
          <Select value={aiLang} onValueChange={(value)=>onLangChange(value as AiLang)}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue>{aiLang === "zh-CN" ? "简体中文" : "English"}</SelectValue>
            </SelectTrigger>
            <SelectContent align='center' className="min-w-[9rem]">
              <SelectItem value="zh-CN">简体中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </div>
      </div>

      {/* 音频播放（隐藏） */}
      <audio ref={audioRef} className="hidden" />

      {/* 主体 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* 左：照片 */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-2 shadow-sm border border-slate-200">
            <div className="h-[384px] w-full rounded-lg bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${draft.photoUrl})` }} />
          </div>
        <div className="flex items-center gap-2 px-2 mt-2">
          <span className="text-slate-400 text-sm">📷</span>
          <p className="text-sm text-slate-500 italic">今日照片</p>
        </div>
        </div>

      {/* 右：语音界面 */}
      <div className="flex flex-col gap-6">
        {/* 语音对话界面 */}
        <div className="h-[400px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <AssistantRuntimeProvider runtime={runtime}>
            <Thread />
          </AssistantRuntimeProvider>
        </div>
        {/* 录音button */}
        <div className="flex items-center justify-center gap-2">
          {/* 静音button */}
          <button
            type='button'
            onClick={toggleMute}
            className="flex flex1 items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-sm active:scale-95">
            <MicOff className="w-5 h-5" />
            {isMuted ? "Unmute" : "Mute"}
          </button>
          {/* 录音button */}
          <button 
            type='button'
            onClick={handleMicClick}
            disabled={isProcessing}
            className={`flex-[1.5] flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl transition-all text-sm text-white disabled:opacity-50 active:scale-95 hover:brightness-110 ${
              isRecording ? "bg-red-500 hover:bg-red-600" : ""
            }`}
            style={!isRecording ? { backgroundColor: "#0f58bd" } : {}}>
            <Mic className="w-5 h-5" />
            {isRecording ? "Stop": isProcessing ? "Processing…" : "Speak"} 
          </button>
          {/* 完成对话button */}
          <button
            type='button'
            onClick={handleFinishConversation}
            // disabled={runtime.thread.getState().messages.length ===0}
            className="flex-[1.5] flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl transition-all text-sm text-white disabled:opacity-40 shadow-sm active:scale-95 hover:brightness-110"
            style={{ backgroundColor: "#0f58bd", boxShadow: "0 4px 14px rgba(15,88,189,0.2)" }}
          >
            <CheckCircle className="w-5 h-5" />
            完成对话
          </button>
        </div>
      </div>
    </div>
    </div>

  );
}