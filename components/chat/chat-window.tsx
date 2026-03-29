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
    <div className="panel-soft grain p-4">
      <div className="flex h-[58vh] flex-col gap-4 overflow-y-auto pr-1">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-text-secondary">
              AI is thinking...
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
