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
      {/* ── Decorative background layer ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Grid lines */}
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

        {/* Main neon glow top */}
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-brand-green/6 blur-[140px]" />

        {/* Secondary glows */}
        <div className="absolute bottom-20 right-[-100px] h-[500px] w-[500px] rounded-full bg-brand-green/4 blur-[120px]" />
        <div className="absolute top-1/3 left-[-150px] h-[400px] w-[400px] rounded-full bg-brand-green/3 blur-[100px]" />

        {/* Floating orbs — large */}
        <div
          className="absolute top-[8%] left-[6%] h-48 w-48 rounded-full border border-brand-green/12 bg-brand-green/3"
          style={{ animation: "float-slow 8s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[12%] right-[8%] h-32 w-32 rounded-full border border-brand-green/10 bg-brand-green/2"
          style={{ animation: "float-slow 10s ease-in-out infinite reverse" }}
        />

        {/* Floating orbs — small neon */}
        <div
          className="absolute top-[22%] right-[14%] h-5 w-5 rounded-full bg-brand-green/70 shadow-[0_0_20px_6px_rgba(200,240,0,0.35)]"
          style={{ animation: "pulse-neon 3s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[60%] left-[10%] h-3 w-3 rounded-full bg-brand-green/60 shadow-[0_0_16px_5px_rgba(200,240,0,0.3)]"
          style={{ animation: "pulse-neon 4s ease-in-out infinite 1s" }}
        />
        <div
          className="absolute top-[40%] right-[6%] h-2 w-2 rounded-full bg-brand-green/80 shadow-[0_0_12px_4px_rgba(200,240,0,0.4)]"
          style={{ animation: "pulse-neon 2.5s ease-in-out infinite 0.5s" }}
        />
        <div
          className="absolute bottom-[30%] left-[20%] h-4 w-4 rounded-full bg-brand-green/50 shadow-[0_0_18px_5px_rgba(200,240,0,0.25)]"
          style={{ animation: "pulse-neon 5s ease-in-out infinite 2s" }}
        />

        {/* Geometric diamonds */}
        <div
          className="absolute top-[15%] right-[22%] h-10 w-10 rotate-45 border border-brand-green/20 bg-brand-green/4"
          style={{ animation: "spin-slow 20s linear infinite" }}
        />
        <div
          className="absolute bottom-[20%] left-[15%] h-6 w-6 rotate-45 border border-brand-green/15 bg-brand-green/3"
          style={{ animation: "spin-slow 30s linear infinite reverse" }}
        />
        <div
          className="absolute top-[70%] right-[28%] h-14 w-14 rotate-45 border border-brand-green/10"
          style={{ animation: "spin-slow 25s linear infinite" }}
        />

        {/* AI circuit lines — horizontal */}
        <svg
          className="absolute top-[18%] left-0 w-full opacity-[0.06]"
          viewBox="0 0 1200 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <polyline
            points="0,20 200,20 230,5 280,5 310,20 500,20 530,35 580,35 610,20 800,20 830,8 870,8 900,20 1200,20"
            stroke="#C8F000"
            strokeWidth="1"
          />
          <circle cx="230" cy="5" r="3" fill="#C8F000" />
          <circle cx="530" cy="35" r="3" fill="#C8F000" />
          <circle cx="830" cy="8" r="3" fill="#C8F000" />
        </svg>

        <svg
          className="absolute bottom-[25%] left-0 w-full opacity-[0.05]"
          viewBox="0 0 1200 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <polyline
            points="0,20 150,20 180,8 240,8 270,20 450,20 480,32 540,32 570,20 750,20 780,5 840,5 870,20 1200,20"
            stroke="#C8F000"
            strokeWidth="1"
          />
          <circle cx="180" cy="8" r="3" fill="#C8F000" />
          <circle cx="480" cy="32" r="3" fill="#C8F000" />
          <circle cx="780" cy="5" r="3" fill="#C8F000" />
        </svg>

        {/* Corner neon accent */}
        <div className="absolute top-0 left-0 h-64 w-64 opacity-30">
          <div className="absolute top-8 left-8 h-24 w-24 border-l-2 border-t-2 border-brand-green/30 rounded-tl-xl" />
          <div className="absolute top-6 left-6 h-2 w-2 rounded-full bg-brand-green/60 shadow-[0_0_10px_3px_rgba(200,240,0,0.4)]" />
        </div>
        <div className="absolute bottom-0 right-0 h-64 w-64 opacity-30">
          <div className="absolute bottom-8 right-8 h-24 w-24 border-r-2 border-b-2 border-brand-green/30 rounded-br-xl" />
          <div className="absolute bottom-6 right-6 h-2 w-2 rounded-full bg-brand-green/60 shadow-[0_0_10px_3px_rgba(200,240,0,0.4)]" />
        </div>

        {/* Scanline overlay */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(200,240,0,0.5) 2px, rgba(200,240,0,0.5) 3px)",
            backgroundSize: "100% 4px",
          }}
        />
      </div>

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-neon {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes spin-slow {
          from { transform: rotate(45deg); }
          to { transform: rotate(405deg); }
        }
      `}</style>

      <div className="relative w-full max-w-3xl text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green shadow-[0_0_8px_2px_rgba(200,240,0,0.6)]" />
          AI-платформа отбора кандидатов
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          inVision{" "}
          <span
            className="bg-gradient-to-r from-brand-green to-brand-dim bg-clip-text text-transparent"
            style={{ filter: "drop-shadow(0 0 30px rgba(200,240,0,0.3))" }}
          >
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
            className="relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand-green px-8 py-4 text-base font-bold text-black transition-all hover:bg-brand-dim hover:shadow-[0_0_32px_rgba(200,240,0,0.35)] sm:w-auto"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
            Подать заявку
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-brand-green/20 hover:bg-white/8 hover:shadow-[0_0_20px_rgba(200,240,0,0.08)] sm:w-auto"
          >
            Войти в кабинет
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
          {[
            { value: "7", label: "вопросов" },
            { value: "6", label: "AI-измерений" },
            { value: "100%", label: "прозрачность" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-extrabold text-brand-green" style={{ textShadow: "0 0 16px rgba(200,240,0,0.4)" }}>
                {value}
              </div>
              <div className="mt-0.5 text-xs text-text-muted">{label}</div>
            </div>
          ))}
        </div>

        {/* Features grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "AI-оценка",
              description: "Многоуровневый анализ анкеты, интервью и загруженных артефактов с объяснением каждого решения.",
              icon: "⬡",
            },
            {
              title: "Human-in-the-loop",
              description: "Финальное решение принимает комиссия из живых людей. AI — инструмент поддержки, не замена.",
              icon: "◈",
            },
            {
              title: "Прозрачность",
              description: "Каждый кандидат видит свой статус. Комиссия получает полный audit trail по каждому решению.",
              icon: "◇",
            },
          ].map(({ title, description, icon }) => (
            <div
              key={title}
              className="group rounded-[20px] border border-white/6 bg-bg-surface p-5 text-left transition-all duration-300 hover:border-brand-green/15 hover:shadow-[0_0_24px_rgba(200,240,0,0.06)]"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg text-brand-green/60 transition-colors group-hover:text-brand-green">{icon}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-brand-green/20 to-transparent" />
              </div>
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
