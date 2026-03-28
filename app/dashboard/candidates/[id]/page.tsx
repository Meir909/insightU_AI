import { Flag, Star } from "lucide-react";
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
            {candidate.city} · {candidate.program} · anonymized profile {candidate.name}
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
        </div>

        <div className="space-y-4">
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
