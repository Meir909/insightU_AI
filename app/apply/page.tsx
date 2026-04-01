import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sparkles, Shield } from "lucide-react";
import {
  AUTH_ENTITY_COOKIE,
  AUTH_EMAIL_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  parseAuthSession,
} from "@/lib/server/auth";
import { getCandidateApplicationOverview } from "@/lib/server/account-store";
import { ApplicationForm } from "@/components/apply/application-form";

export default async function ApplyPage() {
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (!session || session.role !== "candidate") {
    redirect("/sign-in");
  }

  // If application already submitted, redirect to account
  if (session.entityId) {
    const overview = await getCandidateApplicationOverview(session.entityId);
    if (overview?.application?.applicationCompleted) {
      redirect("/account");
    }
  }

  return (
    <div className="dot-grid min-h-screen bg-bg-base px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/15 bg-brand-green/8 px-3 py-1.5 text-xs text-brand-green">
            <Sparkles className="h-3.5 w-3.5" />
            inVision U · Заявка на поступление
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            Анкета кандидата
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            AI анализирует ваши ответы по 6 измерениям: когнитивный потенциал, лидерство, рост,
            принятие решений, мотивация и аутентичность. Отвечайте честно и развёрнуто.
          </p>
        </div>

        {/* Form panel */}
        <div className="panel-soft grain p-6 shadow-2xl shadow-black/25 md:p-8">
          <ApplicationForm prefillName={session.name} />
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
          <p className="text-xs leading-relaxed text-text-muted">
            Данные защищены согласно политике конфиденциальности. Персональные данные используются
            исключительно для оценки в рамках конкурсного отбора inVision U. AI не принимает
            финальных решений — итоговое решение остаётся за комиссией.
          </p>
        </div>
      </div>
    </div>
  );
}
