"use client";

import { motion } from "framer-motion";
import { ArrowUpDown, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Candidate } from "@/lib/types";

function MetricPill({
  value,
  tone = "green",
}: {
  value: string;
  tone?: "green" | "amber" | "red";
}) {
  const color =
    tone === "green"
      ? "bg-brand-green/12 text-brand-green"
      : tone === "amber"
        ? "bg-status-mid/12 text-status-mid"
        : "bg-status-low/12 text-status-low";

  return <span className={`rounded-xl px-3 py-1 font-mono text-xs font-bold ${color}`}>{value}</span>;
}

export function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const list = candidates.filter((candidate) => {
      const haystack = [candidate.code, candidate.city, candidate.program, candidate.name].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });

    return list.sort((a, b) => (sortDesc ? b.final_score - a.final_score : a.final_score - b.final_score));
  }, [candidates, search, sortDesc]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/6 bg-bg-surface">
      <div className="flex flex-col gap-3 border-b border-white/6 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по коду, городу или программе"
            className="w-full rounded-2xl border border-white/6 bg-bg-elevated py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-text-muted focus:border-brand-green/25 focus-visible:ring-2 focus-visible:ring-brand-green/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setSortDesc((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/6 bg-bg-elevated px-4 py-2.5 text-xs font-semibold text-text-secondary transition-all duration-150 hover:border-brand-green/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.98]"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortDesc ? "Сначала высокий score" : "Сначала низкий score"}
        </button>
      </div>

      <div className="divide-y divide-white/6">
        {filtered.map((candidate, index) => {
          const review = candidate.committee_review;
          const aiRisk = Math.round(candidate.ai_detection_prob * 100);

          return (
            <motion.button
              key={candidate.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              whileTap={{ scale: 0.995 }}
              onClick={() => router.push(`/dashboard/candidates/${candidate.id}`)}
              className="group flex w-full flex-col gap-4 px-4 py-4 text-left transition-all duration-150 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-green/35 active:bg-white/[0.03] md:flex-row md:items-center md:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-green/20 bg-brand-green/10 font-mono text-xs font-bold text-brand-green">
                  {candidate.code.slice(-2)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{candidate.code}</p>
                    <StatusBadge status={candidate.status} />
                  </div>
                  <p className="truncate text-xs text-text-secondary">
                    {candidate.city} • {candidate.program}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <MetricPill value={candidate.final_score.toFixed(1)} />
                <MetricPill value={`${Math.round(candidate.confidence * 100)}% доверие`} tone="amber" />
                <MetricPill value={`${review?.approvedCount ?? 0}/${review?.requiredApprovals ?? 3} голосов`} />
                <MetricPill value={`AI ${aiRisk}%`} tone={aiRisk >= 70 ? "red" : aiRisk >= 40 ? "amber" : "green"} />
                <ChevronRight className="h-4 w-4 text-text-muted transition-transform duration-150 group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="px-4 py-3 text-xs text-text-muted">Показано {filtered.length} из {candidates.length} кандидатов</div>
    </div>
  );
}
