"use client";

import { Eye, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export function ViewerEntryButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const continueAsViewer = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "viewer", name: "Зритель demo" }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Не удалось открыть режим просмотра");
        return;
      }

      toast.success("Режим просмотра открыт");
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      toast.error("Ошибка соединения, попробуйте ещё раз");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        onClick={() => void continueAsViewer()}
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-text-secondary transition-all hover:border-white/20 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        {submitting ? "Открываем просмотр..." : "Войти как зритель"}
      </button>

      <p className="text-xs leading-relaxed text-text-muted">
        Зритель входит без регистрации, видит dashboard и профили кандидатов в режиме просмотра, но не может
        голосовать, участвовать в отборе или входить как член комиссии.
      </p>
    </div>
  );
}
