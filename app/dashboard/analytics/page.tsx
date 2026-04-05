import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { PredictivePanel } from "@/components/dashboard/predictive-panel";
import { getFairnessSummary, getRanking } from "@/lib/api";
import { generatePredictiveInsights } from "@/lib/services/predictive-analytics";

export default async function AnalyticsPage() {
  const [candidates, fairness] = await Promise.all([getRanking(), getFairnessSummary()]);

  const average = (key: keyof (typeof candidates)[number]) =>
    candidates.length > 0
      ? Math.round(candidates.reduce((sum, candidate) => sum + Number(candidate[key]), 0) / candidates.length)
      : 0;

  const dimensionData = [
    { label: "Когнитивность", value: average("cognitive") },
    { label: "Лидерство", value: average("leadership") },
    { label: "Рост", value: average("growth") },
    { label: "Решения", value: average("decision") },
    { label: "Мотивация", value: average("motivation") },
    { label: "Аутентичность", value: average("authenticity") },
  ];

  const statusData = [
    { name: "Завершили", value: candidates.filter((candidate) => candidate.status === "completed").length, color: "#A0A0A0" },
    { name: "Шорт-лист", value: candidates.filter((candidate) => candidate.status === "shortlisted").length, color: "#C8F000" },
    { name: "Флаг", value: candidates.filter((candidate) => candidate.status === "flagged").length, color: "#FF6B35" },
    { name: "Отклонены", value: candidates.filter((candidate) => candidate.status === "rejected").length, color: "#E53935" },
  ];

  const predictiveInsights = generatePredictiveInsights(candidates);

  return (
    <div className="space-y-8">
      <AnalyticsView
        dimensionData={dimensionData}
        statusData={statusData}
        fairnessScore={fairness.fairnessScore}
        avgConfidence={fairness.avgConfidence}
        manualReviewRate={fairness.manualReviewRate}
        cohortAverageScore={fairness.cohortAverageScore ?? 0}
        scoreSpread={fairness.scoreSpread ?? 0}
        warningCount={fairness.warningCount ?? 0}
      />
      <div className="panel-soft p-6">
        <PredictivePanel insights={predictiveInsights} />
      </div>
    </div>
  );
}
