import { LockKeyhole, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { AuthEntry } from "@/components/sign-in/auth-entry";
import { SignInScene } from "@/components/sign-in/sign-in-scene";
import { getServiceStatus } from "@/lib/service-status";

export default function SignInPage() {
  const services = getServiceStatus().slice(0, 3);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-base px-4 py-8">
      <SignInScene />

      <div className="relative z-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-7">
          <div className="inline-flex items-center gap-3 rounded-full border border-brand-green/20 bg-brand-green/6 px-4 py-2 text-sm text-brand-green">
            <Sparkles className="h-4 w-4" />
            Decentrathon 5.0 • AI inDrive
          </div>

          <div className="max-w-3xl space-y-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
              InsightU AI
            </p>
            <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.05em] text-white md:text-7xl">
              Отбор нового
              <span className="block">поколения</span>
              <span className="block text-brand-green">лидеров inVision U</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-text-secondary">
              Единый веб-поток для кандидатов и комиссии: кандидат проходит AI interview в браузере, комиссия получает explainability,
              shortlist и итоговую аналитику в dashboard.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: MessageSquareText, title: "Web interview", text: "Адаптивный диалог и сессионная история без Telegram." },
              { icon: ShieldCheck, title: "Human review", text: "Финальное решение остаётся за комиссией." },
              { icon: LockKeyhole, title: "Role access", text: "Отдельные потоки для кандидата и комиссии." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-[24px] border border-white/6 bg-white/[0.03] p-5">
                <div className="accent-line mb-3" />
                <Icon className="mb-4 h-4 w-4 text-brand-green" />
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{text}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {services.map((service) => (
              <div key={service.key} className="rounded-[22px] border border-white/6 bg-bg-surface/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{service.label}</p>
                <p className={`mt-3 text-sm font-semibold ${service.configured ? "text-white" : "text-text-secondary"}`}>{service.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grain rounded-[32px] border border-white/8 bg-bg-surface/95 p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green text-black">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-white">Вход и регистрация</p>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                Казахстанские номера поддерживаются напрямую. Кандидат идёт в интервью, комиссия — в аналитическую панель.
              </p>
            </div>
          </div>

          <AuthEntry />

          <div className="mt-6 rounded-[24px] border border-white/6 bg-white/[0.02] px-4 py-4 text-sm leading-relaxed text-text-secondary">
            Для комиссии можно задать отдельный <code className="rounded bg-white/6 px-1.5 py-0.5 text-white">COMMITTEE_ACCESS_KEY</code> в
            <code className="ml-1 rounded bg-white/6 px-1.5 py-0.5 text-white">.env.local</code>. Если переменная не задана, используется
            локальный ключ <code className="ml-1 rounded bg-white/6 px-1.5 py-0.5 text-white">committee-demo</code>.
          </div>
        </section>
      </div>
    </div>
  );
}
