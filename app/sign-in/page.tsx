import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";
import { LoginEntry } from "@/components/auth/login-entry";
import { ViewerEntryButton } from "@/components/auth/viewer-entry-button";
import { SignInScene } from "@/components/sign-in/sign-in-scene";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-bg-base px-4 py-8">
      <SignInScene />

      <div className="page-shell relative z-10 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/15 bg-brand-green/8 px-4 py-2 text-sm text-brand-green">
            <Sparkles className="h-4 w-4" />
            InsightU AI
          </div>

          <div className="max-w-3xl space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
              Безопасный вход · inVision U
            </p>
            <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.05em] text-white md:text-7xl">
              Безопасный вход
              <span className="block text-brand-green">в личный кабинет</span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-text-secondary md:text-lg">
              Кандидат получает доступ к интервью и личному кабинету. Комиссия работает в отдельном
              защищенном пространстве с explainability, прозрачным ranking flow и коллективным голосованием.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            <Link href="/sign-up" className="hover:text-white">
              Нет аккаунта? Создать новый →
            </Link>
            <Link href="/privacy-policy" className="hover:text-white">
              Политика конфиденциальности
            </Link>
            <Link href="/terms" className="hover:text-white">
              Условия использования
            </Link>
          </div>
        </section>

        <section className="panel-soft grain p-6 shadow-2xl shadow-black/25 md:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green text-black">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-black tracking-tight text-white">Официальный вход</p>
              <p className="text-sm leading-relaxed text-text-muted">
                Сессия защищена cookie, доступ к backoffice ограничен ролью, а критические действия
                фиксируются в audit trail.
              </p>
            </div>
          </div>
          <LoginEntry />
          <ViewerEntryButton />
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            Поддержка: <span className="text-white">nurmiko22@gmail.com</span>. Для удаления данных или проверки
            статуса заявки укажите email, телефон или код кандидата.
          </p>
        </section>
      </div>
    </div>
  );
}
