"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { SessionControls } from "@/components/auth/session-controls";

const titles: Record<string, string> = {
  "/dashboard": "Панель отбора",
  "/dashboard/shortlist": "Шорт-лист",
  "/dashboard/analytics": "Аналитика пула",
};

export function TopBar() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "InsightU AI";

  return (
    <div className="sticky top-0 z-30 border-b border-white/6 bg-bg-base/85 px-4 py-4 backdrop-blur-md lg:px-8">
      <div className="page-shell flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-text-muted">inDrive × inVision U</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/15 bg-brand-green/8 px-4 py-2 text-xs text-brand-green">
            <Sparkles className="h-3.5 w-3.5" />
            Live scoring enabled
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs text-text-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
            Human review required
          </div>
          <SessionControls compact />
        </div>
      </div>
    </div>
  );
}
