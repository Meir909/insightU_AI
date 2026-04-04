import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AUTH_EMAIL_COOKIE,
  AUTH_ENTITY_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  parseAuthSession,
} from "@/lib/server/auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (session) {
    redirect(session.role === "committee" ? "/dashboard/account" : "/account");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-base px-4 py-20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-green/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-brand-green/3 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-3xl text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          AI-платформа отбора кандидатов
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          inVision{" "}
          <span className="bg-gradient-to-r from-brand-green to-brand-dim bg-clip-text text-transparent">
            U
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
          Интеллектуальная система оценки участников программы стипендий inDrive.
          Объективно. Прозрачно. С участием комиссии из живых людей.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-8 py-4 text-base font-bold text-black transition-all hover:bg-brand-dim hover:shadow-[0_0_24px_rgba(200,240,0,0.25)] sm:w-auto"
          >
            Подать заявку
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/8 sm:w-auto"
          >
            Войти в кабинет
          </Link>
        </div>

        {/* Features grid */}
        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "AI-оценка",
              description: "Многоуровневый анализ анкеты, интервью и загруженных артефактов с объяснением каждого решения.",
            },
            {
              title: "Human-in-the-loop",
              description: "Финальное решение принимает комиссия из живых людей. AI — инструмент поддержки, не замена.",
            },
            {
              title: "Прозрачность",
              description: "Каждый кандидат видит свой статус. Комиссия получает полный audit trail по каждому решению.",
            },
          ].map(({ title, description }) => (
            <div
              key={title}
              className="rounded-[20px] border border-white/6 bg-bg-surface p-5 text-left"
            >
              <div className="mb-2 h-1 w-8 rounded-full bg-brand-green" />
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{description}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-12 text-xs text-text-muted">
          Данные обрабатываются в соответствии с{" "}
          <Link href="/privacy-policy" className="text-brand-green hover:text-brand-dim">
            политикой конфиденциальности
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
