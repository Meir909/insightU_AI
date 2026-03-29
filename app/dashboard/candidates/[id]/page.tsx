import { Flag, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AIDetectionBadge } from "@/components/dashboard/ai-detection-badge";
import { ConfidenceRing } from "@/components/dashboard/confidence-ring";
import { ExplainabilityBlock } from "@/components/dashboard/explainability-block";
import { ScoreRadar } from "@/components/dashboard/score-radar";
import { ScoreSpherePanel } from "@/components/dashboard/score-sphere-panel";
import { GreenButton } from "@/components/ui/green-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCandidate, getRanking } from "@/lib/api";

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
  const candidate = await getCandidate(id);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-text-secondary transition-colors hover:text-white">
            ← Назад к таблице
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-black tracking-tight text-white">{candidate.code}</h2>
            <StatusBadge status={candidate.status} />
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {candidate.city} • {candidate.program} • anonymized profile {candidate.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <GreenButton icon={<Star className="h-4 w-4" />}>Добавить в shortlist</GreenButton>
          <GreenButton variant="danger" icon={<Flag className="h-4 w-4" />}>
            Ручной флаг
          </GreenButton>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/6 bg-bg-surface p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
              Итоговый score
            </p>
            <ScoreSpherePanel score={candidate.final_score} />
          </div>

          <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
            <ConfidenceRing confidence={candidate.confidence} />
          </div>

          <AIDetectionBadge probability={candidate.ai_detection_prob} signals={candidate.ai_signals} />

          <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-green/10 p-3 text-brand-green">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Anti-corruption guard</p>
                <p className="text-xs text-text-muted">Multi-review decision rule</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {candidate.committee_review?.corruptionGuard}
            </p>
            <div className="mt-4 grid gap-3">
              {candidate.committee_review?.votes.map((vote) => (
                <div key={vote.memberId} className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
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

        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
              Профиль измерений
            </p>
            <ScoreRadar scores={scores} />
          </div>

          <ExplainabilityBlock
            scores={scores}
            reasoning={candidate.reasoning}
            keyQuotes={candidate.key_quotes}
          />

          <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
              Explainability 2.0
            </p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-white">
              {candidate.explainability_v2?.verdict}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {candidate.explainability_v2?.plainLanguage}
            </p>
            <div className="mt-5 grid gap-3">
              {candidate.explainability_v2?.evidence.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.summary}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    Supports: {item.supports.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/6 bg-bg-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-3 w-1 rounded-full bg-brand-green" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                Ensemble models
              </p>
            </div>
            <div className="space-y-3">
              {candidate.ensemble?.map((model) => (
                <div key={model.model} className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{model.model}</p>
                    <span className="font-mono text-sm font-bold text-brand-green">{model.score}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{model.rationale}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    Weight {(model.weight * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/6 bg-bg-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-3 w-1 rounded-full bg-brand-green" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                Multimodal artifacts
              </p>
            </div>
            <div className="space-y-3">
              {candidate.artifacts?.map((artifact) => (
                <div key={artifact.id} className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{artifact.name}</p>
                    <span className="font-mono text-xs text-brand-green">{artifact.kind}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {artifact.extractedSignals.join(" • ")}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    Evidence weight {(artifact.evidenceWeight * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {[
            { label: "Цели кандидата", value: candidate.goals },
            { label: "Опыт", value: candidate.experience },
            { label: "Мотивация", value: candidate.motivation_text },
            { label: "Фрагмент эссе", value: candidate.essay_excerpt },
          ].map((item) => (
            <div key={item.label} className="rounded-[24px] border border-white/6 bg-bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-brand-green" />
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                  {item.label}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
