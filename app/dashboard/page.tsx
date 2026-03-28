import { AlertTriangle, Star, TrendingUp, Users } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CandidateTable } from "@/components/dashboard/candidate-table";
import { CompliancePanel } from "@/components/dashboard/compliance-panel";
import { KPICard } from "@/components/dashboard/kpi-card";
import { ServiceStatusPanel } from "@/components/dashboard/service-status-panel";
import { getRanking } from "@/lib/api";
import { getServiceStatus } from "@/lib/service-status";

export default async function DashboardPage() {
  const candidates = await getRanking();
  const services = getServiceStatus();
  const avgScore =
    candidates.reduce((sum, candidate) => sum + candidate.final_score, 0) / candidates.length;
  const shortlisted = candidates.filter((candidate) => candidate.status === "shortlisted").length;
  const flagged = candidates.filter((candidate) => candidate.needs_manual_review).length;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Кандидатов в системе" value={candidates.length} icon={<Users className="h-4 w-4" />} highlight />
        <KPICard title="Средний score" value={avgScore} decimals={1} icon={<TrendingUp className="h-4 w-4" />} change={6} index={1} />
        <KPICard title="Шорт-лист" value={shortlisted} icon={<Star className="h-4 w-4" />} change={11} index={2} />
        <KPICard title="На ручную проверку" value={flagged} icon={<AlertTriangle className="h-4 w-4" />} change={-2} index={3} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
                Candidate Pool
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                Ранжированный список кандидатов
              </h2>
            </div>
            <div className="rounded-full border border-brand-green/20 bg-brand-green/8 px-4 py-2 font-mono text-xs text-brand-green">
              live update
            </div>
          </div>
          <CandidateTable candidates={candidates} />
        </div>

        <div className="space-y-6">
          <CompliancePanel />
          <ServiceStatusPanel services={services} />
          <ActivityFeed />
        </div>
      </section>
    </div>
  );
}
