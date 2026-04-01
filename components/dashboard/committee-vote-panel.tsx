"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Candidate, CommitteeVoteDecision } from "@/lib/types";

const DECISION_LABELS: Record<CommitteeVoteDecision, string> = {
  approve: "Одобрить",
  hold: "На удержание",
  reject: "Отклонить",
};

const DECISION_COLORS: Record<CommitteeVoteDecision, string> = {
  approve: "bg-brand-green text-black",
  hold: "border border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  reject: "border border-red-500/40 bg-red-500/10 text-red-400",
};

const DECISION_BADGE: Record<CommitteeVoteDecision, string> = {
  approve: "border border-brand-green/30 bg-brand-green/8 text-brand-green",
  hold: "border border-yellow-500/20 bg-yellow-500/6 text-yellow-400",
  reject: "border border-red-500/20 bg-red-500/6 text-red-400",
};

const MIN_CHARS = 30;

export function CommitteeVotePanel({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [decision, setDecision] = useState<CommitteeVoteDecision>("approve");
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [biasWarning, setBiasWarning] = useState<string | null>(null);
  const [myPriorVote, setMyPriorVote] = useState<CommitteeVoteDecision | null>(null);

  // Detect current user and find existing vote
  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const id = data?.session?.entityId as string | undefined;
        if (!id) return;
        const existing = candidate.committee_review?.votes.find((v) => v.memberId === id);
        if (existing) {
          setMyPriorVote(existing.decision);
          setDecision(existing.decision);
          setRationale(existing.rationale);
        }
      });
  }, [candidate]);

  const charCount = rationale.trim().length;
  const isReady = charCount >= MIN_CHARS;

  const submitVote = async () => {
    setSubmitting(true);
    setBiasWarning(null);

    try {
      const response = await fetch("/api/committee/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id, decision, rationale }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Не удалось сохранить голос");
        return;
      }

      if (data.biasCheck?.hasAnomaly) {
        setBiasWarning(data.biasCheck.details);
      }

      toast.success(myPriorVote ? "Голос обновлён" : "Голос комиссии сохранён");
      setMyPriorVote(decision);
      router.refresh();
    } catch {
      toast.error("Ошибка сети — попробуйте снова");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/6 bg-bg-surface p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-1 rounded-full bg-brand-green" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Голос комиссии</p>
        </div>
        {myPriorVote && (
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${DECISION_BADGE[myPriorVote]}`}>
            Ваш голос: {DECISION_LABELS[myPriorVote]}
          </span>
        )}
      </div>

      {/* Prior vote notice */}
      {myPriorVote && (
        <div className="mb-4 rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
          <p className="text-xs text-text-secondary">
            Вы уже проголосовали. Можно изменить голос — будет обновлён автоматически.
          </p>
        </div>
      )}

      {/* Decision buttons */}
      <div className="grid grid-cols-3 gap-2">
        {(["approve", "hold", "reject"] as CommitteeVoteDecision[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setDecision(item)}
            className={`rounded-2xl px-3 py-3 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.98] ${
              decision === item
                ? DECISION_COLORS[item]
                : "border border-white/8 bg-bg-elevated text-text-secondary hover:border-brand-green/20 hover:text-white"
            }`}
          >
            {DECISION_LABELS[item]}
          </button>
        ))}
      </div>

      {/* Rationale textarea */}
      <div className="mt-4">
        <textarea
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
          rows={4}
          placeholder="Укажите конкретные наблюдения: качество ответов, уровень мышления, соответствие критериям программы..."
          className={`w-full rounded-2xl border bg-bg-elevated px-4 py-3 text-sm text-white outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-brand-green/30 transition-colors ${
            charCount > 0 && !isReady
              ? "border-yellow-500/30 focus:border-yellow-500/50"
              : isReady
                ? "border-brand-green/20 focus:border-brand-green/35"
                : "border-white/8 focus:border-brand-green/25"
          }`}
        />
        <div className="mt-1.5 flex items-center justify-between px-1">
          {charCount > 0 && !isReady ? (
            <p className="text-[11px] text-yellow-400">
              Ещё {MIN_CHARS - charCount} симв. — добавьте конкретные наблюдения
            </p>
          ) : isReady ? (
            <span className="flex items-center gap-1 text-[11px] text-brand-green">
              <CheckCircle className="h-3 w-3" />
              Обоснование принято
            </span>
          ) : (
            <p className="text-[11px] text-text-muted">Минимум {MIN_CHARS} символов</p>
          )}
          <span className={`text-[11px] tabular-nums ${isReady ? "text-brand-green" : "text-text-muted"}`}>
            {charCount}/600
          </span>
        </div>
      </div>

      {/* Bias anomaly warning */}
      {biasWarning && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/8 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">Аномалия голосования</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">{biasWarning}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={submitting || !isReady}
        onClick={submitVote}
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-brand-green px-5 py-3 text-sm font-bold text-black transition-all duration-150 hover:bg-brand-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Сохраняю..." : myPriorVote ? "Обновить голос" : "Сохранить голос"}
      </button>

      <p className="mt-3 text-center text-[10px] leading-relaxed text-text-muted">
        Голос записывается в систему аудита. Система автоматически проверяет паттерны на аномалии.
      </p>
    </div>
  );
}
