"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

type KPICardProps = {
  title: string;
  value: number;
  icon: ReactNode;
  suffix?: string;
  decimals?: number;
  change?: number;
  highlight?: boolean;
  index?: number;
};

export function KPICard({
  title,
  value,
  icon,
  suffix = "",
  decimals = 0,
  change,
  highlight = false,
  index = 0,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.32 }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border p-6 transition-all duration-200",
        highlight
          ? "border-brand-green/30 bg-brand-green text-black"
          : "bg-bg-surface text-white hover:border-brand-green/20",
      )}
    >
      <div className="mb-5 flex items-start justify-between">
        <div
          className={cn(
            "rounded-2xl p-3",
            highlight ? "bg-black/15" : "bg-white/4 text-brand-green",
          )}
        >
          <div className={cn("h-4 w-4", highlight ? "text-black" : "text-brand-green")}>{icon}</div>
        </div>
        {change !== undefined ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[11px] font-bold",
              change >= 0
                ? "bg-brand-green/12 text-brand-green"
                : "bg-status-low/12 text-status-low",
            )}
          >
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
        ) : null}
      </div>

      <div className="space-y-1">
        <p
          className={cn(
            "font-mono text-4xl font-black tracking-tight",
            highlight ? "text-black" : "text-brand-green",
          )}
        >
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
        </p>
        <p className={cn("text-sm", highlight ? "text-black/70" : "text-text-secondary")}>
          {title}
        </p>
      </div>

      {!highlight ? (
        <div className="absolute inset-x-auto right-0 bottom-0 h-20 w-20 rounded-tl-[32px] bg-brand-green/6 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      ) : null}
    </motion.div>
  );
}
