import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, hasBackofficeAccess } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import { getRanking } from "@/lib/api";

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session || !hasBackofficeAccess(session.role)) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  const candidates = await getRanking();
  const byCity = new Map<string, { count: number; avgScore: number; manualReviews: number }>();
  const byStatus = new Map<
    string,
    { count: number; avgScore: number; avgConfidence: number; avgAiRisk: number }
  >();
  const riskBands = {
    low: { count: 0, manualReviews: 0 },
    medium: { count: 0, manualReviews: 0 },
    high: { count: 0, manualReviews: 0 },
  };

  for (const candidate of candidates) {
    const cityEntry = byCity.get(candidate.city) || {
      count: 0,
      avgScore: 0,
      manualReviews: 0,
    };
    cityEntry.count += 1;
    cityEntry.avgScore += candidate.final_score;
    cityEntry.manualReviews += candidate.needs_manual_review ? 1 : 0;
    byCity.set(candidate.city, cityEntry);

    const statusEntry = byStatus.get(candidate.status) || {
      count: 0,
      avgScore: 0,
      avgConfidence: 0,
      avgAiRisk: 0,
    };
    statusEntry.count += 1;
    statusEntry.avgScore += candidate.final_score;
    statusEntry.avgConfidence += candidate.confidence * 100;
    statusEntry.avgAiRisk += candidate.ai_detection_prob * 100;
    byStatus.set(candidate.status, statusEntry);

    const band =
      candidate.ai_detection_prob >= 0.45
        ? "high"
        : candidate.ai_detection_prob >= 0.2
          ? "medium"
          : "low";
    riskBands[band].count += 1;
    riskBands[band].manualReviews += candidate.needs_manual_review ? 1 : 0;
  }

  const cityBreakdown = Array.from(byCity.entries()).map(([city, value]) => ({
    city,
    count: value.count,
    average_score: Math.round((value.avgScore / value.count) * 10) / 10,
    manual_review_rate: Math.round((value.manualReviews / value.count) * 100),
  }));

  const statusBreakdown = Array.from(byStatus.entries()).map(([status, value]) => ({
    status,
    count: value.count,
    average_score: Math.round((value.avgScore / value.count) * 10) / 10,
    average_confidence: Math.round(value.avgConfidence / value.count),
    average_ai_risk: Math.round(value.avgAiRisk / value.count),
  }));

  const averageScore =
    candidates.length > 0
      ? candidates.reduce((sum, candidate) => sum + candidate.final_score, 0) / candidates.length
      : 0;
  const averageConfidence =
    candidates.length > 0
      ? candidates.reduce((sum, candidate) => sum + candidate.confidence * 100, 0) /
        candidates.length
      : 0;
  const manualReviewRate =
    candidates.length > 0
      ? (candidates.filter((candidate) => candidate.needs_manual_review).length /
          candidates.length) *
        100
      : 0;
  const scoreSpread =
    cityBreakdown.length > 1
      ? Math.max(...cityBreakdown.map((item) => item.average_score)) -
        Math.min(...cityBreakdown.map((item) => item.average_score))
      : 0;
  const fairnessScore = Math.max(
    0,
    Math.round((100 - scoreSpread * 1.5 - manualReviewRate * 0.2) * 10) / 10,
  );
  const escalationNeeded = fairnessScore < 75 || scoreSpread > 15 || manualReviewRate > 35;

  return addSecurityHeaders(
    NextResponse.json({
      summary: {
        fairness_score: fairnessScore,
        cohort_average_score: Math.round(averageScore * 10) / 10,
        cohort_average_confidence: Math.round(averageConfidence),
        manual_review_rate: Math.round(manualReviewRate),
        score_spread_between_cities: Math.round(scoreSpread * 10) / 10,
        escalation_needed: escalationNeeded,
      },
      city_breakdown: cityBreakdown,
      status_breakdown: statusBreakdown,
      risk_band_breakdown: {
        low: {
          count: riskBands.low.count,
          manual_review_rate:
            riskBands.low.count > 0
              ? Math.round((riskBands.low.manualReviews / riskBands.low.count) * 100)
              : 0,
        },
        medium: {
          count: riskBands.medium.count,
          manual_review_rate:
            riskBands.medium.count > 0
              ? Math.round((riskBands.medium.manualReviews / riskBands.medium.count) * 100)
              : 0,
        },
        high: {
          count: riskBands.high.count,
          manual_review_rate:
            riskBands.high.count > 0
              ? Math.round((riskBands.high.manualReviews / riskBands.high.count) * 100)
              : 0,
        },
      },
      diagnostics: {
        notes: [
          scoreSpread > 15
            ? "Выявлен высокий межгородской разброс средних score."
            : "Критического межгородского разброса не выявлено.",
          manualReviewRate > 35
            ? "Доля manual review выше контрольного порога."
            : "Доля manual review находится в нормальном диапазоне.",
          averageConfidence < 65
            ? "Средняя уверенность модели ниже желаемого уровня."
            : "Средняя уверенность модели находится в допустимом диапазоне.",
        ],
        escalation_rule:
          "Отчёт эскалируется, если fairness score < 75, score spread > 15 или manual review rate > 35%.",
      },
      warnings: [
        ...(scoreSpread > 15
          ? ["Высокий разрыв средних score между городами требует ручной проверки выборки."]
          : []),
        ...(manualReviewRate > 35
          ? ["Слишком высокая доля manual review: критерии или пороги требуют калибровки."]
          : []),
        ...(averageConfidence < 65
          ? ["Средняя уверенность модели ниже контрольного порога."]
          : []),
      ],
    }),
  );
}
