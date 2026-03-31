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
    return null;
  }

  const Icon = data.session.role === "candidate" ? UserRound : ShieldCheck;
  const meta =
    data.session.role === "candidate"
      ? data.session.phone
      : data.session.email || (data.session.role === "viewer" ? "Read-only backoffice" : "Backoffice");
  const profileHref = data.session.role === "candidate" ? "/account" : "/dashboard/account";

  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "rounded-[22px] border border-white/8 bg-bg-surface px-4 py-3"}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
        <Icon className="h-4 w-4" />
      </div>
      <div className={compact ? "hidden md:block" : ""}>
        <p className="text-sm font-semibold text-white">{data.session.name}</p>
        <p className="text-xs text-text-muted">
          {meta ||
            (data.session.role === "candidate"
              ? "Кандидат"
              : data.session.role === "viewer"
                ? "Наблюдатель"
                : data.session.role === "admin"
                  ? "Администратор"
                  : "Комиссия")}
        </p>
      </div>
      <Link
        href={profileHref}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/8 px-3 text-sm text-text-secondary transition-colors hover:border-brand-green/20 hover:text-white"
      >
        Кабинет
      </Link>
      <button
        type="button"
        onClick={logout}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/8 px-3 text-sm text-text-secondary transition-colors hover:border-brand-green/20 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
