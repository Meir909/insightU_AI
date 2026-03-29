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
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Finalists</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Кандидаты с strongest fit для комиссии</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Здесь собраны профили с лучшим балансом по cognitive, growth, motivation и authenticity. Все рекомендации
              остаются decision-support, а не автоотбором.
            </p>
          </div>
          <div className="rounded-full border border-brand-green/15 bg-brand-green/8 px-4 py-2 text-xs font-semibold text-brand-green">
            {shortlist.length} finalists selected
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {shortlist.map((candidate) => (
          <article key={candidate.id} className="rounded-[28px] border border-white/6 bg-bg-surface p-5">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-brand-green">{candidate.code}</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-white">{candidate.city}</h3>
                <p className="mt-1 text-sm text-text-secondary">{candidate.program}</p>
              </div>
              <StatusBadge status={candidate.status} />
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              {[
                { label: "Final", value: candidate.final_score.toFixed(1), icon: Star },
                { label: "Confidence", value: `${Math.round(candidate.confidence * 100)}%`, icon: ShieldCheck },
                { label: "AI risk", value: `${Math.round(candidate.ai_detection_prob * 100)}%`, icon: Sparkles },
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
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">Key quote</p>
              <p className="mt-2 text-sm italic leading-relaxed text-text-secondary">«{candidate.key_quotes[0]}»</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
