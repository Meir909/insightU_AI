"use client";

import { LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Role = "candidate" | "committee";

const defaultCandidate = {
  name: "",
  email: "",
  phone: "+7",
};

const defaultCommittee = {
  name: "",
  email: "review@invisionu.kz",
  accessKey: "",
};

export function AuthEntry() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("candidate");
  const [candidate, setCandidate] = useState(defaultCandidate);
  const [committee, setCommittee] = useState(defaultCommittee);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);

    const payload = role === "candidate" ? { role, ...candidate } : { role, ...committee };

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      toast.error(data.error || "Не удалось создать сессию");
      return;
    }

    toast.success(role === "candidate" ? "Регистрация сохранена" : "Вход выполнен");
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
              placeholder="Aruzhan Sarsen"
              className="auth-input"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Номер телефона KZ">
              <input
                value={candidate.phone}
                onChange={(event) => setCandidate((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+77071234567"
                className="auth-input"
              />
            </Field>
            <Field label="Email">
              <input
                value={candidate.email}
                onChange={(event) => setCandidate((current) => ({ ...current, email: event.target.value }))}
                placeholder="applicant@example.com"
                className="auth-input"
              />
            </Field>
          </div>

          <div className="panel-muted px-4 py-3 text-sm leading-relaxed text-text-secondary">
            После регистрации кандидат сразу переходит в AI interview. Итоговый scoring и рекомендации доступны только
            комиссии.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Имя участника комиссии">
            <input
              value={committee.name}
              onChange={(event) => setCommittee((current) => ({ ...current, name: event.target.value }))}
              placeholder="Admissions reviewer"
              className="auth-input"
            />
          </Field>
          <Field label="Рабочий email">
            <input
              value={committee.email}
              onChange={(event) => setCommittee((current) => ({ ...current, email: event.target.value }))}
              placeholder="review@invisionu.kz"
              className="auth-input"
            />
          </Field>
          <Field label="Код доступа комиссии">
            <input
              type="password"
              value={committee.accessKey}
              onChange={(event) => setCommittee((current) => ({ ...current, accessKey: event.target.value }))}
              placeholder="committee-demo"
              className="auth-input"
            />
          </Field>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-brand-green px-5 py-3.5 text-sm font-bold text-black transition-all hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {role === "candidate" ? "Продолжить в интервью" : "Открыть dashboard"}
      </button>
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
