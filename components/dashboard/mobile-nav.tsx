"use client";

import { BarChart3, LayoutDashboard, LogOut, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/dashboard/shortlist", label: "Шорт-лист", icon: Star },
  { href: "/dashboard/analytics", label: "Аналитика", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/6 bg-bg-surface/95 px-2 py-2 backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-4 gap-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors",
                active
                  ? "bg-brand-green text-black"
                  : "text-text-secondary hover:bg-white/4 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}

        <Link
          href="/sign-in"
          className="flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-white/4 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>Выход</span>
        </Link>
      </div>
    </div>
  );
}
