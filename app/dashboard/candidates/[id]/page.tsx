import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AIDetectionBadge } from "@/components/dashboard/ai-detection-badge";
import { CandidateTabs } from "@/components/dashboard/candidate-tabs";
import { CommitteeVotePanel } from "@/components/dashboard/committee-vote-panel";
import { ConfidenceRing } from "@/components/dashboard/confidence-ring";
import { ExplainabilityBlock } from "@/components/dashboard/explainability-block";
import { ScoreRadar } from "@/components/dashboard/score-radar";
import { ScoreSpherePanel } from "@/components/dashboard/score-sphere-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AUTH_EMAIL_COOKIE,
  AUTH_ENTITY_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  canVote,
  parseAuthSession,
} from "@/lib/server/auth";
import { getCandidate, getRanking } from "@/lib/api";
import { getCandidateEvaluationHistory } from "@/lib/server/prisma";
import { GrowthTimeline } from "@/components/dashboard/growth-timeline";
import { cn } from "@/lib/utils";

export async function generateStaticParams() {
  const candidates = await getRanking();
  return candidates.map((candidate) => ({ id: candidate.id }));
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [candidate, evaluationHistory] = await Promise.all([
    getCandidate(id),
    getCandidateEvaluationHistory(id).catch(() => []),
  ]);
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (!candidate) {
    notFound();
  }

  const scores = {
    cognitive: candidate.cognitive,
    leadership: candidate.leadership,
    growth: candidate.growth,
    decision: candidate.decision,
    motivation: candidate.motivation,
    authenticity: candidate.authenticity,
  };

  const evalHistory = evaluationHistory.map((e) => ({
    id: e.id,
    overallScore: e.overallScore,
    confidence: e.confidence,
    evaluatorType: e.evaluatorType,
    reasoning: e.reasoning,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="space-y-3">
          <Link href="/dashboard" className="text-sm text-text-secondary transition-colors hover:text-white">
            ← Назад к пулу кандидатов
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-black tracking-tight text-white">{candidate.name || candidate.code}</h2>
            <span className="font-mono text-sm text-brand-green">{candidate.code}</span>
            <StatusBadge status={candidate.status} />
          </div>
          <p className="text-sm text-text-secondary">{candidate.city} • {candidate.program}</p>
        </div>
      </div>

      {/* Tabs (mobile) + content */}
      <CandidateTabs>
        {(tab) => (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Overview: ScoreSphere + Confidence + AI Detection */}
              <div className={cn("grid gap-5 lg:grid-cols-[0.9fr_1.1fr]", tab !== "overview" && "hidden xl:grid")}>
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

                {/* Scores: Radar + Explainability + GrowthTimeline */}
                <div className={cn("space-y-5", tab === "scores" && "xl:block")}>
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

                  <GrowthTimeline evaluations={evalHistory} />
                </div>
              </div>

              {/* Scores tab (mobile only) */}
              <div className={cn("space-y-5", tab !== "scores" ? "hidden xl:hidden" : "block xl:hidden")}>
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

                <GrowthTimeline evaluations={evalHistory} />
              </div>

              {/* Committee tab (mobile only) */}
              <div className={cn("space-y-5", tab !== "committee" ? "hidden xl:hidden" : "block xl:hidden")}>
                <div className="panel-soft p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Защита от предвзятости</p>
                      <p className="text-xs text-text-muted">Коллегиальное решение комиссии</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">{candidate.committee_review?.corruptionGuard}</p>
                  <div className="mt-4 space-y-3">
                    {candidate.committee_review?.votes.map((vote) => (
                      <div key={vote.memberId} className="panel-muted p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{vote.memberName}</p>
                          <span className="rounded-full border border-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">
                            {vote.decision}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{vote.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Committee section (desktop always visible) */}
              <div className={cn("grid gap-5 lg:grid-cols-2", tab !== "overview" && "hidden xl:grid")}>
                <div className="panel-soft p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Защита от предвзятости</p>
                      <p className="text-xs text-text-muted">Коллегиальное решение комиссии</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">{candidate.committee_review?.corruptionGuard}</p>
                  <div className="mt-4 space-y-3">
                    {candidate.committee_review?.votes.map((vote) => (
                      <div key={vote.memberId} className="panel-muted p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{vote.memberName}</p>
                          <span className="rounded-full border border-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-green">
                            {vote.decision}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{vote.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel-soft p-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Подтверждающие материалы</p>
                  <div className="space-y-3">
                    {candidate.artifacts?.slice(0, 3).map((artifact) => (
                      <div key={artifact.id} className="panel-muted p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{artifact.name}</p>
                          <span className="font-mono text-xs text-brand-green">{artifact.kind}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{artifact.extractedSignals.join(" • ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Vote panel — always on desktop, only on committee tab on mobile */}
              <div className={cn(tab !== "committee" && "hidden xl:block")}>
                {canVote(session?.role) ? (
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

              {/* Profile info — always on desktop, only on profile tab on mobile */}
              <div className={cn(tab !== "profile" && "hidden xl:block")}>
                {[
                  { label: "Цели кандидата", value: candidate.goals },
                  { label: "Опыт", value: candidate.experience },
                  { label: "Мотивация", value: candidate.motivation_text },
                  { label: "Фрагмент эссе", value: candidate.essay_excerpt },
                ].map((item) => (
                  <div key={item.label} className="panel-soft p-5 mb-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">{item.label}</p>
                    <p className="text-sm leading-relaxed text-text-secondary">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CandidateTabs>
    </div>
  );
}
