export function ScorePill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-bg-elevated px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold text-brand-green">{value}</p>
    </div>
  );
}
