"use client";

import { Activity, Clock, Cpu, ShieldCheck } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/dashboard" className="text-sm text-text-secondary transition-colors hover:text-white">
          в†ђ РќР°Р·Р°Рґ Рє РїСѓР»Сѓ РєР°РЅРґРёРґР°С‚РѕРІ
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-black tracking-tight text-white">{candidate.name || candidate.code}</h2>
          <span className="font-mono text-sm text-brand-green">{candidate.code}</span>
          <StatusBadge status={candidate.status} />
        </div>
        <p className="text-sm text-text-secondary">{candidate.city} вЂў {candidate.program}</p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {candidate.updated_at && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-bg-surface px-3 py-1.5">
              <Clock className="h-3 w-3 text-text-muted" />
              <span className="text-[11px] text-text-secondary">
                РћС†РµРЅРєР°:{" "}
                <span className="font-semibold text-white">
                  {new Date(candidate.updated_at).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            </div>
          )}
          {candidate.ensemble && candidate.ensemble.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-bg-surface px-3 py-1.5">
              <Cpu className="h-3 w-3 text-brand-green" />
              <span className="text-[11px] text-text-secondary">
                <span className="font-semibold text-brand-green">{candidate.ensemble.length}</span> РјРѕРґРµР»Рё Р°РЅСЃР°РјР±Р»СЏ
              </span>
            </div>
          )}
          {candidate.evaluation_session_id && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-bg-surface px-3 py-1.5">
              <Activity className="h-3 w-3 text-text-muted" />
              <span className="font-mono text-[10px] text-text-muted">
                {candidate.evaluation_session_id.slice(0, 8)}вЂ¦
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green" />
            </span>
            <span className="text-[11px] font-semibold text-brand-green">AI РѕС†РµРЅРєР° Р°РєС‚РёРІРЅР°</span>
          </div>
        </div>
      </div>

      <CandidateTabs>
        {(tab) => (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section className={cn(tab !== "overview" && "hidden xl:block")}>
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-5">
                    <div className="panel-soft p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">РС‚РѕРіРѕРІС‹Р№ score</p>
                      <ScoreSpherePanel score={candidate.final_score} />
                    </div>
                    <div className="panel-soft p-5">
                      <ConfidenceRing confidence={candidate.confidence} />
                    </div>
                    <AIDetectionBadge probability={candidate.ai_detection_prob} signals={candidate.ai_signals} />
                  </div>

                  <div className="space-y-5">
                    <div className="panel-soft p-5">
                      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">РџСЂРѕС„РёР»СЊ РёР·РјРµСЂРµРЅРёР№</p>
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
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">РџСЂРѕС„РёР»СЊ РёР·РјРµСЂРµРЅРёР№</p>
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

            <aside className="space-y-4">
              <div className={cn(tab !== "committee" && "hidden xl:block")}>
                {canCurrentUserVote ? (
                  <CommitteeVotePanel candidate={candidate} />
                ) : (
                  <div className="panel-soft p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Р РµР¶РёРј РїСЂРѕСЃРјРѕС‚СЂР°</p>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                      Р­С‚РѕС‚ РїСЂРѕС„РёР»СЊ РѕС‚РєСЂС‹С‚ РІ СЂРµР¶РёРјРµ С‡С‚РµРЅРёСЏ. Р“РѕР»РѕСЃРѕРІР°РЅРёРµ РґРѕСЃС‚СѓРїРЅРѕ С‚РѕР»СЊРєРѕ С‡Р»РµРЅР°Рј РєРѕРјРёСЃСЃРёРё.
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
  return (
    <div className="panel-soft p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Р—Р°С‰РёС‚Р° РѕС‚ РїСЂРµРґРІР·СЏС‚РѕСЃС‚Рё</p>
          <p className="text-xs text-text-muted">РљРѕР»Р»РµРіРёР°Р»СЊРЅРѕРµ СЂРµС€РµРЅРёРµ РєРѕРјРёСЃСЃРёРё</p>
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
  );
}

function ArtifactsPanel({ candidate }: { candidate: Candidate }) {
  return (
    <div className="panel-soft p-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">РџРѕРґС‚РІРµСЂР¶РґР°СЋС‰РёРµ РјР°С‚РµСЂРёР°Р»С‹</p>
      <div className="space-y-3">
        {candidate.artifacts?.slice(0, 3).map((artifact) => (
          <div key={artifact.id} className="panel-muted p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{artifact.name}</p>
              <span className="font-mono text-xs text-brand-green">{artifact.kind}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{artifact.extractedSignals.join(" вЂў ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePanels({ candidate }: { candidate: Candidate }) {
  return (
    <>
      {[
        { label: "Р¦РµР»Рё РєР°РЅРґРёРґР°С‚Р°", value: candidate.goals },
        { label: "РћРїС‹С‚", value: candidate.experience },
        { label: "РњРѕС‚РёРІР°С†РёСЏ", value: candidate.motivation_text },
        { label: "Р¤СЂР°РіРјРµРЅС‚ СЌСЃСЃРµ", value: candidate.essay_excerpt },
      ].filter((item) => item.value).map((item) => (
        <div key={item.label} className="panel-soft mb-4 p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">{item.label}</p>
          <p className="text-sm leading-relaxed text-text-secondary">{item.value}</p>
        </div>
      ))}
    </>
  );
}
