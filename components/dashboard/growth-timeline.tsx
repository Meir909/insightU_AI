"use client";

import { TrendingUp, TrendingDown, Minus, FileText, MessageSquare, Video, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export interface EvaluationSnapshot {
  id: string;
  overallScore: number | null;
  confidence: number | null;
  evaluatorType: string | null;
  reasoning: string | null;
  createdAt: string;
}

interface Props {
  evaluations: EvaluationSnapshot[];
}

function phaseIcon(evaluatorType: string | null) {
  switch (evaluatorType) {
    case "motivation_llm": return FileText;
    case "llm_scorer": return Sparkles;
    case "media_analysis": return Video;
    default: return MessageSquare;
  }
}

function phaseLabel(evaluatorType: string | null): string {
  switch (evaluatorType) {
    case "motivation_llm": return "Анкета";
    case "llm_scorer": return "Интервью";
    case "media_analysis": return "Медиа";
    case "heuristic": return "Эвристика";
    case "committee": return "Комиссия";
    default: return "Оценка";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { label: string; evaluatorType: string | null } }>;
  label?: string;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-white/10 bg-bg-elevated px-3 py-2 shadow-xl">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        {phaseLabel(item.payload.evaluatorType)}
      </p>
      <p className="mt-0.5 text-sm font-black text-white">{item.value} баллов</p>
    </div>
  );
}

export function GrowthTimeline({ evaluations }: Props) {
  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="rounded-2xl border border-white/6 bg-bg-elevated p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Путь кандидата</p>
        <p className="mt-3 text-sm text-text-secondary">
          История оценок появится после заполнения анкеты и прохождения интервью.
        </p>
      </div>
    );
  }

  const sorted = [...evaluations]
    .filter((e) => e.overallScore !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (sorted.length === 0) return null;

  const chartData = sorted.map((e, idx) => ({
    label: formatDate(e.createdAt),
    score: Math.round(e.overallScore ?? 0),
    evaluatorType: e.evaluatorType,
    idx,
  }));

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const delta = previous ? Math.round((latest.overallScore ?? 0) - (previous.overallScore ?? 0)) : 0;

  const avgScore = Math.round(sorted.reduce((s, e) => s + (e.overallScore ?? 0), 0) / sorted.length);

  return (
    <div className="rounded-2xl border border-white/6 bg-bg-elevated p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Путь кандидата</p>
        <div className="flex items-center gap-2">
          {sorted.length > 1 && (
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                delta > 0
                  ? "bg-brand-green/15 text-brand-green"
                  : delta < 0
                    ? "bg-red-500/15 text-red-400"
                    : "bg-white/8 text-text-muted"
              }`}
            >
              {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {delta > 0 ? "+" : ""}{delta} от предыдущей
            </span>
          )}
          <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-bold text-white">
            {latest.overallScore} / 100
          </span>
        </div>
      </div>

      {/* Chart — only show if 2+ data points */}
      {sorted.length >= 2 ? (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={avgScore} stroke="#ffffff15" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#c8f000"
                strokeWidth={2}
                dot={{ r: 3, fill: "#c8f000", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#c8f000" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-brand-green/20 bg-brand-green/5 px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-green" />
          <p className="text-xs text-text-secondary">
            Начало пути зафиксировано. График появится после следующей оценки.
          </p>
        </div>
      )}

      {/* Snapshots list */}
      <div className="space-y-2">
        {sorted.map((e, idx) => {
          const Icon = phaseIcon(e.evaluatorType);
          const prev = idx > 0 ? sorted[idx - 1] : null;
          const d = prev ? Math.round((e.overallScore ?? 0) - (prev.overallScore ?? 0)) : null;
          return (
            <div key={e.id} className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Icon className="h-3.5 w-3.5 text-text-muted" />
              </div>
              <div className="flex flex-1 items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">{phaseLabel(e.evaluatorType)}</p>
                  <p className="text-[10px] text-text-muted">{formatDate(e.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {d !== null && (
                    <span className={`text-[10px] font-bold ${d > 0 ? "text-brand-green" : d < 0 ? "text-red-400" : "text-text-muted"}`}>
                      {d > 0 ? "+" : ""}{d}
                    </span>
                  )}
                  <span className="text-sm font-black text-white">{Math.round(e.overallScore ?? 0)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reasoning from latest */}
      {latest.reasoning && (
        <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Последнее заключение</p>
          <p className="text-xs leading-relaxed text-text-secondary">{latest.reasoning}</p>
        </div>
      )}
    </div>
  );
}
