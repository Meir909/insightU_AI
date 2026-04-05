import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LogOut, Pencil, Shield, Sparkles, User, BarChart3, Hash, FileText, CheckCircle2, Users, Info, Lock } from "lucide-react";
import { getCandidateAccountOverview } from "@/lib/server/account-store";
import {
  AUTH_EMAIL_COOKIE,
  AUTH_ENTITY_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  parseAuthSession,
} from "@/lib/server/auth";

function statusLabel(status: string) {
  switch (status) {
    case "in_progress": return "В процессе";
    case "pending": return "Ожидает рассмотрения";
    case "completed": return "Завершено";
    case "shortlisted": return "В шорт-листе";
    case "accepted": return "Принят";
    case "approved": return "Одобрен";
    case "rejected": return "Отклонён";
    case "flagged": return "На проверке";
    case "withdrawn": return "Отозвана";
    default: return status;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "accepted":
    case "approved":
    case "shortlisted": return "text-brand-green";
    case "rejected":
    case "withdrawn": return "text-red-400";
    case "flagged": return "text-yellow-400";
    case "completed": return "text-blue-400";
    default: return "text-text-secondary";
  }
}

function phaseLabel(phase: string | null | undefined) {
  if (!phase) return "Не начато";
  switch (phase) {
    case "Foundation": return "Знакомство";
    case "Leadership and motivation": return "Лидерство и мотивация";
    case "Adaptive deep dive": return "Углублённый анализ";
    case "Interview completed": return "Интервью завершено";
    default: return phase;
  }
}

export default async function CandidateAccountPage() {
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

  const overview = await getCandidateAccountOverview(session.sessionId);
  if (!overview?.candidate) {
    redirect("/sign-in");
  }

  const progress = Math.min(100, Math.max(0, overview.session?.progress ?? 0));
  const isCompleted = progress >= 100;
  const hasStarted = progress > 0;
  const applicationCompleted = overview.candidate.applicationCompleted;
  const avatarInitials = overview.account.name.trim().slice(0, 2).toUpperCase() || "??";


  return (
    <div className="dot-grid min-h-screen bg-bg-base px-4 py-8 lg:px-8">
      <div className="page-shell space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar initials */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-green text-xl font-black text-black shadow-green-sm">
              {avatarInitials}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Личный кабинет</p>
              <h1 className="mt-0.5 text-2xl font-black tracking-tight text-white">{overview.account.name}</h1>
              <p className="mt-0.5 text-sm text-text-secondary">
                {overview.account.phone}
                {overview.account.email ? ` · ${overview.account.email}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl border border-brand-green/30 bg-brand-green/8 px-4 py-2 text-sm font-semibold text-brand-green transition hover:bg-brand-green/15"
            >
              <Pencil className="h-4 w-4" />
              {hasStarted || applicationCompleted ? "Редактировать профиль" : "Создать профиль"}
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-secondary transition hover:border-white/20 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </form>
          </div>
        </div>

        {/* Journey Timeline */}
        <div className="panel-soft p-6">
          <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Ваш путь</p>
          <div className="flex items-start gap-0">
            {[
              {
                label: "Анкета",
                icon: FileText,
                done: applicationCompleted,
                active: !applicationCompleted,
              },
              {
                label: "Интервью",
                icon: Sparkles,
                done: isCompleted,
                active: applicationCompleted && !isCompleted,
              },
              {
                label: "AI-анализ",
                icon: BarChart3,
                done: isCompleted,
                active: false,
              },
              {
                label: "Комиссия",
                icon: Users,
                done: overview.candidate.status === "accepted" || overview.candidate.status === "approved" || overview.candidate.status === "shortlisted",
                active: false,
              },
              {
                label: "Решение",
                icon: CheckCircle2,
                done: overview.candidate.status === "accepted" || overview.candidate.status === "approved",
                active: false,
              },
            ].map((step, idx, arr) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex flex-1 flex-col items-center">
                  {/* Connector + icon row */}
                  <div className="flex w-full items-center">
                    {idx > 0 && (
                      <div className={`h-0.5 flex-1 transition-colors ${arr[idx - 1].done ? "bg-brand-green" : "bg-white/10"}`} />
                    )}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 transition-all ${
                        step.done
                          ? "border-brand-green bg-brand-green text-black shadow-green-sm"
                          : step.active
                            ? "border-brand-green bg-brand-green/10 text-brand-green"
                            : "border-white/12 bg-white/3 text-text-muted"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`h-0.5 flex-1 transition-colors ${step.done ? "bg-brand-green" : "bg-white/10"}`} />
                    )}
                  </div>
                  {/* Label */}
                  <p className={`mt-2.5 text-center text-[11px] font-semibold leading-tight ${
                    step.active ? "text-brand-green" : step.done ? "text-white" : "text-text-muted"
                  }`}>
                    {step.label}
                  </p>
                  {step.active && (
                    <span className="mt-1 text-[9px] font-bold uppercase tracking-wide text-brand-green/70">сейчас</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Block */}
        {!applicationCompleted ? (
          <div className="relative overflow-hidden rounded-xl border border-brand-green/30 bg-brand-green/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-green" />
                  <p className="text-sm font-semibold text-brand-green">Заполните анкету кандидата</p>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  Анкета позволяет AI лучше понять ваш потенциал. Займёт около 5 минут.
                </p>
              </div>
              <Link
                href="/apply"
                className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-bold text-black transition hover:bg-brand-green/90"
              >
                Заполнить анкету
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : !isCompleted ? (
          <div className="relative overflow-hidden rounded-xl border border-brand-green/30 bg-brand-green/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-green" />
                  <p className="text-sm font-semibold text-brand-green">
                    {hasStarted ? "Продолжите интервью" : "Начните AI-интервью"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {hasStarted
                    ? `Пройдено ${progress}% · ${phaseLabel(overview.session?.phase)}`
                    : "Интервью занимает около 10 минут. Отвечайте честно и развёрнуто."}
                </p>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-green transition-all duration-500"
                    style={{ width: `${Math.max(progress, hasStarted ? 4 : 0)}%` }}
                  />
                </div>
              </div>
              <Link
                href="/interview"
                className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-bold text-black transition hover:bg-brand-green/90"
              >
                {hasStarted ? "Продолжить" : "Начать"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-brand-green/40 bg-brand-green/10 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green/20">
                <Sparkles className="h-5 w-5 text-brand-green" />
              </div>
              <div>
                <p className="font-bold text-white">Интервью завершено</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  Ваши ответы переданы на оценку комиссии. Итоговое решение принимает только комиссия inVision U.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel-soft relative overflow-hidden p-5">
            <div className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-status-mid/50" />
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Статус заявки</p>
            </div>
            <p className={`mt-3 text-xl font-black ${statusColor(overview.candidate.status)}`}>
              {statusLabel(overview.candidate.status)}
            </p>
            <p className="mt-1.5 text-xs text-text-muted">Обновляется после рассмотрения комиссией</p>
          </div>

          <div className="panel-soft overflow-hidden p-5 relative">
            <div className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-brand-green/50" />
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Прогресс интервью</p>
            </div>
            <p className="mt-3 text-xl font-black text-white">{progress}%</p>
            <p className="mt-1.5 text-xs text-text-muted">{phaseLabel(overview.session?.phase)}</p>
          </div>

          <div className="panel-soft overflow-hidden p-5 relative">
            <div className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-status-ai/50" />
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Код кандидата</p>
            </div>
            <p className="mt-3 font-mono text-xl font-black text-brand-green">{overview.candidate.code}</p>
            <p className="mt-1.5 text-xs text-text-muted">Укажите при обращении в поддержку</p>
          </div>
        </div>

        {/* What happens next — shown after interview is done */}
        {isCompleted && (
          <div className="panel-soft p-6">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-brand-green" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Что происходит дальше</p>
            </div>
            <div className="space-y-3">
              {[
                { step: "1", text: "AI завершил первичный анализ ваших ответов по 6 измерениям" },
                { step: "2", text: "Комиссия inVision U независимо изучит ваш профиль и вынесет решение" },
                { step: "3", text: "Итоговое решение принимается коллегиально — минимум 3 голоса" },
                { step: "4", text: "Статус заявки обновится в этом кабинете. Ожидаемый срок: 5–7 рабочих дней" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-[10px] font-black text-brand-green">{item.step}</span>
                  <p className="text-sm leading-relaxed text-text-secondary">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Summary */}
        {(overview.candidate.goals || overview.candidate.experience) && (
          <div className="panel-soft p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Профиль</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {overview.candidate.goals && (
                <div className="panel-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Цели</p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{overview.candidate.goals}</p>
                </div>
              )}
              {overview.candidate.experience && (
                <div className="panel-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Опыт</p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{overview.candidate.experience}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Human-in-the-loop notice */}
        <div className="rounded-2xl border border-white/8 bg-bg-surface p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-green/10">
              <Users className="h-4 w-4 text-brand-green" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Решение принимают люди, не AI</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Система AI анализирует и ранжирует кандидатов, но никогда не принимает финальных решений самостоятельно.
                Каждый кандидат рассматривается живой комиссией inVision U. AI — это инструмент поддержки, а не замена человеческого суждения.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy & consent summary */}
        <div className="rounded-2xl border border-white/8 bg-bg-surface p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <Lock className="h-4 w-4 text-text-muted" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Конфиденциальность и данные</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Ваши данные обрабатываются согласно{" "}
                <Link href="/privacy-policy" className="text-brand-green hover:underline">политике конфиденциальности</Link>.
                Мы не передаём данные третьим лицам и не используем демографические признаки в алгоритме оценки.
                Для запроса на удаление данных — обратитесь в поддержку, указав код кандидата{" "}
                <span className="font-mono text-brand-green">{overview.candidate.code}</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-green/20 bg-brand-green/6 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-white">Нужна техподдержка?</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Напишите в поддержку, если нужно удалить данные, уточнить статус заявки или восстановить доступ.
                Укажите email, телефон или код кандидата{" "}
                <span className="font-mono text-brand-green">{overview.candidate.code}</span>.
              </p>
            </div>
            <a
              href={`mailto:nurmiko22@gmail.com?subject=${encodeURIComponent(`Поддержка кандидата ${overview.candidate.code}`)}`}
              className="shrink-0 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green transition hover:bg-brand-green/15"
            >
              Написать в поддержку
            </a>
          </div>
        </div>

        {/* Footer note */}
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-text-muted">
          <Shield className="h-3 w-3" />
          AI-оценка носит рекомендательный характер. Итоговое решение остаётся за комиссией inVision U.
        </p>
      </div>
    </div>
  );
}
