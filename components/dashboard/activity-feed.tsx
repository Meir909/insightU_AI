import { MOCK_CANDIDATES } from "@/lib/mock-data";

const events = [
  "Скоринг профиля IU-2414 обновлён после follow-up интервью",
  "В шорт-лист добавлен кандидат из Семея",
  "3 профиля помечены на ручную проверку из-за low confidence",
  "AI-detector завершил пересчёт по последним эссе",
];

export function ActivityFeed() {
  return (
    <div className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">
            Activity
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">Живая лента системы</h3>
        </div>
        <p className="font-mono text-xs text-brand-green">{MOCK_CANDIDATES.length} profiles</p>
      </div>
      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={event} className="flex gap-3 rounded-2xl border border-white/6 bg-bg-elevated p-4">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-green shadow-green-sm" />
            <div>
              <p className="text-sm text-text-secondary">{event}</p>
              <p className="mt-1 text-[11px] text-text-muted">{index + 2} мин назад</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
