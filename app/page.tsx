import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    redirect(session.role === "committee" || session.role === "admin" || session.role === "viewer" ? "/dashboard/account" : "/account");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-base px-4 py-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(200,240,0,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(200,240,0,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-brand-green/6 blur-[140px]" />
        <div className="absolute bottom-20 right-[-100px] h-[500px] w-[500px] rounded-full bg-brand-green/4 blur-[120px]" />
        <div className="absolute left-[-150px] top-1/3 h-[400px] w-[400px] rounded-full bg-brand-green/3 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green shadow-[0_0_8px_2px_rgba(200,240,0,0.6)]" />
          AI-платформа отбора кандидатов
        </div>

        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          inVision <span className="bg-gradient-to-r from-brand-green to-brand-dim bg-clip-text text-transparent">U</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
          Прозрачный AI-скрининг, мультимодальная оценка и human-in-the-loop workflow для отбора кандидатов.
          Система помогает комиссии, но не заменяет ее решение.
        </p>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <div className="rounded-[20px] border border-white/6 bg-bg-surface p-5">
            <p className="text-sm font-bold text-white">Что делает AI</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Анализирует анкету, интервью, документы, аудио и видео, считает score, confidence и AI risk.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/6 bg-bg-surface p-5">
            <p className="text-sm font-bold text-white">Что делает комиссия</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Смотрит explainability, голосует, обсуждает спорные кейсы и принимает финальное решение.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/6 bg-bg-surface p-5">
            <p className="text-sm font-bold text-white">Почему это безопасно</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Пол, социальный статус и другие демографические признаки не участвуют в scoring.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/sign-up" className="inline-flex w-full items-center justify-center rounded-2xl bg-brand-green px-8 py-4 text-base font-bold text-black transition-all hover:bg-brand-dim sm:w-auto">
            Подать заявку
          </Link>
          <Link href="/sign-in" className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-all hover:border-brand-green/20 hover:bg-white/8 sm:w-auto">
            Войти в кабинет
          </Link>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
          {[
            { value: "7", label: "этапов оценки" },
            { value: "6", label: "измерений scoring" },
            { value: "100%", label: "human review" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-extrabold text-brand-green">{value}</div>
              <div className="mt-0.5 text-xs text-text-muted">{label}</div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-text-muted">
          Данные обрабатываются в соответствии с <Link href="/privacy-policy" className="text-brand-green hover:text-brand-dim">политикой конфиденциальности</Link>.
        </p>
      </div>
    </main>
  );
}