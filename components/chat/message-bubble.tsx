import { FileText, Video, Waves } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm leading-relaxed ${
          isUser ? "bg-brand-green text-black" : "border border-white/6 bg-white/[0.03] text-text-secondary"
        }`}
      >
        <p>{message.content}</p>
        {message.attachments?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${
                  isUser ? "border-black/10 bg-black/10 text-black" : "border-white/8 bg-bg-elevated text-text-secondary"
                }`}
              >
                {attachment.kind === "audio" ? <Waves className="h-3.5 w-3.5" /> : attachment.kind === "video" ? <Video className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {attachment.name}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
