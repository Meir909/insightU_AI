"use client";

import { useSyncExternalStore } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const labels: Record<string, string> = {
  cognitive: "Мышление",
  leadership: "Лидерство",
  growth: "Рост",
  decision: "Решения",
  motivation: "Мотивация",
  authenticity: "Аутентичность",
};

export function ScoreRadar({ scores }: { scores: Record<string, number> }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const data = Object.entries(labels).map(([key, label]) => ({
    subject: label,
    score: scores[key] ?? 0,
    fullMark: 100,
  }));

  if (!mounted) {
    return <div className="h-[310px] rounded-2xl bg-bg-elevated" />;
  }

  return (
    <ResponsiveContainer width="100%" height={310}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "#A0A0A0", fontSize: 11, fontFamily: "var(--font-sans)" }}
        />
        <PolarRadiusAxis axisLine={false} tick={false} domain={[0, 100]} />
        <Radar
          dataKey="score"
          stroke="#C8F000"
          fill="#C8F000"
          fillOpacity={0.14}
          strokeWidth={1.8}
        />
        <Tooltip
          contentStyle={{
            background: "#222222",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            color: "#FFFFFF",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
