import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-xl rounded-[32px] border border-white/8 bg-bg-surface p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-green text-black">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
          InsightU AI
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Страница не найдена</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Возможно, маршрут изменился или профиль кандидата больше не существует в текущем mock
          pool.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-green/40 bg-brand-green px-5 py-3 font-semibold text-black transition-colors hover:bg-brand-dim"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться в dashboard
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-2xl border border-white/8 px-5 py-3 font-semibold text-text-secondary transition-colors hover:border-brand-green/20 hover:text-white"
          >
            На экран входа
          </Link>
        </div>
      </div>
    </div>
  );
}
