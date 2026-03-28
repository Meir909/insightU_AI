import { cn } from "@/lib/utils";
import type { CandidateStatus } from "@/lib/types";

const config: Record<
  CandidateStatus,
  { label: string; className: string }
> = {
  in_progress: {
    label: "В процессе",
    className: "bg-white/5 text-text-secondary",
  },
  completed: {
    label: "Завершён",
    className: "bg-white/5 text-white/70",
  },
  shortlisted: {
    label: "Шорт-лист",
    className: "bg-brand-green/12 text-brand-green",
  },
  rejected: {
    label: "Отклонён",
    className: "bg-status-low/12 text-status-low",
  },
  flagged: {
    label: "Флаг",
    className: "bg-status-flag/12 text-status-flag",
  },
};

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const item = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        item.className,
      )}
    >
      {item.label}
    </span>
  );
}
