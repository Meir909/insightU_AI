import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Radar, ArrowRight, TrendingUp } from "lucide-react";
import {
  AUTH_EMAIL_COOKIE,
  AUTH_ENTITY_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  parseAuthSession,
} from "@/lib/server/auth";
import { getProactiveTalents } from "@/lib/api";

export default async function TalentsPage() {
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (!session || session.role !== "committee") {
    redirect("/sign-in");
  }

  const talents = await getProactiveTalents();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Проактивный поиск</p>
        <h1 className="text-2xl font-black tracking-tight text-white">Скрытые таланты</h1>
        <p className="text-sm text-text-secondary">
          Кандидаты с высоким AI-потенциалом (60+), которые ещё не попали в шорт-лист. Требуют внимания комиссии.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-brand-green" />
            <p className="text-xs font-semibold text-text-muted">Обнаружено</p>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{talents.length}</p>
          <p className="mt-0.5 text-[10px] text-text-muted">кандидатов с потенциалом</p>
        </div>
        <div className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-green" />
            <p className="text-xs font-semibold text-text-muted">Средний скор</p>
          </div>
          <p className="mt-2 text-2xl font-black text-white">
            {talents.length > 0
              ? Math.round(talents.reduce((s, t) => s + t.final_score, 0) / talents.length)
              : 0}
          </p>
          <p className="mt-0.5 text-[10px] text-text-muted">баллов из 100</p>
        </div>
        <div className="panel-soft p-4">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-yellow-400" />
            <p className="text-xs font-semibold text-text-muted">Требуют проверки</p>
          </div>
          <p className="mt-2 text-2xl font-black text-white">
            {talents.filter((t) => t.missingSteps.length > 0).length}
          </p>
          <p className="mt-0.5 text-[10px] text-text-muted">с незавершёнными шагами</p>
        </div>
      </div>

      {/* Talent cards */}
      {talents.length === 0 ? (
        <div className="panel-soft p-10 text-center">
          <Radar className="mx-auto h-8 w-8 text-text-muted" />
          <p className="mt-4 font-semibold text-white">Скрытых талантов не найдено</p>
          <p className="mt-2 text-sm text-text-secondary">
            Все кандидаты с высоким потенциалом уже находятся в шорт-листе или ожидают оценки.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {talents.map((talent) => (
            <Link
              key={talent.id}
              href={`/dashboard/candidates/${talent.id}`}
              className="group panel-soft grain p-5 transition hover:border-brand-green/30 hover:bg-bg-elevated"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{talent.name || talent.code}</p>
                  <p className="mt-0.5 font-mono text-xs text-brand-green">{talent.code}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{talent.city}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xl font-black text-white">{talent.final_score}</span>
                  <span className="text-[10px] text-text-muted">баллов</span>
                </div>
              </div>

              {/* Tags */}
              {talent.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {talent.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-brand-green/20 bg-brand-green/8 px-2.5 py-0.5 text-[10px] font-semibold text-brand-green"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Mini bars */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[10px] text-text-muted">Лидерство</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-brand-green/70" style={{ width: `${talent.leadership}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-white">{talent.leadership}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[10px] text-text-muted">Рост</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-brand-green/70" style={{ width: `${talent.growth}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-white">{talent.growth}</span>
                </div>
              </div>

              {/* Missing steps */}
              {talent.missingSteps.length > 0 && (
                <div className="mt-3 space-y-1">
                  {talent.missingSteps.map((step) => (
                    <p key={step} className="flex items-center gap-1.5 text-[10px] text-yellow-400">
                      <span className="h-1 w-1 rounded-full bg-yellow-400 shrink-0" />
                      {step}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-text-muted transition group-hover:text-brand-green">
                Открыть профиль <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
