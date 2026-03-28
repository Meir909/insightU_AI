"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { ChatMessage } from "@/lib/types";

export function ChatWindow({
  messages,
  loading,
}: {
  messages: ChatMessage[];
  loading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="rounded-[32px] border border-white/6 bg-bg-base/70 p-4 grain">
      <div className="flex h-[58vh] flex-col gap-4 overflow-y-auto pr-2">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-[24px] border border-white/6 bg-bg-surface px-4 py-3 text-sm text-text-secondary">
              AI is thinking...
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
