"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import type { PredictiveInsights } from "@/lib/services/predictive-analytics";

interface Props {
  insights: PredictiveInsights;
}

export function PredictivePanel({ insights }: Props) {
  const trendIcon =
    insights.cohortQualityTrend === "improving" ? (
      <TrendingUp className="h-4 w-4 text-brand-green" />
    ) : insights.cohortQualityTrend === "declining" ? (
      <TrendingDown className="h-4 w-4 text-red-400" />
    ) : (
      <Minus className="h-4 w-4 text-text-muted" />
    );

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Предиктивный анализ</p>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-brand-green" />
            <p className="text-[10px] font-semibold text-text-muted">Прогноз финалистов</p>
          </div>
          <p className="mt-2 text-2xl font-black text-white">~{insights.expectedShortlistCount}</p>
          <p className="mt-0.5 text-[10px] text-text-muted">
            конверсия {insights.shortlistConversionRate}%
          </p>
        </div>

        <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
            <p className="text-[10px] font-semibold text-text-muted">Требуют внимания</p>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{insights.atRiskCount}</p>
          <p className="mt-0.5 text-[10px] text-text-muted">с риск-флагами</p>
        </div>

        <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
          <div className="flex items-center gap-2">
            {trendIcon}
            <p className="text-[10px] font-semibold text-text-muted">Качество потока</p>
          </div>
          <p className={`mt-2 text-sm font-black ${
            insights.cohortQualityTrend === "improving"
              ? "text-brand-green"
              : insights.cohortQualityTrend === "declining"
                ? "text-red-400"
                : "text-white"
          }`}>
            {insights.cohortQualityTrend === "improving"
              ? "Растёт"
              : insights.cohortQualityTrend === "declining"
                ? "Снижается"
                : "Стабильно"}
          </p>
          <p className="mt-0.5 text-[10px] text-text-muted">{insights.cohortInsight}</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Воронка отбора</p>
        <div className="space-y-2">
          {[
            { label: "Всего кандидатов", value: insights.funnelStats.total, color: "bg-white/30" },
            { label: "В процессе", value: insights.funnelStats.inProgress, color: "bg-blue-400/60" },
            { label: "Завершили интервью", value: insights.funnelStats.completed, color: "bg-white/50" },
            { label: "Шорт-лист", value: insights.funnelStats.shortlisted, color: "bg-brand-green" },
            { label: "Отмечены", value: insights.funnelStats.flagged, color: "bg-yellow-400/70" },
            { label: "Отклонены", value: insights.funnelStats.rejected, color: "bg-red-400/60" },
          ].map(({ label, value, color }) => {
            const pct = insights.funnelStats.total > 0 ? (value / insights.funnelStats.total) * 100 : 0;
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="w-36 text-[10px] text-text-muted">{label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-[10px] font-bold text-white">{value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* At-risk candidates */}
      {insights.atRiskCandidates.length > 0 && (
        <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
            Кандидаты под риском
          </p>
          <div className="space-y-2">
            {insights.atRiskCandidates.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/candidates/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-3 py-2 transition hover:bg-white/6"
              >
                <div>
                  <p className="text-xs font-semibold text-white">{c.name}</p>
                  <p className="text-[10px] text-yellow-400">{c.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{c.score}</span>
                  <ArrowRight className="h-3 w-3 text-text-muted" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hidden gems */}
      {insights.hiddenGems.length > 0 && (
        <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-brand-green">
            Скрытые таланты
          </p>
          <div className="space-y-2">
            {insights.hiddenGems.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/candidates/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-white/6 bg-white/3 px-3 py-2 transition hover:bg-white/6"
              >
                <div>
                  <p className="text-xs font-semibold text-white">{c.name}</p>
                  <p className="text-[10px] text-brand-green">{c.strengths.slice(0, 2).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{c.score}</span>
                  <ArrowRight className="h-3 w-3 text-text-muted" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommended actions */}
      <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Рекомендации для комиссии
        </p>
        <div className="space-y-2">
          {insights.recommendedActions.map((action, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-green" />
              <p className="text-xs leading-relaxed text-text-secondary">{action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
