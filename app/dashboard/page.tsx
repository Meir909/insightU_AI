import { AlertTriangle, Star, TrendingUp, Users } from "lucide-react";
import { CandidateTable } from "@/components/dashboard/candidate-table";
import { CompliancePanel } from "@/components/dashboard/compliance-panel";
import { EvaluationPipelinePanel } from "@/components/dashboard/evaluation-pipeline-panel";
import { KPICard } from "@/components/dashboard/kpi-card";
import { getRanking } from "@/lib/api";

export default async function DashboardPage() {
  const candidates = await getRanking();
  const avgScore = candidates.reduce((sum, candidate) => sum + candidate.final_score, 0) / Math.max(candidates.length, 1);
  const shortlisted = candidates.filter((candidate) => candidate.status === "shortlisted").length;
  const flagged = candidates.filter((candidate) => candidate.needs_manual_review).length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Обзор · inVision U</p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">Комиссионная панель отбора</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Комиссия видит общий пул кандидатов, объяснимые сигналы модели и принимает итоговое решение
              без лишнего визуального шума.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Кандидатов в системе" value={candidates.length} icon={<Users className="h-4 w-4" />} highlight />
        <KPICard title="Средний score" value={avgScore} decimals={1} icon={<TrendingUp className="h-4 w-4" />} change={6} index={1} />
        <KPICard title="Шортлист" value={shortlisted} icon={<Star className="h-4 w-4" />} change={11} index={2} />
        <KPICard title="На ручную проверку" value={flagged} icon={<AlertTriangle className="h-4 w-4" />} change={-2} index={3} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Пул кандидатов</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-white">Ранжированный список кандидатов</h3>
          </div>
          <CandidateTable candidates={candidates} />
        </div>

        <div className="space-y-4">
          <EvaluationPipelinePanel />
          <CompliancePanel />
        </div>
      </section>
    </div>
  );
}