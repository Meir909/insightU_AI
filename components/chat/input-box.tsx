"use client";

import {
  ArrowUp,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Mic,
  Paperclip,
  Presentation,
  StopCircle,
  Video,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatAttachment } from "@/lib/types";

const MAX_RECORDING_SECONDS = 180;

type InputBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  attachments: ChatAttachment[];
  loading: boolean;
  uploading: boolean;
  disabled?: boolean;
};

function docIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["xls", "xlsx", "csv"].includes(ext))
    return <FileSpreadsheet className="h-7 w-7 shrink-0 text-emerald-400" />;
  if (["ppt", "pptx"].includes(ext))
    return <Presentation className="h-7 w-7 shrink-0 text-orange-400" />;
  return <FileText className="h-7 w-7 shrink-0 text-brand-green" />;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} мин ${s} сек` : `${s} сек`;
}

export function InputBox({
  value,
  onChange,
  onSubmit,
  onFilesSelected,
  onRemoveAttachment,
  attachments,
  loading,
  uploading,
  disabled,
}: InputBoxProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [processingVoice, setProcessingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Hide "processing" banner once first audio chip appears
  useEffect(() => {
    if (processingVoice && attachments.some((a) => a.kind === "audio")) {
      setProcessingVoice(false);
    }
  }, [attachments, processingVoice]);

  const startRecording = async () => {
    if (disabled || loading || uploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        const file = new File([blob], `voice-memo-${Date.now()}.${ext}`, { type: mimeType });

        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          onFilesSelected(dt.files);
        } catch {
          const pseudo = {
            0: file, length: 1,
            item: (i: number) => (i === 0 ? file : null),
            [Symbol.iterator]: function* () { yield file; },
          } as unknown as FileList;
          onFilesSelected(pseudo);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) { stopRecording(); return s + 1; }
          return s + 1;
        });
      }, 1000);
    } catch {
      // mic denied
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
    setProcessingVoice(true);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-[20px] border border-white/8 bg-bg-surface transition-shadow duration-200 focus-within:border-brand-green/25 focus-within:shadow-green-sm">

      {/* ── Rich attachment previews ── */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-white/6 px-4 py-3">
          {attachments.map((a) => {
            const isUploading = a.status === "uploading";

            /* IMAGE */
            if (a.mimeType?.startsWith("image/") && a.localPreviewUrl) {
              return (
                <div key={a.id} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.localPreviewUrl} alt={a.name} className="h-full w-full object-cover" />
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <LoaderCircle className="h-5 w-5 animate-spin text-brand-green" />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(a.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      ><X className="h-3 w-3" /></button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                        <p className="truncate text-[9px] text-white/80">Фото</p>
                      </div>
                    </>
                  )}
                </div>
              );
            }

            /* VIDEO */
            if (a.kind === "video" && a.localPreviewUrl) {
              return (
                <div key={a.id} className="group relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={a.localPreviewUrl} className="h-full w-full object-cover opacity-80" preload="metadata" muted />
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <LoaderCircle className="h-5 w-5 animate-spin text-brand-green" />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(a.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      ><X className="h-3 w-3" /></button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="flex items-center gap-1 text-[9px] text-white/80"><Video className="h-2.5 w-2.5" /> Видео</p>
                      </div>
                    </>
                  )}
                </div>
              );
            }

            /* AUDIO */
            if (a.kind === "audio") {
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-brand-green/20 bg-brand-green/6 px-4 py-3">
                  <div className="flex items-end gap-[2px]">
                    {[3, 6, 9, 6, 4, 8, 5, 7, 3, 6].map((h, i) => (
                      <span
                        key={i}
                        className="w-[2px] rounded-full bg-brand-green"
                        style={{
                          height: `${h * 2}px`,
                          opacity: isUploading ? 0.4 : 0.8,
                          animation: isUploading ? "waveBar 0.8s ease-in-out infinite alternate" : "none",
                          animationDelay: `${i * 60}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-brand-green">
                      {isUploading ? "Голосовое записывается…" : "Голосовое сообщение принято"}
                    </span>
                    {a.localDurationSec !== undefined && (
                      <span className="text-[10px] text-brand-green/60">{formatDuration(a.localDurationSec)}</span>
                    )}
                    {isUploading && <span className="text-[10px] text-brand-green/50">обрабатывается…</span>}
                  </div>
                  {isUploading ? (
                    <LoaderCircle className="ml-auto h-4 w-4 shrink-0 animate-spin text-brand-green/60" />
                  ) : (
                    <button type="button" onClick={() => onRemoveAttachment(a.id)}
                      className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-text-muted transition hover:bg-red-500/15 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            }

            /* DOCUMENT / FILE (fallback) */
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-bg-elevated px-4 py-3">
                {isUploading
                  ? <LoaderCircle className="h-7 w-7 shrink-0 animate-spin text-brand-green" />
                  : docIcon(a.name)}
                <div className="flex max-w-[140px] flex-col">
                  <span className="truncate text-xs font-semibold text-white">{a.name}</span>
                  <span className="text-[10px] text-text-muted">
                    {isUploading ? "загружается…" : a.sizeKb ? `${a.sizeKb} кб` : "документ"}
                  </span>
                </div>
                {!isUploading && (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green/50" />
                    <button type="button" onClick={() => onRemoveAttachment(a.id)}
                      className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-text-muted transition hover:bg-red-500/15 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recording active bar ── */}
      {isRecording && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
          <span className="text-xs font-semibold text-red-400">Запись {fmt(recordingSeconds)}</span>
          <span className="ml-auto text-[10px] text-text-muted">макс. {fmt(MAX_RECORDING_SECONDS)}</span>
        </div>
      )}

      {/* ── Voice processing banner ── */}
      {processingVoice && !isRecording && (
        <div className="flex items-center gap-2 border-b border-brand-green/15 bg-brand-green/5 px-4 py-2">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-green" />
          <span className="text-xs font-medium text-brand-green">Голосовое сообщение записано — обрабатывается…</span>
        </div>
      )}

      <style>{`
        @keyframes waveBar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
      `}</style>

      {/* ── Input row ── */}
      <div className="flex items-end gap-2 px-3 py-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx"
          disabled={disabled || uploading || isRecording}
          onChange={(e) => { if (e.target.files?.length) onFilesSelected(e.target.files); e.currentTarget.value = ""; }}
          className="hidden"
        />

        <button type="button" aria-label="Прикрепить файл"
          disabled={disabled || uploading || isRecording}
          onClick={() => fileInputRef.current?.click()}
          title="Прикрепить файл (фото, PDF, документ, видео…)"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-bg-elevated text-text-muted transition-all hover:border-brand-green/25 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>

        <button type="button"
          disabled={disabled || loading || uploading}
          onClick={isRecording ? stopRecording : () => void startRecording()}
          aria-label={isRecording ? "Остановить запись" : "Записать голосовое сообщение"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
            isRecording
              ? "border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25"
              : "border-white/8 bg-bg-elevated text-text-muted hover:border-brand-green/25 hover:text-brand-green"
          }`}
        >
          {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <textarea autoFocus rows={1} value={value}
          disabled={disabled || isRecording}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          placeholder={isRecording ? "Говорите — запись идёт…" : processingVoice ? "Голосовое сообщение обрабатывается…" : "Напишите ответ…"}
          className="min-h-[40px] max-h-36 flex-1 resize-none bg-transparent py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-text-muted disabled:opacity-50"
        />

        <button type="button"
          disabled={disabled || loading || uploading || processingVoice || isRecording || (!value.trim() && attachments.length === 0)}
          onClick={onSubmit}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-black transition-all hover:bg-brand-dim hover:shadow-green-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
