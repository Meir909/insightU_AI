"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpDown, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Candidate } from "@/lib/types";

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-brand-green/12 text-brand-green"
      : score >= 50
        ? "bg-status-mid/12 text-status-mid"
        : "bg-status-low/12 text-status-low";

  return (
    <span className={`rounded-xl px-3 py-1 font-mono text-sm font-bold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function AIPill({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const color =
    pct >= 70
      ? "bg-status-ai/12 text-status-ai"
      : pct >= 40
        ? "bg-status-mid/12 text-status-mid"
        : "bg-brand-green/12 text-brand-green";

  return (
    <span className={`rounded-xl px-3 py-1 font-mono text-xs font-bold ${color}`}>
      {pct}%
    </span>
  );
}

export function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const list = candidates.filter((candidate) => {
      const haystack = [
        candidate.code,
        candidate.city,
        candidate.program,
        candidate.name,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });

    return list.sort((a, b) =>
      sortDesc ? b.final_score - a.final_score : a.final_score - b.final_score,
    );
  }, [candidates, search, sortDesc]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/6 bg-bg-surface">
      <div className="flex flex-col gap-3 border-b border-white/6 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по городу, коду, программе"
            className="w-full rounded-2xl border border-white/6 bg-bg-elevated py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-text-muted focus:border-brand-green/25"
          />
        </div>
        <button
          type="button"
          onClick={() => setSortDesc((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/6 bg-bg-elevated px-4 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:border-brand-green/20 hover:text-white"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortDesc ? "Сначала высокий score" : "Сначала низкий score"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/6">
              {["#", "Кандидат", "Итог", "Мышление", "Рост", "AI", "Статус", ""].map(
                (label) => (
                  <th
                    key={label}
                    className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted"
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((candidate, index) => (
              <motion.tr
                key={candidate.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => router.push(`/dashboard/candidates/${candidate.id}`)}
                className="cursor-pointer border-b border-white/4 transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-4 font-mono text-xs text-text-muted">{index + 1}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-brand-green/20 bg-brand-green/10 font-mono text-xs font-bold text-brand-green">
                      {candidate.code.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{candidate.code}</p>
                        {candidate.needs_manual_review ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-status-flag" />
                        ) : null}
                      </div>
                      <p className="text-xs text-text-secondary">
                        {candidate.city} · {candidate.program}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ScorePill score={candidate.final_score} />
                </td>
                <td className="px-4 py-4 font-mono text-sm text-text-secondary">
                  {candidate.cognitive.toFixed(0)}
                </td>
                <td className="px-4 py-4 font-mono text-sm text-text-secondary">
                  {candidate.growth.toFixed(0)}
                </td>
                <td className="px-4 py-4">
                  <AIPill probability={candidate.ai_detection_prob} />
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={candidate.status} />
                </td>
                <td className="px-4 py-4">
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 text-xs text-text-muted">
        Показано {filtered.length} из {candidates.length} кандидатов
      </div>
    </div>
  );
}
