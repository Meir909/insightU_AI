"use client";

import { Bell, Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Панель отбора",
  "/dashboard/shortlist": "Шорт-лист",
  "/dashboard/analytics": "Аналитика пула",
};

export function TopBar() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "InsightU AI";

  return (
    <div className="sticky top-0 z-30 border-b border-white/6 bg-bg-base/80 px-4 py-4 backdrop-blur-md lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-text-muted">
            inDrive × inVision U
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex min-w-[220px] items-center gap-2 rounded-2xl border border-white/8 bg-bg-elevated px-3 py-2.5 text-sm text-text-secondary">
            <Search className="h-4 w-4" />
            <span>Поиск кандидатов, городов, программ</span>
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-bg-elevated text-text-secondary transition-colors hover:border-brand-green/20 hover:text-brand-green">
            <Bell className="h-4 w-4" />
          </button>
          <div className="hidden items-center gap-2 rounded-2xl border border-brand-green/15 bg-brand-green/6 px-4 py-2.5 text-sm text-brand-green md:flex">
            <Sparkles className="h-4 w-4" />
            Live scoring
          </div>
        </div>
      </div>
    </div>
  );
}
