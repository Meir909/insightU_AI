"use client";

import Link from "next/link";
import { LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Role = "candidate" | "committee";

export function LoginEntry() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("candidate");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!identifier.trim() || !password.trim()) {
      toast.error("Заполните все поля");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, identifier, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Не удалось выполнить вход");
        return;
      }

      router.push(data.redirectTo);
      router.refresh();
    } catch {
      toast.error("Ошибка соединения, попробуйте ещё раз");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="space-y-5">
      {/* Role selector — only 2 roles */}
      <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-white/8 bg-bg-elevated/70 p-1.5">
        {[
          { key: "candidate" as Role, label: "Кандидат", icon: UserRound },
          { key: "committee" as Role, label: "Комиссия", icon: LockKeyhole },
        ].map(({ key, label, icon: Icon }) => {
          const active = role === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`flex items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold transition-all ${
                active
                  ? "bg-brand-green text-black shadow-green-sm"
                  : "text-text-secondary hover:bg-white/4 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <label className="block space-y-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
          {role === "candidate" ? "Телефон или email" : "Рабочий email"}
        </span>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={role === "candidate" ? "+77071234567" : "review@invisionu.kz"}
          className="auth-input"
          autoComplete="username"
        />
      </label>

      <label className="block space-y-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Пароль</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Не менее 8 символов"
          className="auth-input"
          autoComplete="current-password"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-4 text-base font-bold text-black transition-all hover:bg-brand-dim hover:shadow-green-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {submitting ? "Входим..." : "Войти в кабинет"}
      </button>

      <div className="space-y-2 text-sm text-text-secondary">
        <p>
          Нет аккаунта?{" "}
          <Link href="/sign-up" className="text-brand-green hover:text-brand-dim">
            Создать аккаунт
          </Link>
        </p>
        <p className="leading-relaxed">
          Продолжая вход, вы подтверждаете, что ознакомились с{" "}
          <Link href="/privacy-policy" className="text-brand-green hover:text-brand-dim">
            политикой конфиденциальности
          </Link>{" "}
          и{" "}
          <Link href="/terms" className="text-brand-green hover:text-brand-dim">
            условиями использования
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
