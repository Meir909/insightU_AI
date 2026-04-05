"use client";

import { Activity, AlertTriangle, Clock, Cpu, FileText, Film, Mic, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { CandidateTabs } from "@/components/dashboard/candidate-tabs";
import { CommitteeVotePanel } from "@/components/dashboard/committee-vote-panel";
import { ConfidenceRing } from "@/components/dashboard/confidence-ring";
import { ExplainabilityBlock } from "@/components/dashboard/explainability-block";
import { GrowthTimeline, type EvaluationSnapshot } from "@/components/dashboard/growth-timeline";
import { ScoreRadar } from "@/components/dashboard/score-radar";
import { ScoreSpherePanel } from "@/components/dashboard/score-sphere-panel";
import { AIDetectionBadge } from "@/components/dashboard/ai-detection-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/lib/types";

type CandidateDetailShellProps = {
  candidate: Candidate;
  evaluationHistory: EvaluationSnapshot[];
  canCurrentUserVote: boolean;
};

const VOTE_LABEL: Record<string, string> = {
  approve: "Одобрить",
  reject: "Отклонить",
  hold: "На удержании",
};

const ARTIFACT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  resume: FileText,
  document: FileText,
  video: Film,
  audio: Mic,
};

function scoreColor(score: number) {
  if (score >= 75) return "text-brand-green";
  if (score >= 55) return "text-yellow-400";
  return "text-red-400";
}

export function CandidateDetailShell({
  candidate,
  evaluationHistory,
  canCurrentUserVote,
}: CandidateDetailShellProps) {
  const scores = {
    cognitive: candidate.cognitive,
    leadership: candidate.leadership,
    growth: candidate.growth,
    decision: candidate.decision,
    motivation: candidate.motivation,
    authenticity: candidate.authenticity,
  };

  const confidence = Math.round(candidate.confidence * 100);
  const aiRisk = Math.round(candidate.ai_detection_prob * 100);
  const approvedVotes = candidate.committee_review?.approvedCount ?? 0;
  const requiredVotes = candidate.committee_review?.requiredApprovals ?? 3;
  const finalDecision = candidate.committee_review?.finalDecision ?? "pending";

  // Derive AI recommendation label from score
  const recommendation =
    candidate.final_score >= 75
      ? "Рекомендован к одобрению"
      : candidate.final_score >= 55
        ? "Требует дополнительного рассмотрения"
        : "Не рекомендован на данном этапе";

  const recommendationColor =
    candidate.final_score >= 75
      ? "text-brand-green border-brand-green/30 bg-brand-green/8"
      : candidate.final_score >= 55
        ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/8"
        : "text-red-400 border-red-400/30 bg-red-400/8";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/dashboard" className="inline-block text-sm text-text-secondary transition-colors hover:text-white">
        ← Назад к пулу кандидатов
      </Link>

      {/* в”Ђв”Ђ SUMMARY BANNER в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <div className="rounded-[24px] border border-white/8 bg-bg-surface p-5">
        <div className="flex flex-wrap items-start gap-5">
          {/* Score bubble */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-bg-elevated px-5 py-4 text-center">
            <span className={`font-mono text-4xl font-black leading-none ${scoreColor(candidate.final_score)}`}>
              {candidate.final_score.toFixed(1)}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Итоговый балл</span>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight text-white">{candidate.name || candidate.code}</h2>
              <span className="font-mono text-sm text-brand-green">{candidate.code}</span>
              <StatusBadge status={candidate.status} />
            </div>
            <p className="mt-1 text-sm text-text-secondary">{candidate.city} В· {candidate.program}</p>

            {/* AI recommendation */}
            <div className={`mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${recommendationColor}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {recommendation}
            </div>

            {/* KPIs row */}
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/8 bg-bg-elevated px-3 py-1.5 text-xs">
                <span className="text-text-muted">Уверенность: </span>
                <span className="font-bold text-white">{confidence}%</span>
              </div>
              <div className="rounded-xl border border-white/8 bg-bg-elevated px-3 py-1.5 text-xs">
                <span className="text-text-muted">AI риск: </span>
                <span className={`font-bold ${aiRisk > 60 ? "text-red-400" : aiRisk > 35 ? "text-yellow-400" : "text-brand-green"}`}>{aiRisk}%</span>
              </div>
              <div className="rounded-xl border border-white/8 bg-bg-elevated px-3 py-1.5 text-xs">
                <span className="text-text-muted">Голосов: </span>
                <span className="font-bold text-white">{approvedVotes}/{requiredVotes}</span>
              </div>
              {candidate.needs_manual_review && (
                <div className="flex items-center gap-1.5 rounded-xl border border-yellow-400/30 bg-yellow-400/8 px-3 py-1.5 text-xs font-semibold text-yellow-400">
                  <AlertTriangle className="h-3 w-3" />
                  Требует ручной проверки
                </div>
              )}
            </div>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 self-start">
            {candidate.updated_at && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-bg-elevated px-3 py-1.5">
                <Clock className="h-3 w-3 text-text-muted" />
                <span className="text-[11px] text-text-secondary">
                  {new Date(candidate.updated_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {candidate.ensemble && candidate.ensemble.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-bg-elevated px-3 py-1.5">
                <Cpu className="h-3 w-3 text-brand-green" />
                <span className="text-[11px] text-text-secondary">
                  <span className="font-semibold text-brand-green">{candidate.ensemble.length}</span> модели ансамбля
                </span>
              </div>
            )}
            {candidate.evaluation_session_id && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-bg-elevated px-3 py-1.5">
                <Activity className="h-3 w-3 text-text-muted" />
                <span className="font-mono text-[10px] text-text-muted">
                  {candidate.evaluation_session_id.slice(0, 8)}...
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green" />
              </span>
              <span className="text-[11px] font-semibold text-brand-green">AI-оценка активна</span>
            </div>
          </div>
        </div>

        {/* Reasoning preview */}
        {candidate.reasoning && (
          <div className="mt-4 rounded-2xl border border-white/6 bg-bg-elevated px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Обоснование AI</p>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-secondary">{candidate.reasoning}</p>
          </div>
        )}

        {/* Scroll to vote CTA */}
        {canCurrentUserVote && finalDecision === "pending" && (
          <div className="mt-4 flex justify-end">
            <a
              href="#vote-panel"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-xs font-bold text-black transition hover:bg-brand-green/90"
            >
              Перейти к голосованию ↓
            </a>
          </div>
        )}
      </div>

      {/* в”Ђв”Ђ TABS + CONTENT в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <CandidateTabs>
        {(tab) => (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section className={cn(tab !== "overview" && "hidden xl:block")}>
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-5">
                    <div className="panel-soft p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Итоговый score</p>
                      <ScoreSpherePanel score={candidate.final_score} />
                    </div>
                    <div className="panel-soft p-5">
                      <ConfidenceRing confidence={candidate.confidence} />
                    </div>
                    <AIDetectionBadge probability={candidate.ai_detection_prob} signals={candidate.ai_signals} />
                  </div>

                  <div className="space-y-5">
                    <div className="panel-soft p-5">
                      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Профиль измерений</p>
                      <ScoreRadar scores={scores} />
                    </div>
                    <ExplainabilityBlock
                      scores={scores}
                      reasoning={candidate.reasoning}
                      keyQuotes={candidate.key_quotes}
                      explainabilityV2={candidate.explainability_v2}
                    />
                    <GrowthTimeline evaluations={evaluationHistory} />
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <CommitteeVotesPanel candidate={candidate} />
                  <ArtifactsPanel candidate={candidate} />
                </div>
              </section>

              <section className={cn(tab !== "scores" ? "hidden xl:hidden" : "space-y-5 xl:hidden")}>
                <div className="panel-soft p-5">
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Профиль измерений</p>
                  <ScoreRadar scores={scores} />
                </div>
                <ExplainabilityBlock
                  scores={scores}
                  reasoning={candidate.reasoning}
                  keyQuotes={candidate.key_quotes}
                  explainabilityV2={candidate.explainability_v2}
                />
                <GrowthTimeline evaluations={evaluationHistory} />
              </section>

              <section className={cn(tab !== "committee" ? "hidden xl:hidden" : "space-y-5 xl:hidden")}>
                <CommitteeVotesPanel candidate={candidate} />
                <ArtifactsPanel candidate={candidate} />
              </section>

              <section className={cn(tab !== "profile" ? "hidden xl:hidden" : "space-y-4 xl:hidden")}>
                <ProfilePanels candidate={candidate} />
              </section>
            </div>

            <aside className="space-y-4" id="vote-panel">
              <div className={cn(tab !== "committee" && "hidden xl:block")}>
                {canCurrentUserVote ? (
                  <CommitteeVotePanel candidate={candidate} />
                ) : (
                  <div className="panel-soft p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Режим просмотра</p>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                      Этот профиль открыт в режиме чтения. Голосование доступно только членам комиссии.
                    </p>
                  </div>
                )}
              </div>

              <div className={cn(tab !== "profile" && "hidden xl:block")}>
                <ProfilePanels candidate={candidate} />
              </div>
            </aside>
          </div>
        )}
      </CandidateTabs>
    </div>
  );
}

function CommitteeVotesPanel({ candidate }: { candidate: Candidate }) {
  const votes = candidate.committee_review?.votes ?? [];
  const approved = candidate.committee_review?.approvedCount ?? 0;
  const required = candidate.committee_review?.requiredApprovals ?? 3;

  return (
    <div className="panel-soft p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Защита от предвзятости</p>
          <p className="text-xs text-text-muted">Коллегиальное решение · {approved}/{required} одобрений</p>
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-text-secondary">{candidate.committee_review?.corruptionGuard}</p>

      {votes.length === 0 ? (
        <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-text-muted" />
          <p className="text-xs text-text-muted">Голосов пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {votes.map((vote) => (
            <div key={vote.memberId} className="panel-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{vote.memberName}</p>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  vote.decision === "approve"
                    ? "border-brand-green/30 text-brand-green"
                    : vote.decision === "reject"
                      ? "border-red-400/30 text-red-400"
                      : "border-yellow-400/30 text-yellow-400"
                }`}>
                  {VOTE_LABEL[vote.decision] ?? vote.decision}
                </span>
              </div>
              {vote.rationale && (
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{vote.rationale}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtifactsPanel({ candidate }: { candidate: Candidate }) {
  const artifacts = candidate.artifacts ?? [];

  return (
    <div className="panel-soft p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Мультимодальные артефакты</p>

      {artifacts.length === 0 ? (
        <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4 text-center">
          <FileText className="mx-auto mb-2 h-5 w-5 text-text-muted" />
          <p className="text-xs text-text-muted">Артефакты не загружены</p>
        </div>
      ) : (
        <div className="space-y-3">
          {artifacts.slice(0, 4).map((artifact) => {
            const Icon = ARTIFACT_ICON[artifact.kind] ?? FileText;
            const evidencePercent = Math.round((artifact.evidenceWeight ?? 0.25) * 100);
            return (
              <div key={artifact.id} className="panel-muted p-4">
                <div className="mb-2 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-green/10">
                    <Icon className="h-4 w-4 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{artifact.name}</p>
                      <span className="shrink-0 font-mono text-xs text-brand-green">{artifact.kind}</span>
                    </div>
                    {artifact.transcript && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">{artifact.transcript}</p>
                    )}
                  </div>
                </div>
                {artifact.extractedSignals.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {artifact.extractedSignals.slice(0, 3).map((signal, i) => (
                      <span key={i} className="rounded-full border border-white/8 bg-bg-elevated px-2 py-0.5 text-[10px] text-text-muted">
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-brand-green/60" style={{ width: `${evidencePercent}%` }} />
                  </div>
                  <span className="text-[10px] text-text-muted">Вклад {evidencePercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfilePanels({ candidate }: { candidate: Candidate }) {
  const items = [
    { label: "Цели кандидата", value: candidate.goals },
    { label: "Опыт", value: candidate.experience },
    { label: "Мотивация", value: candidate.motivation_text },
    { label: "Фрагмент эссе", value: candidate.essay_excerpt },
  ].filter((item) => item.value);

  if (items.length === 0) return null;

  return (
    <>
      {items.map((item) => (
        <div key={item.label} className="panel-soft mb-4 p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">{item.label}</p>
          <p className="text-sm leading-relaxed text-text-secondary">{item.value}</p>
        </div>
      ))}
    </>
  );
}
