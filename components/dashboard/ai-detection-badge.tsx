"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";

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
          color: "#C8F000",
          wrapper: "border-brand-green/15 bg-brand-green/6",
        }
      : pct < 70
        ? {
            icon: AlertTriangle,
            label: "Неопределённо",
            color: "#F5A623",
            wrapper: "border-status-mid/15 bg-status-mid/6",
          }
        : {
            icon: Sparkles,
            label: "Вероятно AI",
            color: "#BF5AF2",
            wrapper: "border-status-ai/15 bg-status-ai/6",
          };

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[24px] border p-5 ${config.wrapper}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-black/15 p-2.5">
          <Icon className="h-4 w-4" style={{ color: config.color }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
            AI-детектор
          </p>
          <p className="text-sm font-bold" style={{ color: config.color }}>
            {config.label} · {pct}%
          </p>
        </div>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/6">
        <motion.div
          className="h-full rounded-full"
          style={{ background: config.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.85, ease: "easeOut" }}
        />
      </div>

      <div className="space-y-2">
        {signals.slice(0, 3).map((signal) => (
          <p key={signal} className="text-xs leading-relaxed text-text-secondary">
            • {signal}
          </p>
        ))}
      </div>
    </motion.div>
  );
}
