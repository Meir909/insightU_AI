"use client";

import { Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import { SessionControls } from "@/components/auth/session-controls";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Панель отбора", subtitle: "Обзор кандидатов" },
  "/dashboard/shortlist": { title: "Шорт-лист", subtitle: "Финалисты отбора" },
  "/dashboard/analytics": { title: "Аналитика", subtitle: "Статистика пула" },
  "/dashboard/talents": { title: "Таланты", subtitle: "Скрытый потенциал" },
  "/dashboard/account": { title: "Мой профиль", subtitle: "Настройки аккаунта" },
};

function getPageInfo(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/dashboard/candidates/")) return { title: "Профиль кандидата", subtitle: "Детальный анализ" };
  return { title: "InsightU AI", subtitle: "Панель комиссии" };
}

export function TopBar() {
  const pathname = usePathname();
  const { title, subtitle } = getPageInfo(pathname);

  return (
    <div className="sticky top-0 z-30 border-b border-white/6 bg-bg-base/90 px-4 py-3 backdrop-blur-md lg:px-8">
      <div className="page-shell flex items-center justify-between gap-4">
        {/* Mobile logo + title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-green text-black shadow-green-sm lg:hidden">
            <Zap className="h-4 w-4" strokeWidth={2.8} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white lg:text-xl">{title}</h1>
              {/* Live indicator */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
              </span>
            </div>
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted sm:block">{subtitle}</p>
          </div>
        </div>

        <SessionControls compact />
      </div>
    </div>
  );
}
