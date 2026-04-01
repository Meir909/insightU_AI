import { ShieldCheck, Sparkles, Star } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { getShortlist } from "@/lib/api";

export default async function ShortlistPage() {
  const shortlist = await getShortlist();

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/6 bg-bg-surface p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Финалисты</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Кандидаты в шорт-листе</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Профили с лучшим балансом по аналитике, мотивации, росту и аутентичности. Рекомендации AI носят
              вспомогательный характер — итоговое решение за комиссией.
            </p>
          </div>
          <div className="rounded-full border border-brand-green/15 bg-brand-green/8 px-4 py-2 text-xs font-semibold text-brand-green">
            {shortlist.length} финалистов
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {shortlist.map((candidate, index) => {
          const rank = index + 1;
          const rankStyle =
            rank === 1
              ? { border: "border-yellow-400/40", bg: "bg-yellow-400/8", text: "text-yellow-400", label: "#1" }
              : rank === 2
                ? { border: "border-slate-400/40", bg: "bg-slate-400/8", text: "text-slate-300", label: "#2" }
                : rank === 3
                  ? { border: "border-orange-400/40", bg: "bg-orange-400/8", text: "text-orange-400", label: "#3" }
                  : null;

          return (
            <article
              key={candidate.id}
              className={`rounded-[28px] border bg-bg-surface p-5 ${rankStyle ? rankStyle.border : "border-white/6"}`}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  {rankStyle && (
                    <span className={`mb-2 inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-black ${rankStyle.bg} ${rankStyle.text}`}>
                      {rankStyle.label} Место
                    </span>
                  )}
                  <p className="font-mono text-xs text-brand-green">{candidate.code}</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-white">{candidate.city}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{candidate.program}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={candidate.status} />
                  <span className={`font-mono text-4xl font-black ${rankStyle ? rankStyle.text : "text-brand-green"}`}>
                    {candidate.final_score.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3">
                {[
                  { label: "Доверие", value: `${Math.round(candidate.confidence * 100)}%`, icon: ShieldCheck },
                  { label: "AI риск", value: `${Math.round(candidate.ai_detection_prob * 100)}%`, icon: Sparkles },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/6 bg-bg-elevated p-3">
                    <item.icon className="mb-2 h-4 w-4 text-brand-green" />
                    <p className="font-mono text-lg font-black text-brand-green">{item.value}</p>
                    <p className="text-[11px] text-text-muted">{item.label}</p>
                  </div>
                ))}
              </div>

              <p className="mb-4 text-sm leading-relaxed text-text-secondary">{candidate.reasoning}</p>
              <div className="rounded-2xl border border-brand-green/15 bg-brand-green/6 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">Ключевая цитата</p>
                <p className="mt-2 text-sm italic leading-relaxed text-text-secondary">«{candidate.key_quotes[0]}»</p>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
