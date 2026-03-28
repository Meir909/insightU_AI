"use client";

import dynamic from "next/dynamic";

const ScoreSphere = dynamic(
  () => import("@/components/3d/score-sphere").then((mod) => mod.ScoreSphere),
  { ssr: false },
);

export function ScoreSpherePanel({ score }: { score: number }) {
  return (
    <div className="mt-2 flex flex-col items-center">
      <ScoreSphere score={Math.round(score)} />
      <p className="font-mono text-5xl font-black text-brand-green">{score.toFixed(1)}</p>
      <p className="mt-1 text-xs text-text-muted">из 100 возможных</p>
    </div>
  );
}
