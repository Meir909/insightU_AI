"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GreenButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "solid" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: ReactNode;
};

const variants = {
  solid:
    "bg-brand-green text-black hover:bg-brand-dim hover:shadow-green border border-brand-green/40",
  outline:
    "border border-brand-green/35 text-brand-green hover:bg-brand-green hover:text-black hover:shadow-green-sm",
  ghost:
    "border border-white/8 text-text-secondary hover:border-brand-green/20 hover:bg-white/4 hover:text-white",
  danger:
    "border border-status-low/25 text-status-low hover:bg-status-low/10 hover:border-status-low/50",
};

const sizes = {
  sm: "px-3.5 py-2 text-xs rounded-xl",
  md: "px-5 py-2.5 text-sm rounded-2xl",
  lg: "px-6 py-3 text-base rounded-2xl",
};

export function GreenButton({
  children,
  onClick,
  variant = "solid",
  size = "md",
  className,
  icon,
}: GreenButtonProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.16 }}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {icon}
      {children}
    </motion.button>
  );
}
