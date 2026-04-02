"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Save, User } from "lucide-react";

type ProfileData = {
  city: string;
  goals: string;
  experience: string;
  motivationText: string;
  essayExcerpt: string;
};

const PLACEHOLDER: ProfileData = {
  city: "",
  goals: "",
  experience: "",
  motivationText: "",
  essayExcerpt: "",
};

const CITIES = [
  "Алматы", "Астана", "Шымкент", "Қарағанды", "Актобе",
  "Тараз", "Павлодар", "Усть-Каменогорск", "Семей", "Атырау",
  "Актау", "Костанай", "Кызылорда", "Петропавловск", "Другой",
];

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-1.5">
        <label className="text-sm font-semibold text-white">{label}</label>
        {required && <span className="text-[10px] text-brand-green">обязательно</span>}
      </div>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/8 bg-bg-elevated px-4 py-2.5 text-sm text-white placeholder:text-text-muted outline-none transition focus:border-brand-green/40 focus:ring-1 focus:ring-brand-green/20 disabled:opacity-50";

const textareaCls =
  "w-full rounded-xl border border-white/8 bg-bg-elevated px-4 py-3 text-sm text-white placeholder:text-text-muted outline-none transition focus:border-brand-green/40 focus:ring-1 focus:ring-brand-green/20 resize-none disabled:opacity-50";

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileData>(PLACEHOLDER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    void fetch("/api/candidates/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const c = data?.candidate;
        if (c) {
          setHasExisting(
            Boolean(c.city && c.city !== "Unspecified") ||
            Boolean(c.goals && !c.goals.startsWith("To be collected")),
          );
          setForm({
            city: c.city === "Unspecified" ? "" : (c.city ?? ""),
            goals: c.goals?.startsWith("To be collected") ? "" : (c.goals ?? ""),
            experience: c.experience?.startsWith("To be collected") ? "" : (c.experience ?? ""),
            motivationText: c.motivationText?.startsWith("To be collected") ? "" : (c.motivationText ?? ""),
            essayExcerpt: c.essayExcerpt ?? "",
          });
        }
      })
      .catch(() => setError("Не удалось загрузить профиль"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof ProfileData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city || !form.goals || !form.motivationText) {
      setError("Заполните обязательные поля: город, цели, мотивация");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/candidates/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Ошибка сохранения");
      }
      setSaved(true);
      setTimeout(() => {
        router.push("/account");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dot-grid flex min-h-screen items-center justify-center bg-bg-base">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="dot-grid min-h-screen bg-bg-base px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Link href="/account" className="flex items-center gap-2 text-sm text-text-secondary transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Назад в кабинет
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
                {hasExisting ? "Редактирование" : "Создание"} профиля
              </p>
              <h1 className="text-2xl font-black tracking-tight text-white">
                {hasExisting ? "Обновить профиль" : "Создать профиль"}
              </h1>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            {hasExisting
              ? "Обновите информацию о себе. Комиссия видит эти данные при оценке вашей заявки."
              : "Заполните профиль, чтобы комиссия могла видеть информацию о вас при проверке заявки."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* City */}
          <div className="rounded-[24px] border border-white/6 bg-bg-surface p-6 space-y-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Основная информация</p>

            <Field label="Город" required hint="Укажите ваш текущий город проживания">
              <select value={form.city} onChange={set("city")} className={inputCls}>
                <option value="">Выберите город</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Motivation block */}
          <div className="rounded-[24px] border border-white/6 bg-bg-surface p-6 space-y-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">О себе</p>

            <Field
              label="Ваши цели"
              required
              hint="Чего вы хотите достичь через 5 лет? Что вас вдохновляет?"
            >
              <textarea
                rows={4}
                value={form.goals}
                onChange={set("goals")}
                placeholder="Опишите ваши профессиональные и личные цели…"
                className={textareaCls}
                maxLength={1000}
              />
              <p className="mt-1 text-right text-[10px] text-text-muted">{form.goals.length}/1000</p>
            </Field>

            <Field
              label="Опыт и достижения"
              hint="Расскажите об учёбе, проектах, олимпиадах, волонтёрстве"
            >
              <textarea
                rows={4}
                value={form.experience}
                onChange={set("experience")}
                placeholder="Ваши достижения, проекты, опыт…"
                className={textareaCls}
                maxLength={1000}
              />
              <p className="mt-1 text-right text-[10px] text-text-muted">{form.experience.length}/1000</p>
            </Field>

            <Field
              label="Мотивация"
              required
              hint="Почему вы хотите в inVision U? Что вас отличает?"
            >
              <textarea
                rows={4}
                value={form.motivationText}
                onChange={set("motivationText")}
                placeholder="Расскажите о вашей мотивации поступить в inVision U…"
                className={textareaCls}
                maxLength={1500}
              />
              <p className="mt-1 text-right text-[10px] text-text-muted">{form.motivationText.length}/1500</p>
            </Field>

            <Field
              label="Фрагмент эссе"
              hint="Необязательно. Вставьте отрывок из вашего сочинения или личного заявления"
            >
              <textarea
                rows={3}
                value={form.essayExcerpt}
                onChange={set("essayExcerpt")}
                placeholder="Краткий отрывок из эссе или сочинения…"
                className={textareaCls}
                maxLength={800}
              />
            </Field>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || saved}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-black transition hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Сохранено
                </>
              ) : saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Сохранение…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {hasExisting ? "Обновить профиль" : "Создать профиль"}
                </>
              )}
            </button>
            <Link
              href="/account"
              className="flex h-11 items-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm text-text-secondary transition hover:text-white"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
