import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-[24px] px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-brand-green text-black"
            : "border border-white/6 bg-bg-surface text-text-secondary"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
