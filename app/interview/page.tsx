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
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.45fr]">
      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
            Candidate Interview
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-black tracking-[-0.04em] text-white">
              Multimodal Web Chat Agent
            </h1>
            <SessionControls compact />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">
            Кандидат может отвечать текстом и прикладывать voice, video и документы. Система обновляет промежуточную оценку и передаёт
            аргументированную рекомендацию только комиссии.
          </p>
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
        <div className="flex items-center justify-between rounded-[28px] border border-white/6 bg-bg-surface p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Candidate session</p>
            <p className="mt-1 text-sm font-semibold text-white">Protected interview session</p>
          </div>
          <span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1 text-[11px] font-semibold text-brand-green">
            Local auth
          </span>
        </div>

        <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-green p-3 text-black">
              <BotMessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Interview Progress</p>
              <p className="text-xs text-text-muted">{status === "completed" ? "Completed" : "In progress"}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
            <div className="h-full rounded-full bg-brand-green transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 font-mono text-sm text-brand-green">{progress}% complete</p>
          <p className="mt-1 text-xs text-text-muted">{phase}</p>
        </div>

        <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Intermediate scoring</p>
              <p className="text-xs text-text-muted">Updated after each answer and attachment</p>
            </div>
          </div>
          {scoreUpdate ? (
            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                <ScorePill label="Final" value={scoreUpdate.final_score} />
                <ScorePill label="Confidence" value={`${Math.round(scoreUpdate.confidence * 100)}%`} />
                <ScorePill label="AI risk" value={`${Math.round(scoreUpdate.ai_detection_prob * 100)}%`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ScorePill label="Cognitive" value={scoreUpdate.cognitive} />
                <ScorePill label="Leadership" value={scoreUpdate.leadership} />
                <ScorePill label="Growth" value={scoreUpdate.growth} />
                <ScorePill label="Decision" value={scoreUpdate.decision} />
              </div>
              <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Recommendation</p>
                <p className="mt-2 text-sm font-semibold text-white">{scoreUpdate.recommendation}</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{scoreUpdate.explanation}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">Score will appear after the first candidate answer.</p>
          )}
        </div>

        <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Human-in-the-loop</p>
              <p className="text-xs text-text-muted">Required by product rules</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            Финальное решение остаётся за комиссией. Один голос комиссии не может принять кандидата: нужен минимум коллегиальный порог
            одобрения.
          </p>
        </div>
      </aside>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <div className="dot-grid min-h-screen bg-bg-base px-4 py-10 lg:px-8">
      <InterviewClient />
    </div>
  );
}
