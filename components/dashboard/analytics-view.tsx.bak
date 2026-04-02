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
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { label: "Fairness score", value: fairnessScore, suffix: "", helper: "целевой уровень выше 80" },
          { label: "Средняя уверенность", value: avgConfidence, suffix: "%", helper: "базовая уверенность по когорте" },
          { label: "Доля ручной проверки", value: manualReviewRate, suffix: "%", helper: "AI risk и low confidence" },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-white/6 bg-bg-surface p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">{item.label}</p>
            <p className="mt-4 font-mono text-5xl font-black text-brand-green">
              {item.value}
              {item.suffix}
            </p>
            <p className="mt-2 text-sm text-text-secondary">{item.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Dimension distribution</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Средние скоры по 6 измерениям</h2>
          <div className="mt-6 h-[320px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#A0A0A0", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#A0A0A0", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#222222",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {dimensionData.map((item) => (
                      <Cell key={item.label} fill="#C8F000" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-2xl bg-bg-elevated" />
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Status split</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Воронка решений комиссии</h2>
          <div className="mt-6 h-[320px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={108} paddingAngle={3}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#222222",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-2xl bg-bg-elevated" />
            )}
          </div>
          <div className="grid gap-3">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/6 bg-bg-elevated px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-sm text-text-secondary">{item.name}</span>
                </div>
                <span className="font-mono text-sm font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            label: "Средний итоговый score",
            value: cohortAverageScore,
            suffix: "",
            helper: "средний общий результат по всем кандидатам",
          },
          {
            label: "Разброс между городами",
            value: scoreSpread,
            suffix: "",
            helper: "разница между лучшей и худшей городской когортой",
          },
          {
            label: "Fairness warnings",
            value: warningCount,
            suffix: "",
            helper: "число сигналов, требующих проверки комиссией",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-white/6 bg-bg-surface p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">{item.label}</p>
            <p className="mt-4 font-mono text-5xl font-black text-white">
              {item.value}
              {item.suffix}
            </p>
            <p className="mt-2 text-sm text-text-secondary">{item.helper}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
