"use client";

import { FileText, Pause, Play, Video, Waves } from "lucide-react";
import { useRef, useState } from "react";
import type { ChatAttachment, ChatMessage } from "@/lib/types";

function AudioPlayer({ attachment, dark }: { attachment: ChatAttachment; dark?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      void el.play();
    }
    setPlaying((v) => !v);
  };

  const onTimeUpdate = () => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const onEnded = () => setPlaying(false);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * el.duration;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const src = attachment.storagePath ?? "";

  return (
    <div
      className={`mt-3 flex flex-col gap-2 rounded-2xl border p-3 ${
        dark
          ? "border-black/10 bg-black/10"
          : "border-white/8 bg-bg-elevated"
      }`}
    >
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={onEnded}
          preload="metadata"
        />
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Пауза" : "Воспроизвести"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            dark
              ? "bg-black/20 hover:bg-black/30 text-black"
              : "bg-brand-green/15 hover:bg-brand-green/25 text-brand-green"
          }`}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <p className={`truncate text-[11px] font-semibold ${dark ? "text-black/70" : "text-text-secondary"}`}>
            {attachment.name}
          </p>
          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Прогресс аудио"
            className={`h-1.5 w-full cursor-pointer overflow-hidden rounded-full ${dark ? "bg-black/15" : "bg-white/8"}`}
            onClick={seek}
          >
            <div
              className={`h-full rounded-full transition-all ${dark ? "bg-black/50" : "bg-brand-green"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {duration > 0 && (
          <span className={`shrink-0 font-mono text-[10px] ${dark ? "text-black/50" : "text-text-muted"}`}>
            {fmt(audioRef.current?.currentTime ?? 0)}/{fmt(duration)}
          </span>
        )}
      </div>

      {attachment.extractedSignals && attachment.extractedSignals.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {attachment.extractedSignals.map((sig) => (
            <span
              key={sig}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                dark ? "bg-black/15 text-black/60" : "bg-brand-green/10 text-brand-green"
              }`}
            >
              {sig}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentChip({
  attachment,
  dark,
}: {
  attachment: ChatAttachment;
  dark?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${
        dark ? "border-black/10 bg-black/10 text-black" : "border-white/8 bg-bg-elevated text-text-secondary"
      }`}
    >
      {attachment.kind === "video" ? (
        <Video className="h-3.5 w-3.5" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      {attachment.name}
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  const audioAttachments = message.attachments?.filter((a) => a.kind === "audio") ?? [];
  const otherAttachments = message.attachments?.filter((a) => a.kind !== "audio") ?? [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm leading-relaxed ${
          isUser ? "bg-brand-green text-black" : "border border-white/6 bg-white/[0.03] text-text-secondary"
        }`}
      >
        <p>{message.content}</p>

        {/* Audio players */}
        {audioAttachments.map((att) => (
          <AudioPlayer key={att.id} attachment={att} dark={isUser} />
        ))}

        {/* Other attachments (video, document) */}
        {otherAttachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {otherAttachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} dark={isUser} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
