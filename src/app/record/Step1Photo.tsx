"use client";

import { useState, useRef } from "react";
import { ImagePlus, X, Upload } from "lucide-react";
import type { Draft } from "./RecordWizard";

interface Props {
  userId: string;
  existingPhotoUrl: string | null;
  /** 今日草稿 id；用已有照片继续时必须带上，否则 save-draft 会缺 draftId */
  existingDraftId: string | null;
  onComplete: (draft: Draft) => void;
}

export default function Step1Photo({ existingPhotoUrl, existingDraftId, onComplete }: Props) {

  const [preview, setPreview] = useState<string | null>(existingPhotoUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const needsUpload = file !== null;


  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if(!f) return;
    if(preview&&!existingPhotoUrl) { URL.revokeObjectURL(preview); }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    if(inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }
  
  function clearPhoto() {
    if(preview && preview!==existingPhotoUrl) { URL.revokeObjectURL(preview); }
    setPreview(null);
    setFile(null);
    setError(null);
  }


  async function handleUpload() {
    // 如果没选新文件，说明用的是已有图片，直接跳过上传
    if (!needsUpload && existingPhotoUrl) {
      if (!existingDraftId) {
        setError("Missing draft id; please re-upload the photo.");
        return;
      }
      onComplete({ id: existingDraftId, photoUrl: existingPhotoUrl });
      return;
    }
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/record/upload-photo", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data: Draft = await res.json();
      onComplete({ id: data.id, photoUrl: data.photoUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">Step 1: Photo Upload</h1>
        <p className="text-slate-500 text-lg">Choose a photo that represents your day.</p>
      </div>

      <div className="max-w-lg">
        {/* Drop zone / preview */}
        <div
        // 没有图片时，点击可以上传
          onClick={() => !preview && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`relative rounded-xl border-2 border-dashed overflow-hidden transition-colors ${
            preview ? "border-transparent cursor-default" : "border-slate-300 hover:border-[#0f58bd] cursor-pointer bg-white"
          }`}
          style={{ minHeight: 300 }}
        >
          {preview ? (
            <div className="relative">
              <div className = "flex items-center justify-center bg-slate-50 rounded-xl" style={{minHeight: 200, maxHeight: 400 }}>
                <img 
                src={preview} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain rounded-xl" 
                style={{ maxHeight: 400 }}
                />
              </div>
              <button
                onClick={(e)=>{e.stopPropagation();clearPhoto()}}
                className="absolute top-3 right-3 bg-white/80 rounded-lg p-1 text-[#0f58bd] hover:bg-slate-300 transition-color">
                  <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <ImagePlus className="w-7 h-7" style={{ color: "#0f58bd" }} />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Drop a photo here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse</p>
              </div>
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {/* Actions */}
        <div className="flex gap-3 mt-4">
    
          <button
            onClick={preview ? handleUpload : () => inputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-white text-sm font-bold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#0f58bd" }}
          >
            {uploading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Uploading…" : preview ? "Continue" : "Select Photo"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
