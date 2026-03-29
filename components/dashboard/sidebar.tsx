"use client";

import { motion } from "framer-motion";
import { BarChart3, ChevronRight, LayoutDashboard, Star, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionControls } from "@/components/auth/session-controls";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/dashboard/shortlist", label: "Шорт-лист", icon: Star },
  { href: "/dashboard/analytics", label: "Аналитика", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/6 bg-bg-surface/95 lg:flex">
      <div className="border-b border-white/6 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green text-black shadow-green-sm">
            <Zap className="h-5 w-5" strokeWidth={2.6} />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-white">InsightU AI</p>
            <p className="text-[11px] text-text-muted">Admissions dashboard</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-2 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">Навигация</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150",
                  active ? "bg-brand-green text-black" : "text-text-secondary hover:bg-white/4 hover:text-white",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
                {active ? <ChevronRight className="h-4 w-4" /> : null}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/6 px-4 py-4">
        <SessionControls />
      </div>
    </aside>
  );
}
