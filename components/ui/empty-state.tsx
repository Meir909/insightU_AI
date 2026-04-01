import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
        <Icon className="h-7 w-7 text-text-muted" />
      </div>
      <div className="max-w-xs space-y-1.5">
        <p className="text-base font-bold text-white">{title}</p>
        <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
