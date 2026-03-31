import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { getFairnessSummary, getRanking } from "@/lib/api";

export default async function AnalyticsPage() {
  const [candidates, fairness] = await Promise.all([getRanking(), getFairnessSummary()]);

  const average = (key: keyof (typeof candidates)[number]) =>
    candidates.length > 0
      ? Math.round(candidates.reduce((sum, candidate) => sum + Number(candidate[key]), 0) / candidates.length)
      : 0;

  const dimensionData = [
    { label: "Cognitive", value: average("cognitive") },
    { label: "Leadership", value: average("leadership") },
    { label: "Growth", value: average("growth") },
    { label: "Decision", value: average("decision") },
    { label: "Motivation", value: average("motivation") },
    { label: "Authenticity", value: average("authenticity") },
  ];

  const statusData = [
    { name: "Completed", value: candidates.filter((candidate) => candidate.status === "completed").length, color: "#A0A0A0" },
    { name: "Shortlist", value: candidates.filter((candidate) => candidate.status === "shortlisted").length, color: "#C8F000" },
    { name: "Flagged", value: candidates.filter((candidate) => candidate.status === "flagged").length, color: "#FF6B35" },
    { name: "Rejected", value: candidates.filter((candidate) => candidate.status === "rejected").length, color: "#E53935" },
  ];

  return (
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
  );
}
