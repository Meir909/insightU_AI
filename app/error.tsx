"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App render error:", error);
  }, [error]);

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center bg-bg-base px-4 py-10">
      <div className="grain w-full max-w-lg rounded-[28px] border border-white/8 bg-bg-surface p-7 shadow-2xl shadow-black/30">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-status-low/10 text-status-low">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
          Server Components Error
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
          Не удалось загрузить страницу
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Во время серверного рендера произошла ошибка. Попробуйте повторить загрузку.
          Если проблема повторяется, используйте digest изнизу для поиска записи в логах.
        </p>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/4 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
            Digest
          </p>
          <p className="mt-2 font-mono text-sm text-brand-green">
            {error.digest || "not-available"}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn-primary">
            <RefreshCw className="h-4 w-4" />
            Повторить
          </button>
          <a href="/sign-in" className="btn-secondary">
            Перейти ко входу
          </a>
        </div>
      </div>
    </div>
  );
}
