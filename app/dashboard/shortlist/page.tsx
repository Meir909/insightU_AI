import { Download, ExternalLink, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { getShortlist } from "@/lib/api";

const DECISION_LABEL: Record<string, { label: string; color: string }> = {
  approved: { label: "Одобрен комиссией", color: "text-brand-green" },
  rejected: { label: "Отклонен", color: "text-red-400" },
  escalated: { label: "На эскалации", color: "text-yellow-400" },
  pending: { label: "Ожидает решения", color: "text-text-muted" },
};

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
              вспомогательный характер, итоговое решение остается за комиссией.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-brand-green/15 bg-brand-green/8 px-4 py-2 text-xs font-semibold text-brand-green">
              {shortlist.length} финалистов
            </div>
            <a
              href="/api/export/shortlist"
              download
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-white/20 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Экспорт CSV
            </a>
          </div>
        </div>
      </section>

      {shortlist.length === 0 && (
        <section className="rounded-[28px] border border-white/6 bg-bg-surface p-12 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-text-muted" />
          <p className="text-lg font-bold text-white">Шорт-лист пока пуст</p>
          <p className="mt-2 text-sm text-text-secondary">Кандидаты появятся здесь после того, как комиссия выставит достаточно голосов за одобрение.</p>
        </section>
      )}

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
                  : { border: "border-white/6", bg: "bg-white/4", text: "text-text-muted", label: `#${rank}` };

          const decision = candidate.committee_review?.finalDecision ?? "pending";
          const decisionStyle = DECISION_LABEL[decision] ?? DECISION_LABEL.pending;
          const approvedVotes = candidate.committee_review?.approvedCount ?? 0;
          const requiredVotes = candidate.committee_review?.requiredApprovals ?? 3;

          return (
            <article
              key={candidate.id}
              className={`rounded-[28px] border bg-bg-surface p-5 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md ${rankStyle.border}`}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <span className={`mb-2 inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-black ${rankStyle.bg} ${rankStyle.text}`}>
                    {rankStyle.label} Место
                  </span>
                  <p className="font-mono text-xs text-brand-green">{candidate.code}</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-white">{candidate.name || candidate.code}</h3>
                  <p className="mt-0.5 text-sm text-text-secondary">{candidate.city} В· {candidate.program}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={candidate.status} />
                  <span className={`font-mono text-4xl font-black ${rankStyle.text}`}>
                    {candidate.final_score.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/6 bg-bg-elevated p-3">
                  <ShieldCheck className="mb-2 h-4 w-4 text-brand-green" />
                  <p className="font-mono text-lg font-black text-brand-green">{Math.round(candidate.confidence * 100)}%</p>
                  <p className="text-[11px] text-text-muted">Доверие</p>
                </div>
                <div className="rounded-2xl border border-white/6 bg-bg-elevated p-3">
                  <Sparkles className="mb-2 h-4 w-4 text-brand-green" />
                  <p className="font-mono text-lg font-black text-brand-green">{Math.round(candidate.ai_detection_prob * 100)}%</p>
                  <p className="text-[11px] text-text-muted">AI риск</p>
                </div>
                <div className="rounded-2xl border border-white/6 bg-bg-elevated p-3">
                  <Users className="mb-2 h-4 w-4 text-brand-green" />
                  <p className="font-mono text-lg font-black text-brand-green">{approvedVotes}/{requiredVotes}</p>
                  <p className="text-[11px] text-text-muted">Голосов</p>
                </div>
              </div>

              {/* Committee decision status */}
              <div className="mb-4 flex items-center justify-between rounded-xl border border-white/6 bg-bg-elevated px-3 py-2">
                <span className="text-[11px] text-text-muted">Решение комиссии</span>
                <span className={`text-[11px] font-bold ${decisionStyle.color}`}>{decisionStyle.label}</span>
              </div>

              <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">{candidate.reasoning}</p>

              {candidate.key_quotes?.[0] && (
                <div className="mb-4 rounded-2xl border border-brand-green/15 bg-brand-green/6 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">Ключевая цитата</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-secondary">
                    &laquo;{candidate.key_quotes[0]}&raquo;
                  </p>
                </div>
              )}

              <Link
                href={`/dashboard/candidates/${candidate.id}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-xs font-semibold text-text-secondary transition hover:border-white/20 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Открыть профиль
              </Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
