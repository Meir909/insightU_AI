"use client";

import { motion } from "framer-motion";
import { BarChart3, Quote, Users } from "lucide-react";
import { useState } from "react";
import { ScoreBar } from "@/components/ui/score-bar";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "features", label: "Признаки", icon: BarChart3 },
  { id: "quotes", label: "Цитаты", icon: Quote },
  { id: "compare", label: "Сравнение", icon: Users },
] as const;

const labels: Record<string, string> = {
  cognitive: "Мышление",
  leadership: "Лидерство",
  growth: "Рост",
  decision: "Решения",
  motivation: "Мотивация",
  authenticity: "Аутентичность",
};

const weights: Record<string, number> = {
  cognitive: 0.25,
  leadership: 0.2,
  growth: 0.2,
  decision: 0.15,
  motivation: 0.1,
  authenticity: 0.1,
};

export function ExplainabilityBlock({
  scores,
  reasoning,
  keyQuotes,
}: {
  scores: Record<string, number>;
  reasoning: string;
  keyQuotes: string[];
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("features");

  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
        Explainability
      </p>

      <div className="mb-5 flex gap-1 rounded-2xl bg-bg-elevated p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150",
              tab === id ? "bg-brand-green text-black" : "text-text-muted hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "features" ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {Object.entries(labels).map(([key, label], index) => (
            <ScoreBar
              key={key}
              label={label}
              score={scores[key] ?? 0}
              weight={weights[key]}
              index={index}
            />
          ))}
          <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
            <p className="text-sm leading-relaxed text-text-secondary">{reasoning}</p>
          </div>
        </motion.div>
      ) : null}

      {tab === "quotes" ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {keyQuotes.map((quote) => (
            <div key={quote} className="flex gap-3 rounded-2xl border border-white/6 bg-bg-elevated p-4">
              <div className="w-1 rounded-full bg-brand-green" />
              <p className="text-sm italic leading-relaxed text-text-secondary">«{quote}»</p>
            </div>
          ))}
        </motion.div>
      ) : null}

      {tab === "compare" ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <p className="text-xs text-text-muted">Позиция в текущем пуле по измерениям</p>
          {Object.entries(labels).map(([key, label]) => {
            const percentile = Math.min(95, Math.max(48, Math.round((scores[key] ?? 0) * 0.9)));

            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-text-secondary">{label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/6">
                  <motion.div
                    className="h-full rounded-full bg-brand-green"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentile}%` }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                  />
                </div>
                <span className="w-16 text-right font-mono text-xs font-bold text-brand-green">
                  Top {100 - percentile}%
                </span>
              </div>
            );
          })}
        </motion.div>
      ) : null}
    </div>
  );
}
