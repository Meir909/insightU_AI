import { Eye, Shield, Users } from "lucide-react";

const items = [
  {
    icon: Shield,
    text: "ИИ не принимает окончательных решений о зачислении или отказе.",
    badge: "Соблюдается",
  },
  {
    icon: Users,
    text: "Для положительного решения нужны минимум 3 независимых одобрения комиссии.",
    badge: "Соблюдается",
  },
  {
    icon: Eye,
    text: "Каждая рекомендация ИИ проходит human review и сопровождается explainability.",
    badge: "Соблюдается",
  },
];

export function CompliancePanel() {
  const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Decision rules</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-white">Коллегиальное решение комиссии</h3>
        </div>
        <span className="mt-1 shrink-0 rounded-xl border border-brand-green/20 bg-brand-green/8 px-2.5 py-1 text-[10px] font-semibold text-brand-green">
          Обновлено {now}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {items.map(({ icon: Icon, text, badge }) => (
          <div key={text} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-bg-elevated/70 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/4">
              <Icon className="h-4 w-4 text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed text-text-secondary">{text}</p>
            </div>
            <span className="ml-2 shrink-0 rounded-xl bg-brand-green/12 px-2.5 py-1 text-[10px] font-bold text-brand-green">
              {badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
