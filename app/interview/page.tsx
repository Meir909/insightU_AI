"use client";

import Link from "next/link";
import { BotMessageSquare, CheckCircle2, ShieldCheck, Sparkles, ArrowLeft } from "lucide-react";
import { SessionControls } from "@/components/auth/session-controls";
import { ChatWindow } from "@/components/chat/chat-window";
import { InputBox } from "@/components/chat/input-box";
import { ScorePill } from "@/components/chat/score-pill";
import { useChat } from "@/hooks/use-chat";

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
    scoreUpdate,
    phase,
  } = useChat();

  const isCompleted = status === "completed";

  return (
    <div className="page-shell grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      {/* Main column */}
      <section className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/6 bg-bg-surface/80 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-text-muted">AI-интервью · inVision U</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Сессия интервью</h1>
          </div>
          <SessionControls compact />
        </div>

        {isCompleted ? (
          <CompletionBanner />
        ) : (
          <>
            <ChatWindow messages={messages} loading={loading || uploading} />
            <InputBox
              value={input}
              onChange={setInput}
              onSubmit={sendMessage}
              onFilesSelected={uploadFiles}
              onRemoveAttachment={removeAttachment}
              attachments={attachments}
              loading={loading}
              uploading={uploading}
              disabled={false}
            />
          </>
        )}

        {isCompleted && messages.length > 0 && (
          <div className="panel-soft p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">История интервью</p>
            <ChatWindow messages={messages} loading={false} />
          </div>
        )}
      </section>

      {/* Sidebar */}
      <aside className="space-y-4">
        {/* Progress card */}
        <div className="panel-soft p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-green p-2.5 text-black">
              <BotMessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {isCompleted ? "Завершено" : "В процессе"}
              </p>
              <p className="text-xs text-text-muted">{phaseLabel(phase)}</p>
            </div>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-brand-green transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-sm text-brand-green">{progress}%</span>
            <span className="text-xs text-text-muted">из 100%</span>
          </div>
        </div>

        {/* Scoring panel */}
        <div className="panel-soft p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-green/10 p-2.5 text-brand-green">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Промежуточная оценка</p>
              <p className="text-xs text-text-muted">Обновляется после каждого ответа</p>
            </div>
          </div>

          {scoreUpdate ? (
            <div className="mt-4 space-y-3">
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

              <div className="panel-muted p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Рекомендация AI</p>
                <p className="mt-2 text-sm font-semibold text-white">{scoreUpdate.recommendation}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{scoreUpdate.explanation}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              Промежуточная оценка появится после первого ответа.
            </p>
          )}
        </div>

        {/* Human review note */}
        <div className="panel-soft p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-green/10 p-2.5 text-brand-green">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Роль комиссии</p>
              <p className="text-xs text-text-muted">AI помогает, но не решает</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-text-secondary">
            Итоговое решение принимает комиссия inVision U. AI-оценка носит рекомендательный характер
            и не является основанием для отказа или принятия.
          </p>
        </div>
      </aside>
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
