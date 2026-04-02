"use client";

import Link from "next/link";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionData = {
  session: {
    name: string;
    role: "candidate" | "committee" | "admin" | "viewer";
    email?: string;
    phone?: string;
  };
};

export function SessionControls({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as SessionData;
      })
      .then((payload) => {
        if (payload) {
          setData(payload);
        }
      });
  }, []);

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/sign-in");
    router.refresh();
  };

  if (!data) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-bg-elevated">
        <UserRound className="h-4 w-4 animate-pulse text-text-muted" />
      </div>
    );
  }

  const Icon = data.session.role === "candidate" ? UserRound : ShieldCheck;
  const meta =
    data.session.role === "candidate"
      ? data.session.phone
      : data.session.email || (data.session.role === "viewer" ? "Только чтение" : "Комиссия");
  const profileHref = data.session.role === "candidate" ? "/account" : "/dashboard/account";

  const roleLabel =
    data.session.role === "candidate"
      ? "Кандидат"
      : data.session.role === "viewer"
        ? "Наблюдатель"
        : data.session.role === "admin"
          ? "Администратор"
          : "Комиссия";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Avatar chip */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-bg-elevated px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand-green/12 text-brand-green">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-none text-white">{data.session.name}</p>
            <p className="mt-0.5 text-[10px] leading-none text-text-muted">{meta || roleLabel}</p>
          </div>
        </div>
        {/* Action buttons — equal size */}
        <Link
          href={profileHref}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-bg-elevated text-text-secondary transition-colors hover:border-brand-green/20 hover:text-white"
          title="Личный кабинет"
        >
          <UserRound className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-bg-elevated text-text-secondary transition-colors hover:border-red-500/30 hover:text-red-400"
          title="Выйти"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-bg-surface px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-none text-white">{data.session.name}</p>
        <p className="mt-1 text-xs leading-none text-text-muted">{meta || roleLabel}</p>
      </div>
      <Link
        href={profileHref}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-white/8 px-3 text-xs font-medium text-text-secondary transition-colors hover:border-brand-green/20 hover:text-white"
      >
        <UserRound className="h-3.5 w-3.5" />
        Кабинет
      </Link>
      <button
        type="button"
        onClick={logout}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 text-text-secondary transition-colors hover:border-red-500/30 hover:text-red-400"
        title="Выйти"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
