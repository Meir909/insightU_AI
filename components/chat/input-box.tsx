"use client";

import { ArrowUp, LoaderCircle, Paperclip, Video, Waves } from "lucide-react";
import type { ChatAttachment } from "@/lib/types";

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
  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-3">
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2 px-2 pt-1">
          {attachments.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              onClick={() => onRemoveAttachment(attachment.id)}
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-bg-elevated px-3 py-2 text-xs text-text-secondary transition-colors hover:text-white"
            >
              {attachment.kind === "audio" ? <Waves className="h-3.5 w-3.5" /> : attachment.kind === "video" ? <Video className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
              {attachment.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-white/8 bg-bg-elevated text-text-secondary transition-colors hover:border-brand-green/20 hover:text-white">
          {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          <input
            type="file"
            multiple
            accept="audio/*,video/*,.pdf,.doc,.docx,.txt"
            disabled={disabled || uploading}
            onChange={(event) => {
              onFilesSelected(event.target.files);
              event.currentTarget.value = "";
            }}
            className="hidden"
          />
        </label>

        <textarea
          autoFocus
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Напишите ответ или приложите voice / video / document..."
          className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-text-muted"
        />
        <button
          type="button"
          disabled={disabled || loading || uploading}
          onClick={onSubmit}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
