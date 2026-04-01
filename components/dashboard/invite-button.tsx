"use client";

import { Star, LoaderCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  candidateId: string;
  currentStatus: string;
};

export function InviteButton({ candidateId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(currentStatus === "shortlisted");

  if (done) {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border border-brand-green/30 bg-brand-green/8 px-3 py-2 text-xs font-semibold text-brand-green">
        <CheckCircle2 className="h-3.5 w-3.5" />
        В шорт-листе
      </div>
    );
  }

  const handleInvite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "shortlisted" }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? "Не удалось обновить статус");
        return;
      }

      toast.success("Кандидат добавлен в шорт-лист");
      setDone(true);
      router.refresh();
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInvite}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-xl border border-brand-green/25 bg-brand-green/8 px-3 py-2 text-xs font-semibold text-brand-green transition-all hover:bg-brand-green hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Star className="h-3.5 w-3.5" />
      )}
      {loading ? "Добавляем..." : "В шорт-лист"}
    </button>
  );
}
