"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, Sparkles, Info } from "lucide-react";

export function AIDetectionBadge({
  probability,
  signals,
}: {
  probability: number;
  signals: string[];
}) {
  const pct = Math.round(probability * 100);

  const config =
    pct < 30
      ? {
          icon: ShieldCheck,
          label: "Аутентично",
          sublabel: "Высокая вероятность живого автора",
          color: "#C8F000",
          wrapper: "border-brand-green/15 bg-brand-green/[0.04]",
          barBg: "#C8F000",
          verdict: "likely_human" as const,
        }
      : pct < 72
        ? {
            icon: AlertTriangle,
            label: "Неопределённо",
            sublabel: "Рекомендуется ручная проверка",
            color: "#F5A623",
            wrapper: "border-status-mid/15 bg-status-mid/[0.04]",
            barBg: "#F5A623",
            verdict: "uncertain" as const,
          }
        : {
            icon: Sparkles,
            label: "Вероятно AI",
            sublabel: "Высокий риск AI-генерации. Проверьте вручную",
            color: "#BF5AF2",
            wrapper: "border-status-ai/20 bg-status-ai/[0.06]",
            barBg: "#BF5AF2",
            verdict: "likely_ai" as const,
          };

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[24px] border p-5 ${config.wrapper}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-black/15 p-2.5 shrink-0">
          <Icon className="h-4 w-4" style={{ color: config.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
            AI-детектор контента
          </p>
          <p className="text-sm font-bold leading-tight" style={{ color: config.color }}>
            {config.label} — {pct}%
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
            {config.sublabel}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/6">
        <motion.div
          className="h-full rounded-full"
          style={{ background: config.barBg, boxShadow: pct >= 72 ? `0 0 8px ${config.barBg}60` : "none" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.85, ease: "easeOut" }}
        />
      </div>

      {/* Threshold markers */}
      <div className="mb-3 flex justify-between text-[10px] text-text-muted">
        <span>0% — Человек</span>
        <span className="text-[#F5A623]">45% — Проверить</span>
        <span className="text-[#BF5AF2]">72% — AI</span>
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <div className="space-y-1.5 border-t border-white/6 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3 w-3 text-text-muted" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Сигналы детектора</p>
          </div>
          {signals.slice(0, 4).map((signal) => (
            <p key={signal} className="text-[11px] leading-relaxed text-text-secondary">
              · {signal}
            </p>
          ))}
        </div>
      )}

      {/* High risk warning */}
      {config.verdict === "likely_ai" && (
        <div className="mt-3 rounded-xl border border-[#BF5AF2]/20 bg-[#BF5AF2]/8 px-3 py-2">
          <p className="text-[11px] font-semibold text-[#BF5AF2]">
            ⚠ Рекомендуется отдельная проверка эссе и прикреплённых материалов перед голосованием
          </p>
        </div>
      )}
    </motion.div>
  );
}
