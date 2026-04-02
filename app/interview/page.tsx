"use client";

import Link from "next/link";
import { BotMessageSquare, CheckCircle2, MessageSquare, ShieldCheck, Sparkles, TrendingUp, ArrowLeft, Pause, Play } from "lucide-react";
import { ChatWindow } from "@/components/chat/chat-window";
import { InputBox } from "@/components/chat/input-box";
import { ScorePill } from "@/components/chat/score-pill";
import { useChat } from "@/hooks/use-chat";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

function phaseLabel(phase: string | undefined) {
  switch (phase) {
    case "Foundation": return "Знакомство";
    case "Leadership and motivation": return "Лидерство и мотивация";
    case "Adaptive deep dive": return "Углублённый анализ";
    case "Interview completed": return "Интервью завершено";
    default: return phase ?? "Начало";
  }
}

function CompletionBanner() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-green/30 bg-brand-green/10">
        <CheckCircle2 className="h-8 w-8 text-brand-green" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-white">Интервью завершено</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Ваши ответы зафиксированы и переданы на оценку. Итоговое решение принимает только комиссия inVision U.
          Результат будет сообщён дополнительно.
        </p>
      </div>
      <Link
        href="/account"
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <ArrowLeft className="h-4 w-4" />
        Вернуться в кабинет
      </Link>
    </div>
  );
}

function ProgressSidebar({
  progress,
  phase,
  isCompleted,
  scoreUpdate,
}: {
  progress: number;
  phase: string | undefined;
  isCompleted: boolean;
  scoreUpdate: ReturnType<typeof useChat>["scoreUpdate"];
}) {
  return (
    <div className="space-y-3">
      {/* Progress card */}
      <div className="rounded-2xl border border-white/6 bg-bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green text-black">
            <BotMessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-none text-white">
              {isCompleted ? "Завершено" : "В процессе"}
            </p>
            <p className="mt-1 truncate text-xs text-text-muted">{phaseLabel(phase)}</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-brand-green transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-brand-green">{progress}%</span>
          <span className="text-xs text-text-muted">из 100%</span>
        </div>
      </div>

      {/* Scoring panel */}
      <div className="rounded-2xl border border-white/6 bg-bg-surface p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-white">Промежуточная оценка</p>
            <p className="mt-1 text-xs text-text-muted">Обновляется после ответа</p>
          </div>
        </div>

        {scoreUpdate ? (
          <div className="space-y-2.5" aria-live="polite" aria-atomic="true">
            <div className="grid grid-cols-3 gap-2">
              <ScorePill label="Итог" value={scoreUpdate.final_score} />
              <ScorePill label="Доверие" value={`${Math.round(scoreUpdate.confidence * 100)}%`} />
              <ScorePill label="AI риск" value={`${Math.round(scoreUpdate.ai_detection_prob * 100)}%`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ScorePill label="Аналитика" value={scoreUpdate.cognitive} />
              <ScorePill label="Лидерство" value={scoreUpdate.leadership} />
              <ScorePill label="Рост" value={scoreUpdate.growth} />
              <ScorePill label="Решения" value={scoreUpdate.decision} />
            </div>
            {scoreUpdate.recommendation && (
              <div className="rounded-xl border border-white/6 bg-bg-elevated p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Рекомендация AI</p>
                <p className="mt-1.5 text-xs font-semibold text-white">{scoreUpdate.recommendation}</p>
                {scoreUpdate.explanation && (
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{scoreUpdate.explanation}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            Появится после первого ответа.
          </p>
        )}
      </div>

      {/* Human review note */}
      <div className="rounded-2xl border border-white/6 bg-bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-white">Роль комиссии</p>
            <p className="mt-1 text-xs text-text-muted">AI помогает, но не решает</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-secondary">
          Итоговое решение принимает комиссия inVision U. AI-оценка носит рекомендательный характер
          и не является основанием для отказа или принятия.
        </p>
      </div>
    </div>
  );
}

function InterviewClient() {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    loading,
    uploading,
    attachments,
    uploadFiles,
    removeAttachment,
    progress,
    status,
    paused,
    togglePause,
    scoreUpdate,
    phase,
  } = useChat();

  const [mobileTab, setMobileTab] = useState<"chat" | "progress">("chat");
  const isCompleted = status === "completed";

  // Warn before leaving mid-interview
  useEffect(() => {
    if (isCompleted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isCompleted]);

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Mobile tab bar */}
      <div className="mb-4 xl:hidden">
        <div className="tab-bar">
          <button
            type="button"
            className={cn("tab-bar-item", mobileTab === "chat" && "active")}
            onClick={() => setMobileTab("chat")}
          >
            <MessageSquare className="h-4 w-4" />
            Чат
          </button>
          <button
            type="button"
            className={cn("tab-bar-item", mobileTab === "progress" && "active")}
            onClick={() => setMobileTab("progress")}
          >
            <TrendingUp className="h-4 w-4" />
            Прогресс
            {progress > 0 && (
              <span className="ml-1 font-mono text-[10px] text-brand-green">{progress}%</span>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main column */}
        <section className={cn("flex flex-col gap-4", mobileTab === "progress" && "hidden xl:flex")}>
          {/* Header */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-bg-surface px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-text-muted">AI-интервью · inVision U</p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight text-white">Сессия интервью</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile mini progress */}
              <div className="flex items-center gap-2 xl:hidden">
                <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="font-mono text-xs text-brand-green">{progress}%</span>
              </div>
              {/* Pause/Resume */}
              {!isCompleted && (
                <button
                  type="button"
                  onClick={togglePause}
                  aria-label={paused ? "Возобновить интервью" : "Приостановить интервью"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                    paused
                      ? "border-brand-green/30 bg-brand-green/10 text-brand-green hover:bg-brand-green/20"
                      : "border-white/10 bg-white/5 text-text-secondary hover:border-white/20 hover:text-white",
                  )}
                >
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {paused ? "Продолжить" : "Пауза"}
                </button>
              )}
            </div>
          </div>

          {isCompleted ? (
            <CompletionBanner />
          ) : (
            <>
              <ChatWindow messages={messages} loading={loading || uploading} />
              {paused ? (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
                  <Pause className="h-4 w-4 text-text-muted" />
                  <p className="text-sm text-text-secondary">
                    Сессия приостановлена. Нажмите <strong className="text-white">«Продолжить»</strong>, чтобы отвечать дальше.
                  </p>
                </div>
              ) : (
                <InputBox
                  value={input}
                  onChange={setInput}
                  onSubmit={sendMessage}
                  onFilesSelected={uploadFiles}
                  onRemoveAttachment={removeAttachment}
                  attachments={attachments}
                  loading={loading}
                  uploading={uploading}
                  disabled={paused}
                />
              )}
            </>
          )}
        </section>

        {/* Sidebar */}
        <aside className={cn(mobileTab === "chat" && "hidden xl:block")}>
          <ProgressSidebar
            progress={progress}
            phase={phase}
            isCompleted={isCompleted}
            scoreUpdate={scoreUpdate}
          />
        </aside>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <div className="dot-grid min-h-screen bg-bg-base px-4 py-8 lg:px-8">
      <InterviewClient />
    </div>
  );
}
