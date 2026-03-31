"use client";

import Link from "next/link";
import { LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
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

export function RegisterEntry() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("candidate");
  const [candidate, setCandidate] = useState(defaultCandidate);
  const [committee, setCommittee] = useState(defaultCommittee);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!accepted) {
      toast.error("Подтвердите согласие с политикой конфиденциальности и условиями использования.");
      return;
    }

    setSubmitting(true);
    const payload =
      role === "candidate"
        ? { role, ...candidate, acceptedLegal: accepted }
        : { role, ...committee, acceptedLegal: accepted };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      toast.error(data.error || "Не удалось создать аккаунт");
      return;
    }

    router.push(data.redirectTo);
    router.refresh();
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
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Номер телефона KZ">
              <input
                value={candidate.phone}
                onChange={(event) => setCandidate((current) => ({ ...current, phone: event.target.value }))}
                className="auth-input"
              />
            </Field>
            <Field label="Email">
              <input
                value={candidate.email}
                onChange={(event) => setCandidate((current) => ({ ...current, email: event.target.value }))}
                className="auth-input"
              />
            </Field>
          </div>
          <Field label="Пароль">
            <input
              type="password"
              value={candidate.password}
              onChange={(event) => setCandidate((current) => ({ ...current, password: event.target.value }))}
              className="auth-input"
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Имя участника комиссии">
            <input
              value={committee.name}
              onChange={(event) => setCommittee((current) => ({ ...current, name: event.target.value }))}
              className="auth-input"
            />
          </Field>
          <Field label="Рабочий email">
            <input
              value={committee.email}
              onChange={(event) => setCommittee((current) => ({ ...current, email: event.target.value }))}
              className="auth-input"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Пароль">
              <input
                type="password"
                value={committee.password}
                onChange={(event) => setCommittee((current) => ({ ...current, password: event.target.value }))}
                className="auth-input"
              />
            </Field>
            <Field label="Код доступа комиссии">
              <input
                type="password"
                value={committee.accessKey}
                onChange={(event) => setCommittee((current) => ({ ...current, accessKey: event.target.value }))}
                className="auth-input"
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

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-brand-green px-5 py-3.5 text-sm font-bold text-black transition-all hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Создать аккаунт
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">{label}</span>
      {children}
    </label>
  );
}
