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
    <div className="panel-soft p-3 transition-shadow duration-200 focus-within:shadow-green-sm">
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2 px-2 pt-1">
          {attachments.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              onClick={() => onRemoveAttachment(attachment.id)}
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-brand-green/20 hover:text-white"
            >
              {attachment.kind === "audio" ? <Waves className="h-3.5 w-3.5" /> : attachment.kind === "video" ? <Video className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
              {attachment.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2.5">
        <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-white/8 bg-bg-elevated text-text-muted transition-all hover:border-brand-green/25 hover:text-white">
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
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Напишите ответ... (Enter — отправить, Shift+Enter — перенос строки)"
          className="min-h-[52px] max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-text-muted disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || loading || uploading || !value.trim()}
          onClick={onSubmit}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-green text-black transition-all hover:bg-brand-dim hover:shadow-green-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
