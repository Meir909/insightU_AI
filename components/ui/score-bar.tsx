"use client";

import { motion } from "framer-motion";

const getColor = (score: number) => {
  if (score >= 75) return "#C8F000";
  if (score >= 50) return "#F5A623";
  return "#E53935";
};

export function ScoreBar({
  label,
  score,
  weight,
  index = 0,
}: {
  label: string;
  score: number;
  weight: number;
  index?: number;
}) {
  const color = getColor(score);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span>{label}</span>
          <span className="font-mono text-[10px] text-text-muted">x{weight}</span>
        </div>
        <span className="font-mono text-sm font-bold" style={{ color }}>
          {score.toFixed(0)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}55` }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: index * 0.05, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
