"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsViewProps = {
  dimensionData: { label: string; value: number }[];
  statusData: { name: string; value: number; color: string }[];
  fairnessScore: number;
  avgConfidence: number;
  manualReviewRate: number;
  cohortAverageScore: number;
  scoreSpread: number;
  warningCount: number;
};

function StatCard({
  label,
  value,
  suffix = "",
  helper,
  accent = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  helper: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-[24px] border border-white/6 bg-bg-surface p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">{label}</p>
      <div>
        <p className={`font-mono text-4xl font-black leading-none ${accent ? "text-brand-green" : "text-white"}`}>
          {value}{suffix}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">{helper}</p>
      </div>
    </div>
  );
}

export function AnalyticsView({
  dimensionData,
  statusData,
  fairnessScore,
  avgConfidence,
  manualReviewRate,
  cohortAverageScore,
  scoreSpread,
  warningCount,
}: AnalyticsViewProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Аналитика · inVision U</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-white">Статистика пула кандидатов</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Агрегированные метрики по всем кандидатам, fairness-отчёт и распределение решений комиссии.
        </p>
      </div>

      {/* Top KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Fairness score" value={fairnessScore} helper="Целевой уровень выше 80" accent />
        <StatCard label="Средняя уверенность" value={avgConfidence} suffix="%" helper="Базовая уверенность по когорте" accent />
        <StatCard label="Доля ручной проверки" value={manualReviewRate} suffix="%" helper="AI risk и low confidence" />
      </section>

      {/* Charts row */}
      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Bar chart */}
        <div className="rounded-[24px] border border-white/6 bg-bg-surface p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Dimension distribution</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">Средние скоры по 6 измерениям</h3>
          <div className="mt-6 h-[280px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionData} barCategoryGap="32%">
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{
                      background: "var(--color-bg-surface, #141414)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      fontSize: 12,
                      color: "#ffffff",
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {dimensionData.map((item) => (
                      <Cell key={item.label} fill="#C8F000" fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-2xl bg-bg-elevated" />
            )}
          </div>
        </div>

        {/* Pie chart + legend */}
        <div className="rounded-[24px] border border-white/6 bg-bg-surface p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Status split</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">Воронка решений комиссии</h3>
          <div className="mt-4 h-[200px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-bg-surface, #141414)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      fontSize: 12,
                      color: "#ffffff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-2xl bg-bg-elevated" />
            )}
          </div>
          <div className="mt-4 space-y-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-white/6 bg-bg-elevated px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="text-sm text-text-secondary">{item.name}</span>
                </div>
                <span className="font-mono text-sm font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Средний итоговый score"
          value={cohortAverageScore}
          helper="Средний общий результат по всем кандидатам"
        />
        <StatCard
          label="Разброс между городами"
          value={scoreSpread}
          helper="Разница между лучшей и худшей городской когортой"
        />
        <StatCard
          label="Fairness warnings"
          value={warningCount}
          helper="Число сигналов, требующих проверки комиссией"
        />
      </section>
    </div>
  );
}
