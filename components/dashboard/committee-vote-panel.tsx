"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Candidate, CommitteeVoteDecision } from "@/lib/types";

export function CommitteeVotePanel({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [decision, setDecision] = useState<CommitteeVoteDecision>("approve");
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitVote = async () => {
    setSubmitting(true);
    const response = await fetch("/api/committee/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: candidate.id,
        decision,
        rationale,
      }),
    });
    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      toast.error(data.error || "Не удалось сохранить голос");
      return;
    }

    toast.success("Голос комиссии сохранён");
    setRationale("");
    router.refresh();
  };

  return (
    <div className="rounded-[24px] border border-white/6 bg-bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-1 rounded-full bg-brand-green" />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
          Committee vote
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["approve", "hold", "reject"] as CommitteeVoteDecision[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setDecision(item)}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
              decision === item ? "bg-brand-green text-black" : "border border-white/8 bg-bg-elevated text-text-secondary hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <textarea
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        rows={4}
        placeholder="Кратко и аргументированно объясните решение комиссии..."
        className="mt-4 w-full rounded-2xl border border-white/8 bg-bg-elevated px-4 py-3 text-sm text-white outline-none placeholder:text-text-muted"
      />
      <button
        type="button"
        disabled={submitting || rationale.trim().length < 10}
        onClick={submitVote}
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-brand-green px-5 py-3 text-sm font-bold text-black transition-all hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Сохраняю..." : "Сохранить голос"}
      </button>
    </div>
  );
}
