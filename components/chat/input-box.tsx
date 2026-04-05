"use client";

import { ArrowUp, CheckCircle2, FileText, ImageIcon, LoaderCircle, Mic, Paperclip, StopCircle, Video, Waves } from "lucide-react";
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
  // shows "processing…" between stop and first chip appearing
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

  // Once a chip appears (uploading placeholder), hide the processing banner
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

        // Create a synthetic FileList via DataTransfer
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          onFilesSelected(dt.files);
        } catch {
          const pseudoList = {
            0: file,
            length: 1,
            item: (i: number) => (i === 0 ? file : null),
            [Symbol.iterator]: function* () {
              yield file;
            },
          } as unknown as FileList;
          onFilesSelected(pseudoList);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return s + 1;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      // User denied microphone or not supported
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    // Show processing banner until the chip appears
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

  return (
    <div className="rounded-[20px] border border-white/8 bg-bg-surface transition-shadow duration-200 focus-within:border-brand-green/25 focus-within:shadow-green-sm">

      {/* ── Attachment chips ── */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-white/6 px-4 py-3">
          {attachments.map((attachment) => {
            const isUploading = attachment.status === "uploading";
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() => !isUploading && onRemoveAttachment(attachment.id)}
                disabled={isUploading}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all ${
                  isUploading
                    ? "cursor-default border-brand-green/30 bg-brand-green/8 text-brand-green"
                    : "cursor-pointer border-brand-green/20 bg-brand-green/6 text-brand-green hover:border-red-500/30 hover:bg-red-500/6 hover:text-red-400"
                }`}
                title={isUploading ? "Загружается…" : "Нажмите чтобы удалить"}
              >
                {isUploading ? (
                  <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : attachment.kind === "audio" ? (
                  <Waves className="h-3.5 w-3.5 shrink-0" />
                ) : attachment.kind === "video" ? (
                  <Video className="h-3.5 w-3.5 shrink-0" />
                ) : attachment.mimeType?.startsWith("image/") ? (
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                )}

                <span className="max-w-[140px] truncate font-medium">
                  {attachment.kind === "audio" && !isUploading
                    ? "Голосовое сообщение"
                    : attachment.name}
                </span>

                {isUploading ? (
                  <span className="opacity-60">загружается…</span>
                ) : (
                  <>
                    {attachment.sizeKb ? (
                      <span className="opacity-50">{attachment.sizeKb} кб</span>
                    ) : null}
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="ml-0.5 opacity-40 transition-opacity hover:opacity-100">✕</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Recording active bar ── */}
      {isRecording && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
          <span className="text-xs font-semibold text-red-400">
            Запись {formatTime(recordingSeconds)}
          </span>
          <span className="ml-auto text-[10px] text-text-muted">
            макс. {formatTime(MAX_RECORDING_SECONDS)}
          </span>
        </div>
      )}

      {/* ── Voice processing banner (shown between stop and chip) ── */}
      {processingVoice && !isRecording && (
        <div className="flex items-center gap-2 border-b border-brand-green/15 bg-brand-green/5 px-4 py-2">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-green" />
          <span className="text-xs font-medium text-brand-green">
            Голосовое сообщение записано — обрабатывается…
          </span>
        </div>
      )}

      {/* ── Input row ── */}
      <div className="flex items-end gap-2 px-3 py-3">

        {/* Hidden real file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx"
          disabled={disabled || uploading || isRecording}
          onChange={(e) => {
            if (e.target.files?.length) {
              onFilesSelected(e.target.files);
            }
            e.currentTarget.value = "";
          }}
          className="hidden"
        />

        {/* Attach button — triggers file picker explicitly */}
        <button
          type="button"
          aria-label="Прикрепить файл"
          disabled={disabled || uploading || isRecording}
          onClick={openFilePicker}
          title="Прикрепить файл (фото, PDF, документ, видео…)"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-bg-elevated text-text-muted transition-all hover:border-brand-green/25 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </button>

        {/* Audio record button */}
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

        {/* Textarea */}
        <textarea
          autoFocus
          rows={1}
          value={value}
          disabled={disabled || isRecording}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={
            isRecording
              ? "Говорите — запись идёт…"
              : processingVoice
                ? "Голосовое сообщение обрабатывается…"
                : "Напишите ответ…"
          }
          className="min-h-[40px] max-h-36 flex-1 resize-none bg-transparent py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-text-muted disabled:opacity-50"
        />

        {/* Send button */}
        <button
          type="button"
          disabled={
            disabled ||
            loading ||
            uploading ||
            processingVoice ||
            isRecording ||
            (!value.trim() && attachments.length === 0)
          }
          onClick={onSubmit}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-black transition-all hover:bg-brand-dim hover:shadow-green-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
