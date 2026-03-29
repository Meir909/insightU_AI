"use client";

import { motion } from "framer-motion";
import Link from "next/link";
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
  disabled?: boolean;
};

const variants = {
  solid:
    "bg-brand-green text-black border border-brand-green/40 hover:bg-brand-dim hover:shadow-green active:scale-[0.98]",
  outline:
    "border border-brand-green/35 text-brand-green hover:bg-brand-green hover:text-black hover:shadow-green-sm active:scale-[0.98]",
  ghost:
    "border border-white/8 text-text-secondary hover:border-brand-green/20 hover:bg-white/4 hover:text-white active:scale-[0.98]",
  danger:
    "border border-status-low/25 text-status-low hover:bg-status-low/10 hover:border-status-low/50 active:scale-[0.98]",
};

const sizes = {
  sm: "px-3.5 py-2 text-xs rounded-xl",
  md: "px-5 py-2.5 text-sm rounded-2xl",
  lg: "px-6 py-3 text-base rounded-2xl",
};

const sharedClassName =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-50";

export function GreenButton({
  children,
  onClick,
  href,
  variant = "solid",
  size = "md",
  className,
  icon,
  disabled = false,
}: GreenButtonProps) {
  const style = cn(sharedClassName, variants[variant], sizes[size], className);

  if (href && !disabled) {
    return (
      <Link href={href} className={style}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.16 }}
      onClick={onClick}
      disabled={disabled}
      className={style}
    >
      {icon}
      {children}
    </motion.button>
  );
}
