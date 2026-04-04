"use client";

import { motion } from "framer-motion";
import { ArrowUpDown, ChevronLeft, ChevronRight, Filter, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
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
      ? "bg-brand-green/20 text-brand-green"
      : tone === "amber"
        ? "bg-status-mid/20 text-status-mid"
        : "bg-status-low/20 text-status-low";

  return <span className={`rounded-xl px-3 py-1 font-mono text-xs font-bold ${color}`}>{value}</span>;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-white/6 px-4 py-5">
      <div className="skeleton h-11 w-11 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-40 rounded-full" />
        <div className="skeleton h-2.5 w-28 rounded-full" />
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <div className="skeleton h-6 w-14 rounded-xl" />
        <div className="skeleton h-6 w-24 rounded-xl" />
        <div className="skeleton h-6 w-16 rounded-xl" />
        <div className="skeleton h-6 w-14 rounded-xl" />
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CandidateTable({ candidates, loading = false }: { candidates: Candidate[]; loading?: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 200);

  const filtered = useMemo(() => {
    const normalized = debouncedSearch.trim().toLowerCase();
    const list = candidates.filter((candidate) => {
      const haystack = [candidate.code, candidate.city, candidate.program, candidate.name].join(" ").toLowerCase();
      if (!haystack.includes(normalized)) return false;
      if (statusFilter !== "all" && candidate.status !== statusFilter) return false;
      return true;
    });

    return list.sort((a, b) => (sortDesc ? b.final_score - a.final_score : a.final_score - b.final_score));
  }, [candidates, debouncedSearch, sortDesc]);

  // Reset to page 1 on filter/sort change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/6 bg-bg-surface">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-white/6 p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Поиск по имени, коду, городу..."
            className="w-full rounded-2xl border border-white/6 bg-bg-elevated py-2.5 pl-10 pr-10 text-sm text-white outline-none transition-colors placeholder:text-text-muted focus:border-brand-green/25 focus-visible:ring-2 focus-visible:ring-brand-green/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-muted transition-colors hover:text-white focus:outline-none"
              aria-label="Очистить поиск"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="appearance-none rounded-2xl border border-white/6 bg-bg-elevated py-2.5 pl-9 pr-8 text-xs font-semibold text-text-secondary outline-none transition-colors hover:border-brand-green/20 hover:text-white focus:border-brand-green/25 focus-visible:ring-2 focus-visible:ring-brand-green/30"
              aria-label="Фильтр по статусу"
            >
              <option value="all">Все статусы</option>
              <option value="in_progress">В процессе</option>
              <option value="shortlisted">Шортлист</option>
              <option value="flagged">На проверке</option>
              <option value="rejected">Отклонён</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => { setSortDesc((value) => !value); setPage(1); }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/6 bg-bg-elevated px-4 py-2.5 text-xs font-semibold text-text-secondary transition-all duration-150 hover:border-brand-green/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/35 active:scale-[0.98]"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortDesc ? "Сначала высокий score" : "Сначала низкий score"}
          </button>
        </div>
      </div>

      {/* Skeleton loading */}
      {loading && (
        <>
          <div className="hidden md:block">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/6 bg-bg-elevated p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-20 rounded-full" />
                    <div className="skeleton h-4 w-32 rounded-full" />
                  </div>
                  <div className="skeleton h-8 w-14 rounded-xl" />
                </div>
                <div className="flex gap-2">
                  <div className="skeleton h-6 w-16 rounded-xl" />
                  <div className="skeleton h-6 w-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title={search ? "Кандидаты не найдены" : "Кандидатов пока нет"}
          description={
            search
              ? `По запросу «${search}» ничего не найдено. Попробуйте другой запрос.`
              : "Когда кандидаты пройдут регистрацию, они появятся здесь."
          }
        />
      )}

      {/* Desktop list */}
      <div className="hidden divide-y divide-white/6 md:block">
        {!loading && paginated.map((candidate, index) => {
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
              className="group flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-all duration-150 hover:bg-white/[0.035] hover:shadow-[inset_0_0_0_1px_rgba(200,240,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-green/35 active:bg-white/[0.05]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-green/20 bg-brand-green/10 font-mono text-xs font-bold text-brand-green">
                  {candidate.code.slice(-2)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {candidate.name || candidate.code}
                    </p>
                    <span className="font-mono text-xs text-text-muted">{candidate.code}</span>
                    <StatusBadge status={candidate.status} />
                  </div>
                  <p className="truncate text-xs text-text-secondary">
                    {candidate.city} • {candidate.program}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
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

      {/* Mobile card grid */}
      <div className="grid gap-3 p-3 md:hidden">
        {!loading && paginated.map((candidate, index) => {
          const review = candidate.committee_review;
          const aiRisk = Math.round(candidate.ai_detection_prob * 100);

          return (
            <motion.button
              key={candidate.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/dashboard/candidates/${candidate.id}`)}
              className="group w-full rounded-2xl border border-white/6 bg-bg-elevated p-4 text-left transition-all hover:border-brand-green/20 hover:bg-white/[0.03]"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">{candidate.name || candidate.code}</p>
                  <p className="mt-0.5 font-mono text-xs text-brand-green">{candidate.code}</p>
                  <p className="mt-1 text-xs text-text-secondary">{candidate.city} • {candidate.program}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={candidate.status} />
                  <span className="font-mono text-lg font-black text-brand-green">
                    {candidate.final_score.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <MetricPill value={`${Math.round(candidate.confidence * 100)}% доверие`} tone="amber" />
                <MetricPill value={`${review?.approvedCount ?? 0}/${review?.requiredApprovals ?? 3} голосов`} />
                <MetricPill value={`AI ${aiRisk}%`} tone={aiRisk >= 70 ? "red" : aiRisk >= 40 ? "amber" : "green"} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer: count + pagination */}
      <div className="flex items-center justify-between border-t border-white/6 px-4 py-3">
        <span className="text-xs text-text-muted">
          Показано {paginated.length} из {filtered.length} ({candidates.length} всего)
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-text-muted transition hover:border-brand-green/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Предыдущая страница"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition ${
                  p === safePage
                    ? "bg-brand-green/15 text-brand-green border border-brand-green/25"
                    : "border border-white/8 text-text-muted hover:border-white/15 hover:text-white"
                }`}
                aria-label={`Страница ${p}`}
                aria-current={p === safePage ? "page" : undefined}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-text-muted transition hover:border-brand-green/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Следующая страница"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
