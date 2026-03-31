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

  for (const candidate of candidates) {
    const current = byCity.get(candidate.city) || { count: 0, avgScore: 0, manualReviews: 0 };
    current.count += 1;
    current.avgScore += candidate.final_score;
    current.manualReviews += candidate.needs_manual_review ? 1 : 0;
    byCity.set(candidate.city, current);
  }

  const cityBreakdown = Array.from(byCity.entries()).map(([city, value]) => ({
    city,
    count: value.count,
    average_score: Math.round((value.avgScore / value.count) * 10) / 10,
    manual_review_rate: Math.round((value.manualReviews / value.count) * 100),
  }));

  const averageScore =
    candidates.length > 0 ? candidates.reduce((sum, candidate) => sum + candidate.final_score, 0) / candidates.length : 0;
  const manualReviewRate =
    candidates.length > 0
      ? (candidates.filter((candidate) => candidate.needs_manual_review).length / candidates.length) * 100
      : 0;
  const scoreSpread =
    cityBreakdown.length > 1
      ? Math.max(...cityBreakdown.map((item) => item.average_score)) - Math.min(...cityBreakdown.map((item) => item.average_score))
      : 0;
  const fairnessScore = Math.max(0, Math.round((100 - scoreSpread * 1.5 - manualReviewRate * 0.2) * 10) / 10);

  return addSecurityHeaders(
    NextResponse.json({
      summary: {
        fairness_score: fairnessScore,
        cohort_average_score: Math.round(averageScore * 10) / 10,
        manual_review_rate: Math.round(manualReviewRate),
        score_spread_between_cities: Math.round(scoreSpread * 10) / 10,
      },
      city_breakdown: cityBreakdown,
      warnings: [
        ...(scoreSpread > 15 ? ["Высокий разрыв средних score между городами требует ручной проверки выборки."] : []),
        ...(manualReviewRate > 35 ? ["Слишком высокая доля manual review: возможно, критерии или пороги требуют калибровки."] : []),
      ],
    }),
  );
}
