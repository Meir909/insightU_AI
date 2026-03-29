const items = [
  "ИИ не принимает окончательных решений о зачислении или отказе.",
  "Положительное решение нельзя принять голосом одного члена комиссии: требуется минимум два независимых одобрения.",
  "Рекомендации идут только в комиссию и требуют human-in-the-loop проверки.",
  "Демографические и социально-экономические признаки исключаются из скоринга.",
  "Система обязана давать понятные объяснения и показывать evidence, а не только итоговый балл.",
];

export function CompliancePanel() {
  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
        Compliance
      </p>
      <h3 className="mt-1 text-xl font-black tracking-tight text-white">
        Ограничения кейса соблюдаются на уровне продукта
      </h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-white/6 bg-bg-elevated p-4">
            <p className="text-sm leading-relaxed text-text-secondary">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
