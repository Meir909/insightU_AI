"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, ChevronRight, LayoutDashboard, Radar, Star, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionControls } from "@/components/auth/session-controls";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/dashboard/talents", label: "Таланты", icon: Radar },
  { href: "/dashboard/shortlist", label: "Шорт-лист", icon: Star },
  { href: "/dashboard/analytics", label: "Аналитика", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/6 bg-bg-surface/95 backdrop-blur-sm lg:flex">
      {/* Logo */}
      <div className="border-b border-white/6 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green text-black shadow-green-sm">
            <Zap className="h-5 w-5" strokeWidth={2.6} />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-white">InsightU AI</p>
            <p className="text-[10px] text-text-muted">Панель отбора · inVision U</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Основная навигация">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              <motion.div
                whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "relative flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.98]",
                  active
                    ? "bg-brand-green/10 text-brand-green"
                    : "text-text-secondary hover:bg-white/6 hover:text-white",
                )}
              >
                {/* Active left accent bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-green shadow-green-sm" aria-hidden="true" />
                )}
                <div className="flex items-center gap-3">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {label}
                </div>
                {active ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Session */}
      <div className="border-t border-white/6 px-4 py-4">
        <SessionControls />
      </div>
    </aside>
  );
}
