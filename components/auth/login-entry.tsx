"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, RefreshCw, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Role = "candidate" | "committee";

export function LoginEntry() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("candidate");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const submit = async () => {
    setInlineError("");
    if (!identifier.trim() || !password.trim()) {
      setInlineError("Заполните все поля перед входом");
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
        setInlineError(data.error || "Не удалось выполнить вход");
        setFailedAttempts((n) => n + 1);
        return;
      }

      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setInlineError("Ошибка соединения, попробуйте ещё раз");
      setFailedAttempts((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };

  const handleResetAccount = async () => {
    if (!identifier.trim()) {
      setInlineError("Введите email или телефон для сброса аккаунта");
      return;
    }
    const confirmed = window.confirm(
      `Удалить аккаунт «${identifier.trim()}»?\n\nВсе данные (профиль, интервью, оценки) будут безвозвратно удалены. После этого можно зарегистрироваться заново.`,
    );
    if (!confirmed) return;

    setResetting(true);
    setInlineError("");
    try {
      const response = await fetch("/api/auth/reset-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, identifier: identifier.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setResetDone(true);
        setFailedAttempts(0);
        setPassword("");
        toast.success("Аккаунт удалён. Теперь вы можете зарегистрироваться заново.");
      } else {
        setInlineError(data.error || "Не удалось сбросить аккаунт");
      }
    } catch {
      setInlineError("Ошибка соединения при сбросе аккаунта");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Role selector */}
      <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-white/8 bg-bg-elevated/70 p-1.5">
        {[
          { key: "candidate" as Role, label: "Кандидат", icon: UserRound, ariaLabel: "Войти как кандидат" },
          { key: "committee" as Role, label: "Комиссия", icon: LockKeyhole, ariaLabel: "Войти как комиссия" },
        ].map(({ key, label, icon: Icon, ariaLabel }) => {
          const active = role === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { setRole(key); setInlineError(""); setFailedAttempts(0); setResetDone(false); }}
              aria-label={ariaLabel}
              aria-pressed={active}
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
          onChange={(e) => { setIdentifier(e.target.value); setResetDone(false); }}
          onKeyDown={handleKeyDown}
          placeholder={role === "candidate" ? "+77071234567" : "review@invisionu.kz"}
          className="auth-input"
          autoComplete="username"
        />
      </label>

      <label className="block space-y-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Пароль</span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Не менее 8 символов"
            className="auth-input pr-12"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary focus:outline-none"
            tabIndex={0}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      {/* Inline error */}
      {inlineError && (
        <p className="field-error">
          <span>⚠</span> {inlineError}
        </p>
      )}

      {/* Reset account banner — appears after 1st failed attempt */}
      {failedAttempts >= 1 && !resetDone && (
        <div className="rounded-2xl border border-status-low/25 bg-status-low/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-low" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Не помните пароль?</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Если вы хотите начать заново, можно удалить текущий аккаунт и зарегистрироваться с тем же email или телефоном.
                Все данные будут безвозвратно удалены.
              </p>
              <button
                type="button"
                onClick={() => void handleResetAccount()}
                disabled={resetting || !identifier.trim()}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-status-low/30 bg-status-low/10 px-3 py-2 text-xs font-semibold text-status-low transition-all hover:bg-status-low/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetting ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {resetting ? "Удаляем аккаунт..." : "Сбросить и удалить аккаунт"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success state after reset */}
      {resetDone && (
        <div className="rounded-2xl border border-brand-green/25 bg-brand-green/8 p-4">
          <p className="text-sm font-semibold text-brand-green">Аккаунт удалён</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Теперь вы можете{" "}
            <Link href="/sign-up" className="font-semibold text-brand-green hover:text-brand-dim">
              зарегистрироваться заново
            </Link>{" "}
            с тем же email или телефоном.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting || resetDone}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-4 text-base font-bold text-black transition-all hover:bg-brand-dim hover:shadow-green-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
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
