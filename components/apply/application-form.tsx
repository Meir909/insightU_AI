"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  Heart,
  Briefcase,
  ClipboardCheck,
  Plus,
  X,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface Achievement {
  type: "academic" | "competition" | "project" | "certificate" | "other";
  title: string;
  description: string;
  year: number;
}

interface Language {
  language: string;
  level: "beginner" | "intermediate" | "advanced" | "native";
}

interface FormData {
  // Step 1
  fullName: string;
  city: string;
  dateOfBirth: string;
  educationLevel: "high_school" | "bachelor" | "master" | "other";
  schoolName: string;
  graduationYear: number;
  // Step 2
  whyVisionU: string;
  goals: string;
  changeAgentVision: string;
  // Step 3
  hasLeadershipExperience: boolean;
  leadershipDescription: string;
  hasTeamExperience: boolean;
  teamExperienceDescription: string;
  skills: string[];
  languages: Language[];
  achievements: Achievement[];
  // Step 4
  agreeToTerms: boolean;
}

const KZ_CITIES = [
  "Алматы", "Астана", "Шымкент", "Актобе", "Тараз", "Павлодар",
  "Усть-Каменогорск", "Семей", "Атырау", "Костанай", "Кызылорда",
  "Уральск", "Петропавловск", "Актау", "Темиртау", "Туркестан",
  "Конаев", "Жезказган", "Балхаш", "Другой",
];

const ACHIEVEMENT_TYPES = [
  { value: "academic", label: "Академическое" },
  { value: "competition", label: "Олимпиада / конкурс" },
  { value: "project", label: "Проект" },
  { value: "certificate", label: "Сертификат" },
  { value: "other", label: "Другое" },
];

const LANG_LEVELS = [
  { value: "beginner", label: "Начальный" },
  { value: "intermediate", label: "Средний" },
  { value: "advanced", label: "Продвинутый" },
  { value: "native", label: "Родной" },
];

function qualityScore(text: string): number {
  if (!text) return 0;
  let score = Math.min(40, text.length / 10);
  if (/потому|поэтому|однако|несмотря|например|во-первых|во-вторых/i.test(text)) score += 20;
  if (/\d+/.test(text)) score += 20;
  if (text.length >= 200) score += 20;
  return Math.min(100, Math.round(score));
}

function QualityBar({ text, label }: { text: string; label: string }) {
  const score = qualityScore(text);
  const color = score >= 70 ? "bg-brand-green" : score >= 40 ? "bg-yellow-400" : "bg-white/20";
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] text-text-muted">{label}: {score}%</span>
    </div>
  );
}

const STEPS = [
  { num: 1, label: "Личные данные", icon: User },
  { num: 2, label: "Мотивация", icon: Heart },
  { num: 3, label: "Опыт", icon: Briefcase },
  { num: 4, label: "Подтверждение", icon: ClipboardCheck },
];

export function ApplicationForm({ prefillName }: { prefillName?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");

  const [form, setForm] = useState<FormData>({
    fullName: prefillName ?? "",
    city: "",
    dateOfBirth: "",
    educationLevel: "high_school",
    schoolName: "",
    graduationYear: new Date().getFullYear(),
    whyVisionU: "",
    goals: "",
    changeAgentVision: "",
    hasLeadershipExperience: false,
    leadershipDescription: "",
    hasTeamExperience: false,
    teamExperienceDescription: "",
    skills: [],
    languages: [{ language: "Казахский", level: "native" }],
    achievements: [],
    agreeToTerms: false,
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && form.skills.length < 15 && !form.skills.includes(s)) {
      set("skills", [...form.skills, s]);
      setSkillInput("");
    }
  }

  function removeSkill(skill: string) {
    set("skills", form.skills.filter((s) => s !== skill));
  }

  function addLanguage() {
    set("languages", [...form.languages, { language: "", level: "beginner" }]);
  }

  function updateLanguage(idx: number, field: keyof Language, value: string) {
    const langs = [...form.languages];
    langs[idx] = { ...langs[idx], [field]: value };
    set("languages", langs);
  }

  function removeLanguage(idx: number) {
    set("languages", form.languages.filter((_, i) => i !== idx));
  }

  function addAchievement() {
    set("achievements", [
      ...form.achievements,
      { type: "academic", title: "", description: "", year: new Date().getFullYear() },
    ]);
  }

  function updateAchievement(idx: number, field: keyof Achievement, value: string | number) {
    const achs = [...form.achievements];
    achs[idx] = { ...achs[idx], [field]: value };
    set("achievements", achs);
  }

  function removeAchievement(idx: number) {
    set("achievements", form.achievements.filter((_, i) => i !== idx));
  }

  function canProceed(): boolean {
    if (step === 1) {
      return !!(form.fullName.trim() && form.city && form.dateOfBirth && form.schoolName && form.graduationYear);
    }
    if (step === 2) {
      return form.whyVisionU.length >= 50 && form.goals.length >= 50 && form.changeAgentVision.length >= 50;
    }
    if (step === 3) return true;
    if (step === 4) return form.agreeToTerms;
    return false;
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: `candidate_${Date.now()}@invisionu.kz`,
          phone: "+70000000000",
          dateOfBirth: form.dateOfBirth,
          city: form.city,
          educationLevel: form.educationLevel,
          schoolName: form.schoolName,
          graduationYear: form.graduationYear,
          achievements: form.achievements.filter((a) => a.title.trim()),
          motivation: {
            whyVisionU: form.whyVisionU,
            goals: form.goals,
            changeAgentVision: form.changeAgentVision,
          },
          hasLeadershipExperience: form.hasLeadershipExperience,
          leadershipDescription: form.leadershipDescription || undefined,
          hasTeamExperience: form.hasTeamExperience,
          teamExperienceDescription: form.teamExperienceDescription || undefined,
          skills: form.skills,
          languages: form.languages.filter((l) => l.language.trim()),
          portfolioLinks: [],
          howDidYouHear: "school",
          agreeToTerms: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Ошибка отправки");
      }

      router.push("/account?applied=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки анкеты");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const active = step === s.num;
          const done = step > s.num;
          return (
            <div key={s.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                    done
                      ? "border-brand-green bg-brand-green text-black"
                      : active
                        ? "border-brand-green bg-brand-green/10 text-brand-green"
                        : "border-white/15 bg-transparent text-text-muted"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`hidden text-[10px] font-semibold sm:block ${active ? "text-white" : "text-text-muted"}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`mx-1 h-px flex-1 ${step > s.num ? "bg-brand-green" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Personal data */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-white">Личные данные</h2>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">Полное имя *</label>
            <input
              className="form-field"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Алия Нурова"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">Город *</label>
              <select
                className="form-field"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              >
                <option value="">Выберите город</option>
                {KZ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">Дата рождения *</label>
              <input
                type="date"
                className="form-field"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
                max={new Date(Date.now() - 12 * 365 * 24 * 3600 * 1000).toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">Уровень образования *</label>
            <select
              className="form-field"
              value={form.educationLevel}
              onChange={(e) => set("educationLevel", e.target.value as FormData["educationLevel"])}
            >
              <option value="high_school">Средняя школа</option>
              <option value="bachelor">Бакалавриат</option>
              <option value="master">Магистратура</option>
              <option value="other">Другое</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">Школа / университет *</label>
              <input
                className="form-field"
                value={form.schoolName}
                onChange={(e) => set("schoolName", e.target.value)}
                placeholder="Назарбаев Интеллектуальная школа"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">Год окончания *</label>
              <input
                type="number"
                className="form-field"
                value={form.graduationYear}
                onChange={(e) => set("graduationYear", Number(e.target.value))}
                min={2020}
                max={2030}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Motivation */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-white">Мотивация</h2>
            <p className="mt-1 text-xs text-text-muted">Минимум 50 символов. AI анализирует глубину и аутентичность.</p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">
              Почему вы хотите в inVision U? *
            </label>
            <textarea
              className="form-field resize-none"
              rows={5}
              value={form.whyVisionU}
              onChange={(e) => set("whyVisionU", e.target.value)}
              placeholder="Расскажите искренне — что именно привлекает вас в этой программе..."
            />
            <div className="flex items-center justify-between mt-1.5">
              <QualityBar text={form.whyVisionU} label="Качество" />
              <span className="ml-3 text-[10px] text-text-muted shrink-0">{form.whyVisionU.length} симв.</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">
              Каковы ваши цели на ближайшие 5 лет? *
            </label>
            <textarea
              className="form-field resize-none"
              rows={5}
              value={form.goals}
              onChange={(e) => set("goals", e.target.value)}
              placeholder="Конкретные цели: что именно вы хотите создать, изменить, достичь..."
            />
            <div className="flex items-center justify-between mt-1.5">
              <QualityBar text={form.goals} label="Качество" />
              <span className="ml-3 text-[10px] text-text-muted shrink-0">{form.goals.length} симв.</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">
              Какие изменения вы хотите привнести в общество? *
            </label>
            <textarea
              className="form-field resize-none"
              rows={5}
              value={form.changeAgentVision}
              onChange={(e) => set("changeAgentVision", e.target.value)}
              placeholder="Ваше видение роли агента изменений — конкретно и честно..."
            />
            <div className="flex items-center justify-between mt-1.5">
              <QualityBar text={form.changeAgentVision} label="Качество" />
              <span className="ml-3 text-[10px] text-text-muted shrink-0">{form.changeAgentVision.length} симв.</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Experience */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-white">Опыт и достижения</h2>

          {/* Leadership */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">Есть опыт лидерства?</label>
              <button
                type="button"
                onClick={() => set("hasLeadershipExperience", !form.hasLeadershipExperience)}
                className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${form.hasLeadershipExperience ? "bg-brand-green" : "bg-white/15"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${form.hasLeadershipExperience ? "left-6" : "left-1"}`} />
              </button>
            </div>
            {form.hasLeadershipExperience && (
              <textarea
                className="form-field resize-none"
                rows={3}
                value={form.leadershipDescription}
                onChange={(e) => set("leadershipDescription", e.target.value)}
                placeholder="Опишите ситуацию: кого вы вели, какой был результат..."
              />
            )}
          </div>

          {/* Team */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white">Есть командный опыт?</label>
              <button
                type="button"
                onClick={() => set("hasTeamExperience", !form.hasTeamExperience)}
                className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${form.hasTeamExperience ? "bg-brand-green" : "bg-white/15"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${form.hasTeamExperience ? "left-6" : "left-1"}`} />
              </button>
            </div>
            {form.hasTeamExperience && (
              <textarea
                className="form-field resize-none"
                rows={3}
                value={form.teamExperienceDescription}
                onChange={(e) => set("teamExperienceDescription", e.target.value)}
                placeholder="Роль в команде, что делали вместе, чего достигли..."
              />
            )}
          </div>

          {/* Skills */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-2">Навыки (до 15)</label>
            <div className="flex gap-2">
              <input
                className="form-field flex-1"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Python, лидерство, дизайн..."
              />
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-white hover:bg-white/10 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {form.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.skills.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 rounded-full border border-brand-green/20 bg-brand-green/8 px-3 py-1.5 text-xs font-medium text-brand-green">
                    {s}
                    <button onClick={() => removeSkill(s)} className="opacity-60 hover:opacity-100 transition"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Languages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Языки</label>
              <button type="button" onClick={addLanguage} className="text-xs font-semibold text-brand-green hover:text-brand-green/80 transition">+ Добавить</button>
            </div>
            <div className="space-y-2">
              {form.languages.map((lang, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="form-field flex-1"
                    value={lang.language}
                    onChange={(e) => updateLanguage(idx, "language", e.target.value)}
                    placeholder="Язык"
                  />
                  <select
                    className="form-field w-auto"
                    value={lang.level}
                    onChange={(e) => updateLanguage(idx, "level", e.target.value)}
                  >
                    {LANG_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  {form.languages.length > 1 && (
                    <button type="button" onClick={() => removeLanguage(idx)} className="flex items-center justify-center w-10 text-text-muted hover:text-white transition">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Достижения (до 10)</label>
              {form.achievements.length < 10 && (
                <button type="button" onClick={addAchievement} className="text-xs font-semibold text-brand-green hover:text-brand-green/80 transition">+ Добавить</button>
              )}
            </div>
            <div className="space-y-3">
              {form.achievements.map((ach, idx) => (
                <div key={idx} className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <select
                      className="form-field w-auto text-xs"
                      value={ach.type}
                      onChange={(e) => updateAchievement(idx, "type", e.target.value)}
                    >
                      {ACHIEVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button type="button" onClick={() => removeAchievement(idx)} className="text-text-muted hover:text-white transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    className="form-field"
                    value={ach.title}
                    onChange={(e) => updateAchievement(idx, "title", e.target.value)}
                    placeholder="Название достижения"
                  />
                  <input
                    className="form-field"
                    value={ach.description}
                    onChange={(e) => updateAchievement(idx, "description", e.target.value)}
                    placeholder="Краткое описание"
                  />
                  <input
                    type="number"
                    className="form-field w-32"
                    value={ach.year}
                    onChange={(e) => updateAchievement(idx, "year", Number(e.target.value))}
                    min={2015}
                    max={2026}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-white">Подтверждение</h2>

          <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3 text-sm">
            <div className="grid gap-1.5">
              <div className="flex justify-between">
                <span className="text-text-muted">Имя</span>
                <span className="text-white font-medium">{form.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Город</span>
                <span className="text-white">{form.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Образование</span>
                <span className="text-white">{form.schoolName} ({form.graduationYear})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Навыки</span>
                <span className="text-white">{form.skills.length > 0 ? form.skills.slice(0, 3).join(", ") + (form.skills.length > 3 ? ` +${form.skills.length - 3}` : "") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Языки</span>
                <span className="text-white">{form.languages.filter((l) => l.language.trim()).map((l) => l.language).join(", ") || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Достижения</span>
                <span className="text-white">{form.achievements.filter((a) => a.title.trim()).length} шт.</span>
              </div>
            </div>

            <div className="border-t border-white/8 pt-3 space-y-2">
              <p className="text-xs font-semibold text-text-muted">Мотивация — качество текстов</p>
              <QualityBar text={form.whyVisionU} label="Почему inVision U" />
              <QualityBar text={form.goals} label="Цели" />
              <QualityBar text={form.changeAgentVision} label="Видение изменений" />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded accent-brand-green"
              checked={form.agreeToTerms}
              onChange={(e) => set("agreeToTerms", e.target.checked)}
            />
            <span className="text-sm text-text-secondary leading-relaxed">
              Я ознакомился(ась) с{" "}
              <a href="/privacy-policy" target="_blank" className="text-brand-green hover:underline">политикой конфиденциальности</a>{" "}
              и{" "}
              <a href="/terms" target="_blank" className="text-brand-green hover:underline">условиями использования</a>.
              Данные будут использованы только для оценки кандидатуры в inVision U.
            </span>
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            disabled={!canProceed()}
            onClick={() => setStep((s) => (s + 1) as Step)}
            className="btn-primary"
          >
            Далее
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!canProceed() || loading}
            onClick={handleSubmit}
            className="btn-primary px-7"
          >
            {loading ? "Отправляем..." : "Отправить анкету"}
            {!loading && <CheckCircle2 className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
