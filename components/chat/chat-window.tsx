"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { ChatMessage } from "@/lib/types";

export function ChatWindow({ messages, loading }: { messages: ChatMessage[]; loading: boolean }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="panel-soft grain p-4">
      <div role="log" aria-live="polite" aria-label="История сообщений интервью" className="flex h-[62vh] flex-col gap-4 overflow-y-auto pr-1 xl:h-[58vh]">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {loading ? (
          <div className="flex justify-start" aria-live="assertive" aria-atomic="true">
            <div className="rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3.5">
              <span className="flex items-center gap-1" aria-label="AI печатает...">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}