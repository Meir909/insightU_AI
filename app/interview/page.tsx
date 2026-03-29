"use client";

import { BotMessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { SessionControls } from "@/components/auth/session-controls";
import { ChatWindow } from "@/components/chat/chat-window";
import { InputBox } from "@/components/chat/input-box";
import { ScorePill } from "@/components/chat/score-pill";
import { useChat } from "@/hooks/use-chat";

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

  return (
    <div className="page-shell grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/6 bg-bg-surface/80 p-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">Candidate Interview</p>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">AI interview session</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
              Отвечайте текстом или прикладывайте voice, video и документы. Система обновляет промежуточную оценку,
              но финальное решение принимает только комиссия.
            </p>
          </div>
          <SessionControls compact />
        </div>

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
          disabled={status === "completed"}
        />
      </section>

      <aside className="space-y-4">
        <div className="panel-soft p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-green p-3 text-black">
              <BotMessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Interview status</p>
              <p className="text-xs text-text-muted">{status === "completed" ? "Completed" : "In progress"}</p>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/6">
            <div className="h-full rounded-full bg-brand-green transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-mono text-brand-green">{progress}% complete</span>
            <span className="text-text-muted">{phase}</span>
          </div>
        </div>

        <div className="panel-soft p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Scoring snapshot</p>
              <p className="text-xs text-text-muted">Обновляется после каждого ответа</p>
            </div>
          </div>

          {scoreUpdate ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <ScorePill label="Final" value={scoreUpdate.final_score} />
                <ScorePill label="Trust" value={`${Math.round(scoreUpdate.confidence * 100)}%`} />
                <ScorePill label="AI risk" value={`${Math.round(scoreUpdate.ai_detection_prob * 100)}%`} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ScorePill label="Cognitive" value={scoreUpdate.cognitive} />
                <ScorePill label="Leadership" value={scoreUpdate.leadership} />
                <ScorePill label="Growth" value={scoreUpdate.growth} />
                <ScorePill label="Decision" value={scoreUpdate.decision} />
              </div>

              <div className="panel-muted p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Recommendation</p>
                <p className="mt-2 text-sm font-semibold text-white">{scoreUpdate.recommendation}</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{scoreUpdate.explanation}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">Промежуточная оценка появится после первого ответа.</p>
          )}
        </div>

        <div className="panel-soft p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Human review</p>
              <p className="text-xs text-text-muted">AI помогает, но не заменяет комиссию</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            Итоговое решение принимает комиссия. Кандидат не может быть принят одним голосом: действует коллегиальный
            порог одобрения.
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
