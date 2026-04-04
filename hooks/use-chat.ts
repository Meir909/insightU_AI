"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatAttachment, ChatMessage, InterviewScoreUpdate } from "@/lib/types";

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
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [progress, setProgress] = useState(5);
  const [status, setStatus] = useState<"active" | "completed">("active");
  const [paused, setPaused] = useState(false);
  const [scoreUpdate, setScoreUpdate] = useState<InterviewScoreUpdate | null>(null);
  const [phase, setPhase] = useState("Foundation");

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    void fetch(`/api/chat?session_id=${sessionIdRef.current}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.session_id) {
          sessionIdRef.current = data.session_id as string;
          window.sessionStorage.setItem("insightu-chat-session", data.session_id as string);
        }
        setMessages(data.messages ?? []);
        setProgress(data.progress ?? 5);
        setStatus(data.status ?? "active");
        setScoreUpdate(data.score_update ?? null);
        setPhase(data.phase ?? "Foundation");
      });
  }, []);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);

    // Add optimistic placeholders immediately so user sees chips right away
    const fileArray = Array.from(files);
    const placeholders: ChatAttachment[] = fileArray.map((file) => ({
      id: `uploading-${crypto.randomUUID()}`,
      kind: file.type.startsWith("audio/")
        ? "audio"
        : file.type.startsWith("video/")
          ? "video"
          : "document",
      name: file.name,
      mimeType: file.type,
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
      status: "uploading" as const,
    }));
    setAttachments((current) => [...current, ...placeholders]);

    const uploaded: ChatAttachment[] = [];
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const placeholderId = placeholders[i].id;

      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.attachment) {
        const ready = data.attachment as ChatAttachment;
        // Replace placeholder with real attachment
        setAttachments((current) =>
          current.map((a) => (a.id === placeholderId ? ready : a)),
        );
        uploaded.push(ready);
      } else {
        // Remove failed placeholder
        setAttachments((current) => current.filter((a) => a.id !== placeholderId));
      }
    }

    setUploading(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  };

  const togglePause = () => setPaused((v) => !v);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || loading || status === "completed" || paused) return;

    const content =
      trimmed ||
      "Прикладываю дополнительные материалы для оценки: voice / video / document evidence.";

    const optimisticUser: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      attachments,
    };

    setMessages((current) => [...current, optimisticUser]);
    setInput("");
    setLoading(true);

    const currentAttachments = attachments;
    setAttachments([]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: content,
        session_id: sessionIdRef.current,
        attachments: currentAttachments,
      }),
    });

    const data = await response.json();
    if (data.session_id) {
      sessionIdRef.current = data.session_id as string;
      window.sessionStorage.setItem("insightu-chat-session", data.session_id as string);
    }
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
    uploading,
    attachments,
    uploadFiles,
    removeAttachment,
    progress,
    status,
    paused,
    togglePause,
    scoreUpdate,
    phase,
  };
}
