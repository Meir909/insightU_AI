"use client";

import { BarChart3, LayoutDashboard, LogOut, Radar, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/dashboard/talents", label: "Таланты", icon: Radar },
  { href: "/dashboard/shortlist", label: "Шорт-лист", icon: Star },
  { href: "/dashboard/analytics", label: "Аналитика", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <>
      {/* Logout confirmation overlay */}
      {confirmLogout && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm pb-safe"
          onClick={() => setConfirmLogout(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Подтверждение выхода"
        >
          <div
            className="mx-4 mb-4 w-full max-w-sm rounded-[28px] border border-white/10 bg-bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-white">Выйти из аккаунта?</p>
            <p className="mt-1 text-sm text-text-secondary">Вы будете перенаправлены на страницу входа.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-text-secondary transition hover:border-white/20 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-2xl bg-status-low py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-bg-surface/98 backdrop-blur-xl lg:hidden pb-safe"
        aria-label="Мобильная навигация"
      >
        <div className="grid grid-cols-5 gap-0.5 px-1 py-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.95]",
                  active
                    ? "text-brand-green bg-brand-green/10"
                    : "text-text-muted hover:text-text-secondary hover:bg-white/4",
                )}
              >
                {active && (
                  <span className="absolute top-1 h-1 w-4 rounded-full bg-brand-green shadow-green-sm" aria-hidden="true" />
                )}
                <Icon className={cn("mt-1.5 h-[18px] w-[18px] transition-transform", active && "scale-110")} aria-hidden="true" />
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Выйти из аккаунта"
            className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-text-muted transition-all duration-150 hover:bg-white/4 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.95]"
          >
            <LogOut className="mt-1.5 h-[18px] w-[18px]" aria-hidden="true" />
            <span className="leading-none">Выход</span>
          </button>
        </div>
      </nav>
    </>
  );
}
