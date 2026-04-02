"use client";

import { useEffect, useState } from "react";
import { Activity, Brain, CheckCircle2, Clock, Cpu, GitBranch, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  {
    id: "nlp",
    label: "NLP-анализ ответов",
    model: "LinguaScore v3.1",
    description: "Семантическая структура речи, лексическая плотность, коэффициент уверенности",
    latencyMs: 312,
    weight: 0.28,
    status: "done" as const,
  },
  {
    id: "behavioral",
    label: "Поведенческий профиль",
    model: "BehavioralGraph 2.4",
    description: "Паттерны лидерства, динамика принятия решений, эмоциональная устойчивость",
    latencyMs: 487,
    weight: 0.24,
    status: "done" as const,
  },
  {
    id: "cognitive",
    label: "Когнитивная карта",
    model: "CognitiveMapper 1.8",
    description: "Структурирование аргументов, причинно-следственные связи, аналитическая глубина",
    latencyMs: 401,
    weight: 0.22,
    status: "done" as const,
  },
  {
    id: "authenticity",
    label: "Детектор AI-контента",
    model: "AuthentiScan 4.0",
    description: "Вероятность использования генеративного AI, перифраза, отклонение от базового стиля",
    latencyMs: 256,
    weight: 0.14,
    status: "done" as const,
  },
  {
    id: "growth",
    label: "Трекер роста",
    model: "GrowthDelta 1.3",
    description: "Сравнение ответов с историческими сессиями, дельта прогресса кандидата",
    latencyMs: 178,
    weight: 0.12,
    status: "done" as const,
  },
];

const COMPLIANCE_CHECKS = [
  { label: "Персональные данные anonymised", ok: true },
  { label: "Предвзятость по полу/возрасту устранена", ok: true },
  { label: "Коллегиальный порог (3 голоса) активен", ok: true },
  { label: "Решение только за комиссией", ok: true },
  { label: "Explainability логируется в audit trail", ok: true },
];

function PulsingDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
    </span>
  );
}

function LiveCounter({ from, to }: { from: number; to: number }) {
  const [val, setVal] = useState(from);
  useEffect(() => {
    const step = Math.ceil((to - from) / 40);
    const id = setInterval(() => {
      setVal((v) => {
        if (v >= to) { clearInterval(id); return to; }
        return Math.min(v + step, to);
      });
    }, 30);
    return () => clearInterval(id);
  }, [from, to]);
  return <>{val}</>;
}

function LiveClock() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (seconds < 60) return <>обновлено {seconds}с назад</>;
  const m = Math.floor(seconds / 60);
  return <>обновлено {m}мин назад</>;
}

const PROCESSING_CANDIDATES = ["KZ-2847", "KZ-1093", "KZ-3312"];

export function EvaluationPipelinePanel() {
  const [expanded, setExpanded] = useState(false);
  const totalMs = PIPELINE_STAGES.reduce((s, st) => s + st.latencyMs, 0);

  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">AI Pipeline · Конвейер</p>
            <h3 className="text-base font-black tracking-tight text-white">Конвейер оценки кандидатов</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PulsingDot />
          <span className="text-[10px] font-semibold text-brand-green">Активен</span>
        </div>
      </div>

      {/* Live stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Cpu, label: "Моделей", value: PIPELINE_STAGES.length, suffix: "" },
          { icon: Clock, label: "Задержка", value: totalMs, suffix: " мс" },
          { icon: Zap, label: "Оценок/день", value: 148, suffix: "" },
        ].map(({ icon: Icon, label, value, suffix }) => (
          <div key={label} className="rounded-2xl border border-white/6 bg-bg-elevated/70 p-3 text-center">
            <Icon className="mx-auto mb-1.5 h-3.5 w-3.5 text-brand-green" />
            <p className="font-mono text-lg font-black text-white">
              <LiveCounter from={0} to={value} />{suffix}
            </p>
            <p className="text-[10px] text-text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline stages */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Стадии обработки</p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] font-semibold text-brand-green hover:text-white transition-colors"
          >
            {expanded ? "Свернуть" : "Подробнее"}
          </button>
        </div>

        {PIPELINE_STAGES.map((stage, i) => {
          const pct = Math.round(stage.weight * 100);
          return (
            <div key={stage.id} className="rounded-2xl border border-white/6 bg-bg-elevated/60 p-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white truncate">{stage.label}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-text-muted">{stage.latencyMs}мс</span>
                      <span className="rounded-md bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-green">
                        ×{pct}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">{stage.model}</p>
                  {/* weight bar */}
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-brand-green/50 transition-all duration-700"
                      style={{ width: `${pct * 3.3}%` }}
                    />
                  </div>
                  {expanded && (
                    <p className="mt-1.5 text-[10px] leading-relaxed text-text-secondary">{stage.description}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ensemble formula */}
      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="h-3.5 w-3.5 text-brand-green" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-green">Ансамблевая формула</p>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-text-secondary">
          Score = 0.28·NLP + 0.24·Behavioral + 0.22·Cognitive + 0.14·Authenticity + 0.12·Growth
        </p>
        <p className="mt-1.5 text-[10px] text-text-muted">
          Взвешенное среднее. Ни одна модель не принимает решение самостоятельно.
        </p>
      </div>

      {/* Compliance checks */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Соответствие стандартам</p>
        </div>
        {COMPLIANCE_CHECKS.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ok ? "bg-brand-green" : "bg-status-low")} />
            <p className="text-[11px] text-text-secondary">{label}</p>
            <span className={cn("ml-auto text-[10px] font-bold", ok ? "text-brand-green" : "text-status-low")}>
              {ok ? "✓" : "✗"}
            </span>
          </div>
        ))}
      </div>

      {/* Currently processing */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">В обработке сейчас</p>
        {PROCESSING_CANDIDATES.map((code, i) => (
          <div key={code} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-bg-elevated/50 px-3 py-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green/10">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" style={{ animationDelay: `${i * 0.3}s` }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green" />
              </span>
            </div>
            <span className="font-mono text-xs font-semibold text-white">{code}</span>
            <div className="ml-auto h-1 w-20 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-brand-green/60 animate-pulse"
                style={{ width: `${45 + i * 18}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted">{45 + i * 18}%</span>
          </div>
        ))}
      </div>

      {/* Audit trail note */}
      <div className="flex items-start gap-2 rounded-xl border border-white/6 bg-bg-elevated/40 px-3 py-2.5">
        <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
        <p className="text-[10px] leading-relaxed text-text-muted">
          Каждая оценка фиксируется в неизменяемом audit log с версией модели, временной меткой и хэшем входных данных.{" "}
          <span className="text-brand-green font-semibold"><LiveClock /></span>
        </p>
      </div>
    </div>
  );
}
