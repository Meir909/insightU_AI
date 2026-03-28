import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { ServiceStatusPanel } from "@/components/dashboard/service-status-panel";
import { AuthEntry } from "@/components/sign-in/auth-entry";
import { SignInScene } from "@/components/sign-in/sign-in-scene";
import { envFlags } from "@/lib/env";
import { getServiceStatus } from "@/lib/service-status";

export default function SignInPage() {
  const services = getServiceStatus();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-base px-4">
      <SignInScene />

      <div className="relative z-10 grid w-full max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-brand-green/20 bg-brand-green/6 px-4 py-2 text-sm text-brand-green">
            <Sparkles className="h-4 w-4" />
            Decentrathon 5.0 · AI inDrive
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
              InsightU AI Admin
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-none tracking-[-0.04em] text-white md:text-7xl">
              Отбор нового поколения
              <span className="block text-brand-green">лидеров inVision U</span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-text-secondary">
              Интерфейс комиссии для оценки потенциала, explainability, shortlist и fairness
              сигналов по каждому кандидату.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              "6 измерений оценки и итоговый скор",
              "Explainability в 3 уровня",
              "AI-detection и confidence индикаторы",
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-white/6 bg-white/[0.03] p-4">
                <div className="accent-line mb-3" />
                <p className="text-sm text-text-secondary">{item}</p>
              </div>
            ))}
          </div>

          <ServiceStatusPanel services={services} />
        </section>

        <section className="grain rounded-[32px] border border-white/8 bg-bg-surface/95 p-6 shadow-2xl shadow-black/30">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green text-black">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-white">Вход для комиссии</p>
              <p className="text-sm text-text-muted">
                {envFlags.clerk ? "Clerk auth enabled" : "Mock auth screen для frontend MVP"}
              </p>
            </div>
          </div>

          <AuthEntry clerkEnabled={envFlags.clerk} />

          <div className="mt-6 space-y-3">
            {!envFlags.clerk ? (
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-green/40 bg-brand-green px-6 py-3 text-base font-semibold text-black transition-all duration-200 hover:bg-brand-dim hover:shadow-green"
              >
                <ArrowRight className="h-4 w-4" />
                Открыть dashboard
              </Link>
            ) : null}
            <p className="text-xs leading-relaxed text-text-muted">
              При наличии `Clerk` ключей и backend URL фронтенд начнёт использовать реальные сервисы
              вместо mock-режима.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
