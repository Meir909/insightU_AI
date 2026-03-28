"use client";

import { ArrowUp, LoaderCircle } from "lucide-react";

type InputBoxProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
};

export function InputBox({ value, onChange, onSubmit, loading, disabled }: InputBoxProps) {
  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-3">
      <div className="flex items-end gap-3">
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
          placeholder="Напишите ваш ответ..."
          className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-text-muted"
        />
        <button
          type="button"
          disabled={disabled || loading}
          onClick={onSubmit}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
