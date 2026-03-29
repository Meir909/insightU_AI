const items = [
  "ИИ не принимает окончательных решений о зачислении или отказе.",
  "Для положительного решения нужны минимум 3 независимых одобрения комиссии.",
  "Каждая рекомендация ИИ проходит human review и сопровождается explainability.",
];

export function CompliancePanel() {
  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Decision rules</p>
      <h3 className="mt-1 text-xl font-black tracking-tight text-white">Коллегиальное решение комиссии</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-white/6 bg-bg-elevated/70 p-4">
            <p className="text-sm leading-relaxed text-text-secondary">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
