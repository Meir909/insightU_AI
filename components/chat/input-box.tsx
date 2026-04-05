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

// ── Local preview entry ──────────────────────────────────────────────────────
type PreviewEntry = {
  objectUrl: string;   // blob URL (image or video)
  kind: "image" | "video" | "audio" | "doc";
  durationSec?: number; // for audio
};

function docIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet className="h-7 w-7 shrink-0 text-emerald-400" />;
  if (["ppt", "pptx"].includes(ext)) return <Presentation className="h-7 w-7 shrink-0 text-orange-400" />;
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

  // local preview map: attachmentId → PreviewEntry
  const previewMapRef = useRef<Map<string, PreviewEntry>>(new Map());
  const [, forceUpdate] = useState(0); // trigger re-render after preview is built

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Build previews for new attachments ────────────────────────────────────
  useEffect(() => {
    let changed = false;

    // Clean up previews for removed attachments
    const currentIds = new Set(attachments.map((a) => a.id));
    for (const [id, entry] of previewMapRef.current.entries()) {
      if (!currentIds.has(id)) {
        URL.revokeObjectURL(entry.objectUrl);
        previewMapRef.current.delete(id);
        changed = true;
      }
    }

    if (changed) forceUpdate((n) => n + 1);
  }, [attachments]);

  // ── Voice processing banner auto-hide ─────────────────────────────────────
  useEffect(() => {
    if (processingVoice && attachments.some((a) => a.kind === "audio")) {
      setProcessingVoice(false);
    }
  }, [attachments, processingVoice]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      for (const entry of previewMapRef.current.values()) {
        URL.revokeObjectURL(entry.objectUrl);
      }
    };
  }, []);

  // ── Register preview for a file (called from onFilesSelected wrapper) ─────
  const registerFilePreviews = (files: FileList | null) => {
    if (!files?.length) return;
    let didChange = false;

    Array.from(files).forEach((file) => {
      // We use a temp id based on name+size to match later against the attachment
      // The real attachment id comes from the server, so we store by file identity
      const tempKey = `pending-${file.name}-${file.size}`;
      if (previewMapRef.current.has(tempKey)) return;

      const objectUrl = URL.createObjectURL(file);

      if (file.type.startsWith("image/")) {
        previewMapRef.current.set(tempKey, { objectUrl, kind: "image" });
        didChange = true;
      } else if (file.type.startsWith("video/")) {
        previewMapRef.current.set(tempKey, { objectUrl, kind: "video" });
        didChange = true;
      } else if (file.type.startsWith("audio/")) {
        // Get audio duration
        const audio = new Audio(objectUrl);
        audio.addEventListener("loadedmetadata", () => {
          const existing = previewMapRef.current.get(tempKey);
          if (existing) {
            existing.durationSec = audio.duration;
            forceUpdate((n) => n + 1);
          }
        });
        previewMapRef.current.set(tempKey, { objectUrl, kind: "audio", durationSec: undefined });
        didChange = true;
      } else {
        previewMapRef.current.set(tempKey, { objectUrl, kind: "doc" });
        didChange = true;
      }
    });

    if (didChange) forceUpdate((n) => n + 1);
    onFilesSelected(files);
  };

  // Resolve preview for an attachment — match by name+size key (pending) or attachment id
  const getPreview = (attachment: ChatAttachment): PreviewEntry | undefined => {
    // Try by attachment id first (set after upload lands)
    if (previewMapRef.current.has(attachment.id)) {
      return previewMapRef.current.get(attachment.id);
    }
    // Try pending key (before upload response arrives)
    const pendingKey = `pending-${attachment.name}-${(attachment.sizeKb ?? 0) * 1024}`;
    if (previewMapRef.current.has(pendingKey)) {
      // Migrate to real id
      const entry = previewMapRef.current.get(pendingKey)!;
      previewMapRef.current.set(attachment.id, entry);
      previewMapRef.current.delete(pendingKey);
      return entry;
    }
    // Approximate match by name only (when sizeKb is rounded)
    for (const [key, entry] of previewMapRef.current.entries()) {
      if (key.startsWith(`pending-${attachment.name}-`)) {
        previewMapRef.current.set(attachment.id, entry);
        previewMapRef.current.delete(key);
        return entry;
      }
    }
    return undefined;
  };

  // ── Recording ─────────────────────────────────────────────────────────────
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
          registerFilePreviews(dt.files);
        } catch {
          const pseudoList = {
            0: file,
            length: 1,
            item: (i: number) => (i === 0 ? file : null),
            [Symbol.iterator]: function* () { yield file; },
          } as unknown as FileList;
          registerFilePreviews(pseudoList);
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
      // microphone denied
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
    setProcessingVoice(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const openFilePicker = () => {
    if (disabled || uploading || isRecording) return;
    fileInputRef.current?.click();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-[20px] border border-white/8 bg-bg-surface transition-shadow duration-200 focus-within:border-brand-green/25 focus-within:shadow-green-sm">

      {/* ── Rich attachment previews ── */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-white/6 px-4 py-3">
          {attachments.map((attachment) => {
            const isUploading = attachment.status === "uploading";
            const preview = getPreview(attachment);

            /* ── IMAGE ─────────────────────────────────── */
            if (preview?.kind === "image") {
              return (
                <div key={attachment.id} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.objectUrl}
                    alt={attachment.name}
                    className="h-full w-full object-cover"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <LoaderCircle className="h-5 w-5 animate-spin text-brand-green" />
                    </div>
                  )}
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(attachment.id)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  {!isUploading && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                      <p className="truncate text-[9px] text-white/80">Фото</p>
                    </div>
                  )}
                </div>
              );
            }

            /* ── VIDEO ─────────────────────────────────── */
            if (preview?.kind === "video") {
              return (
                <div key={attachment.id} className="group relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    src={preview.objectUrl}
                    className="h-full w-full object-cover opacity-80"
                    preload="metadata"
                    muted
                  />
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <LoaderCircle className="h-5 w-5 animate-spin text-brand-green" />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(attachment.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="flex items-center gap-1 text-[9px] text-white/80">
                          <Video className="h-2.5 w-2.5" /> Видео
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            }

            /* ── AUDIO (voice memo) ─────────────────────── */
            if (attachment.kind === "audio") {
              const dur = preview?.durationSec;
              return (
                <div
                  key={attachment.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    isUploading
                      ? "border-brand-green/25 bg-brand-green/6"
                      : "border-brand-green/20 bg-brand-green/6"
                  }`}
                >
                  {/* Waveform animation */}
                  <div className="flex items-end gap-[2px]">
                    {[3, 6, 9, 6, 4, 8, 5, 7, 3, 6].map((h, i) => (
                      <span
                        key={i}
                        className="w-[2px] rounded-full bg-brand-green"
                        style={{
                          height: `${h * 2}px`,
                          opacity: isUploading ? 0.4 : 0.8,
                          animation: isUploading ? `waveBar 0.8s ease-in-out infinite alternate` : "none",
                          animationDelay: `${i * 60}ms`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-brand-green">
                      {isUploading ? "Голосовое записывается…" : "Голосовое сообщение принято"}
                    </span>
                    {dur !== undefined && (
                      <span className="text-[10px] text-brand-green/60">{formatDuration(dur)}</span>
                    )}
                    {isUploading && (
                      <span className="text-[10px] text-brand-green/50">обрабатывается…</span>
                    )}
                  </div>

                  {isUploading ? (
                    <LoaderCircle className="ml-auto h-4 w-4 shrink-0 animate-spin text-brand-green/60" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(attachment.id)}
                      className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-text-muted transition hover:bg-red-500/15 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            }

            /* ── DOCUMENT / FILE ────────────────────────── */
            return (
              <div
                key={attachment.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  isUploading
                    ? "border-white/10 bg-bg-elevated"
                    : "border-white/10 bg-bg-elevated"
                }`}
              >
                {isUploading ? (
                  <LoaderCircle className="h-7 w-7 shrink-0 animate-spin text-brand-green" />
                ) : (
                  docIcon(attachment.name)
                )}

                <div className="flex max-w-[140px] flex-col">
                  <span className="truncate text-xs font-semibold text-white">
                    {attachment.name}
                  </span>
                  {isUploading ? (
                    <span className="text-[10px] text-text-muted">загружается…</span>
                  ) : (
                    <span className="text-[10px] text-text-muted">
                      {attachment.sizeKb ? `${attachment.sizeKb} кб` : "документ"}
                    </span>
                  )}
                </div>

                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-text-muted transition hover:bg-red-500/15 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                {!isUploading && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green/50" />
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
          <span className="text-xs font-semibold text-red-400">Запись {formatTime(recordingSeconds)}</span>
          <span className="ml-auto text-[10px] text-text-muted">макс. {formatTime(MAX_RECORDING_SECONDS)}</span>
        </div>
      )}

      {/* ── Voice processing banner ── */}
      {processingVoice && !isRecording && (
        <div className="flex items-center gap-2 border-b border-brand-green/15 bg-brand-green/5 px-4 py-2">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-green" />
          <span className="text-xs font-medium text-brand-green">
            Голосовое сообщение записано — обрабатывается…
          </span>
        </div>
      )}

      {/* CSS for waveBar animation */}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      {/* ── Input row ── */}
      <div className="flex items-end gap-2 px-3 py-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx"
          disabled={disabled || uploading || isRecording}
          onChange={(e) => {
            if (e.target.files?.length) registerFilePreviews(e.target.files);
            e.currentTarget.value = "";
          }}
          className="hidden"
        />

        <button
          type="button"
          aria-label="Прикрепить файл"
          disabled={disabled || uploading || isRecording}
          onClick={openFilePicker}
          title="Прикрепить файл (фото, PDF, документ, видео…)"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-bg-elevated text-text-muted transition-all hover:border-brand-green/25 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>

        <button
          type="button"
          disabled={disabled || loading || uploading}
          onClick={isRecording ? stopRecording : () => void startRecording()}
          aria-label={isRecording ? "Остановить запись" : "Записать голосовое сообщение"}
          title={isRecording ? "Остановить запись" : "Записать голосовое сообщение"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
            isRecording
              ? "border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25"
              : "border-white/8 bg-bg-elevated text-text-muted hover:border-brand-green/25 hover:text-brand-green"
          }`}
        >
          {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <textarea
          autoFocus
          rows={1}
          value={value}
          disabled={disabled || isRecording}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
          }}
          placeholder={
            isRecording ? "Говорите — запись идёт…"
              : processingVoice ? "Голосовое сообщение обрабатывается…"
              : "Напишите ответ…"
          }
          className="min-h-[40px] max-h-36 flex-1 resize-none bg-transparent py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-text-muted disabled:opacity-50"
        />

        <button
          type="button"
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
