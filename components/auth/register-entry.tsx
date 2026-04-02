"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Role = "candidate" | "committee";

const defaultCandidate = {
  name: "",
  email: "",
  phone: "+7",
  password: "",
};

const defaultCommittee = {
  name: "",
  email: "review@invisionu.kz",
  password: "",
  accessKey: "",
};

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" };
  const checks = [pw.length >= 8, /[A-Z]/.test(pw) && /[a-z]/.test(pw), /\d/.test(pw), /[^a-zA-Z0-9]/.test(pw)];
  const score = checks.filter(Boolean).length;
  if (score <= 1) return { level: 1, label: "Слабый", color: "bg-status-low" };
  if (score === 2) return { level: 2, label: "Средний", color: "bg-status-mid" };
  return { level: 3, label: "Надёжный", color: "bg-brand-green" };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { level, label, color } = getPasswordStrength(password);
  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${level > 0 && i <= level ? color : "bg-white/10"}`} />
        ))}
      </div>
      <p className={`text-[10px] ${level === 0 ? "text-text-muted" : level === 1 ? "text-status-low font-semibold" : level === 2 ? "text-status-mid font-semibold" : "text-brand-green font-semibold"}`}>
        {level === 0 ? "Минимум 8 символов, буква и цифра" : label}
      </p>
    </div>
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RegisterEntry() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("candidate");
  const [candidate, setCandidate] = useState(defaultCandidate);
  const [committee, setCommittee] = useState(defaultCommittee);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCandidatePassword, setShowCandidatePassword] = useState(false);
  const [showCommitteePassword, setShowCommitteePassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const phoneError = touched.phone && !/^\+7\d{10}$/.test(candidate.phone) ? "Формат: +77071234567" : "";
  const emailError = touched.email && candidate.email && !isValidEmail(candidate.email) ? "Введите корректный email" : "";
  const committeeEmailError = touched.committeeEmail && !isValidEmail(committee.email) ? "Введите корректный email" : "";

  const submit = async () => {
    if (!accepted) {
      toast.error("Подтвердите согласие с политикой конфиденциальности и условиями использования.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const payload =
      role === "candidate"
        ? { role, ...candidate, acceptedLegal: accepted }
        : { role, ...committee, acceptedLegal: accepted };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { error?: string; redirectTo?: string };

      if (!response.ok) {
        setErrorMsg(data.error ?? "Не удалось создать аккаунт");
        return;
      }

      router.push(data.redirectTo ?? "/");
      router.refresh();
    } catch {
      setErrorMsg("Ошибка сети. Проверьте соединение и попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-white/8 bg-bg-elevated/70 p-1.5">
        {[
          { key: "candidate", label: "Кандидат", icon: UserRound },
          { key: "committee", label: "Комиссия", icon: LockKeyhole },
        ].map(({ key, label, icon: Icon }) => {
          const active = role === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key as Role)}
              className={`flex items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold transition-all ${
                active ? "bg-brand-green text-black shadow-green-sm" : "text-text-secondary hover:bg-white/4 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {role === "candidate" ? (
        <div className="space-y-4">
          <Field label="Полное имя">
            <input
              value={candidate.name}
              onChange={(event) => setCandidate((current) => ({ ...current, name: event.target.value }))}
              className="auth-input"
              placeholder="Иван Иванов"
              autoComplete="name"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Номер телефона KZ" error={phoneError}>
              <input
                value={candidate.phone}
                onChange={(event) => setCandidate((current) => ({ ...current, phone: event.target.value }))}
                onBlur={() => touch("phone")}
                className={`auth-input ${phoneError ? "border-status-low/50" : ""}`}
                placeholder="+77071234567"
                autoComplete="tel"
              />
            </Field>
            <Field label="Email" error={emailError}>
              <input
                value={candidate.email}
                onChange={(event) => setCandidate((current) => ({ ...current, email: event.target.value }))}
                onBlur={() => touch("email")}
                className={`auth-input ${emailError ? "border-status-low/50" : ""}`}
                placeholder="example@mail.com"
                autoComplete="email"
              />
            </Field>
          </div>
          <Field label="Пароль">
            <div className="relative">
              <input
                type={showCandidatePassword ? "text" : "password"}
                value={candidate.password}
                onChange={(event) => setCandidate((current) => ({ ...current, password: event.target.value }))}
                className="auth-input pr-12"
                placeholder="Не менее 8 символов"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowCandidatePassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary focus:outline-none"
                tabIndex={0}
                aria-label={showCandidatePassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showCandidatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthBar password={candidate.password} />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Имя участника комиссии">
            <input
              value={committee.name}
              onChange={(event) => setCommittee((current) => ({ ...current, name: event.target.value }))}
              className="auth-input"
              placeholder="Алия Нурланова"
              autoComplete="name"
            />
          </Field>
          <Field label="Рабочий email" error={committeeEmailError}>
            <input
              value={committee.email}
              onChange={(event) => setCommittee((current) => ({ ...current, email: event.target.value }))}
              onBlur={() => touch("committeeEmail")}
              className={`auth-input ${committeeEmailError ? "border-status-low/50" : ""}`}
              autoComplete="email"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Пароль">
              <div className="relative">
                <input
                  type={showCommitteePassword ? "text" : "password"}
                  value={committee.password}
                  onChange={(event) => setCommittee((current) => ({ ...current, password: event.target.value }))}
                  className="auth-input pr-12"
                  placeholder="Не менее 8 символов"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCommitteePassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary focus:outline-none"
                  tabIndex={0}
                  aria-label={showCommitteePassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showCommitteePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthBar password={committee.password} />
            </Field>
            <Field label="Код доступа комиссии">
              <input
                type="text"
                value={committee.accessKey}
                onChange={(event) => setCommittee((current) => ({ ...current, accessKey: event.target.value }))}
                className="auth-input"
                placeholder="committee-demo"
                autoComplete="off"
              />
            </Field>
          </div>
        </div>
      )}

      <label className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-bg-elevated/60 px-4 py-3 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/15 bg-transparent accent-brand-green"
        />
        <span className="leading-relaxed">
          Я подтверждаю согласие с{" "}
          <Link href="/privacy-policy" className="text-brand-green hover:text-brand-dim">
            политикой конфиденциальности
          </Link>{" "}
          и{" "}
          <Link href="/terms" className="text-brand-green hover:text-brand-dim">
            условиями использования
          </Link>
          .
        </span>
      </label>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3" role="alert">
          <p className="text-sm text-red-400">{errorMsg}</p>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-4 text-base font-bold text-black transition-all hover:bg-brand-dim hover:shadow-green-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {submitting ? "Создаём аккаунт..." : "Создать аккаунт"}
      </button>

      <p className="text-sm text-text-secondary">
        Уже есть аккаунт?{" "}
        <Link href="/sign-in" className="text-brand-green hover:text-brand-dim">
          Войти
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block space-y-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">{label}</span>
      {children}
      {error && (
        <p className="field-error" role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}
