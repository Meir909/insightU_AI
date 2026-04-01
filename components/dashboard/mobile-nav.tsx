"use client";

import { BarChart3, LayoutDashboard, LogOut, Radar, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-bg-surface/98 backdrop-blur-xl lg:hidden pb-safe">
      <div className="grid grid-cols-5 gap-0.5 px-1 py-1.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.95]",
                active
                  ? "text-brand-green bg-brand-green/10"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/4",
              )}
            >
              {active && (
                <span className="absolute top-1 h-1 w-4 rounded-full bg-brand-green shadow-green-sm" />
              )}
              <Icon className={cn("mt-1.5 h-[18px] w-[18px] transition-transform", active && "scale-110")} />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={logout}
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-text-muted transition-all duration-150 hover:bg-white/4 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.95]"
        >
          <LogOut className="mt-1.5 h-[18px] w-[18px]" />
          <span className="leading-none">Выход</span>
        </button>
      </div>
    </nav>
  );
}
