"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Quote, Users, Brain } from "lucide-react";
import { useState } from "react";
import { ScoreBar } from "@/components/ui/score-bar";
import { cn } from "@/lib/utils";
import type { AdvancedExplainability, ModelContribution } from "@/lib/types";

const tabs = [
  { id: "features", label: "Признаки", icon: BarChart3 },
  { id: "explanation", label: "Объяснение", icon: Brain },
  { id: "quotes", label: "Цитаты", icon: Quote },
  { id: "models", label: "Модели", icon: Users },
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
  explainabilityV2,
}: {
  scores: Record<string, number>;
  reasoning: string;
  keyQuotes: string[];
  explainabilityV2?: AdvancedExplainability;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("features");

  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
        Прозрачность оценки
      </p>

      {/* Tab selector */}
      <div className="mb-5 grid grid-cols-4 gap-1 rounded-2xl bg-bg-elevated p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-all duration-150",
              tab === id ? "bg-brand-green text-black" : "text-text-muted hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:block">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* Tab: Признаки */}
        {tab === "features" && (
          <motion.div
            key="features"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {Object.entries(labels).map(([key, label], index) => (
              <ScoreBar
                key={key}
                label={label}
                score={scores[key] ?? 0}
                weight={weights[key]}
                index={index}
              />
            ))}
          </motion.div>
        )}

        {/* Tab: Объяснение */}
        {tab === "explanation" && (
          <motion.div
            key="explanation"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {explainabilityV2 ? (
              <>
                {/* Verdict */}
                <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand-green">
                    Вердикт AI системы
                  </p>
                  <p className="text-sm font-semibold leading-relaxed text-white">
                    {explainabilityV2.verdict}
                  </p>
                </div>

                {/* Plain language */}
                <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Для комиссии
                  </p>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    {explainabilityV2.plainLanguage}
                  </p>
                </div>

                {/* Evidence */}
                {explainabilityV2.evidence.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Доказательная база
                    </p>
                    {explainabilityV2.evidence.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-white/6 bg-bg-elevated p-3"
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                          <div>
                            <p className="text-xs font-semibold text-white">{item.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                              {item.summary}
                            </p>
                            {item.supports.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {item.supports.map((dim) => (
                                  <span
                                    key={dim}
                                    className="rounded-md bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-green"
                                  >
                                    {labels[dim] ?? dim}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fairness notes */}
                {explainabilityV2.fairnessNotes.length > 0 && (
                  <div className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Справедливость и ограничения
                    </p>
                    <div className="space-y-1.5">
                      {explainabilityV2.fairnessNotes.map((note, i) => (
                        <p key={i} className="text-[11px] leading-relaxed text-text-secondary">
                          · {note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-text-muted">
                  Детальное объяснение появится после завершения интервью
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Цитаты */}
        {tab === "quotes" && (
          <motion.div
            key="quotes"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {keyQuotes.length > 0 ? (
              keyQuotes.map((quote, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-2xl border border-white/6 bg-bg-elevated p-4"
                >
                  <div className="mt-1 w-0.5 shrink-0 rounded-full bg-brand-green" />
                  <p className="text-xs italic leading-relaxed text-text-secondary">«{quote}»</p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-text-muted">
                  Цитаты из интервью появятся после его завершения
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Модели */}
        {tab === "models" && (
          <motion.div
            key="models"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-[11px] leading-relaxed text-text-secondary">
              Итоговый скор — взвешенное среднее нескольких моделей. Ни одна модель не принимает решение самостоятельно. Финальное слово всегда за комиссией.
            </p>
            {(explainabilityV2?.modelContributions ?? []).map((contribution: ModelContribution) => {
              const pct = Math.round(contribution.weight * 100);
              return (
                <div
                  key={contribution.model}
                  className="rounded-2xl border border-white/6 bg-bg-elevated p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white">{contribution.model}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-brand-green">
                        {contribution.score}
                      </span>
                      <span className="rounded-md bg-white/6 px-1.5 py-0.5 text-[10px] text-text-muted">
                        ×{pct}%
                      </span>
                    </div>
                  </div>
                  <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/6">
                    <motion.div
                      className="h-full rounded-full bg-brand-green/60"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <p className="text-[11px] leading-relaxed text-text-muted">
                    {contribution.rationale}
                  </p>
                </div>
              );
            })}
            {!explainabilityV2?.modelContributions?.length && (
              <div className="py-8 text-center">
                <p className="text-sm text-text-muted">
                  Данные о моделях появятся после завершения интервью
                </p>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Reasoning — always visible if present */}
      {reasoning && (
        <div className="mt-4 rounded-2xl border border-white/6 bg-bg-elevated p-4">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Заключение AI
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">{reasoning}</p>
        </div>
      )}
    </div>
  );
}
