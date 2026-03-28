"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, InterviewScoreUpdate } from "@/lib/types";

const getSessionId = () => {
  if (typeof window === "undefined") return "";
  const existing = window.sessionStorage.getItem("insightu-chat-session");
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem("insightu-chat-session", created);
  return created;
};

export function useChat() {
  const sessionIdRef = useRef("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(12);
  const [status, setStatus] = useState<"active" | "completed">("active");
  const [scoreUpdate, setScoreUpdate] = useState<InterviewScoreUpdate | null>(null);
  const [phase, setPhase] = useState("Foundation");

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    void fetch(`/api/chat?session_id=${sessionIdRef.current}`)
      .then((response) => response.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setProgress(data.progress ?? 12);
        setStatus(data.status ?? "active");
        setScoreUpdate(data.score_update ?? null);
        setPhase(data.phase ?? "Foundation");
      });
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || status === "completed") return;

    const optimisticUser: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUser]);
    setInput("");
    setLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        session_id: sessionIdRef.current,
      }),
    });

    const data = await response.json();
    setMessages(data.messages ?? []);
    setProgress(data.progress ?? progress);
    setStatus(data.status ?? "active");
    setScoreUpdate(data.score_update ?? null);
    setPhase(data.phase ?? phase);
    setLoading(false);
  };

  return {
    messages,
    input,
    setInput,
    sendMessage,
    loading,
    progress,
    status,
    scoreUpdate,
    phase,
  };
}
