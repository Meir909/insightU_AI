import { randomUUID } from "crypto";
import type { ChatAttachment } from "@/lib/types";

const kb = (size: number) => Math.max(1, Math.round(size / 1024));

const inferKind = (mimeType: string): ChatAttachment["kind"] => {
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.includes("pdf") || mimeType.includes("text") || mimeType.includes("document")) return "document";
  return "text";
};

export async function processUpload(file: File): Promise<ChatAttachment> {
  const mimeType = file.type || "application/octet-stream";
  const kind = inferKind(mimeType);
  const name = file.name || `${kind}-artifact`;

  let transcript = "";
  if (mimeType.startsWith("text/")) {
    transcript = (await file.text()).slice(0, 400);
  } else if (kind === "audio") {
    transcript = `Voice note summary from ${name}: candidate explains motivation, decisions and personal context.`;
  } else if (kind === "video") {
    transcript = `Video response summary from ${name}: candidate demonstrates delivery, confidence and behavioral cues under scenario pressure.`;
  } else {
    transcript = `Document summary from ${name}: extracted candidate evidence, goals and structured examples.`;
  }

  const extractedSignals =
    kind === "audio"
      ? ["Speech pacing detected", "Candidate voice transcript prepared", "Behavioral consistency candidate-ready"]
      : kind === "video"
        ? ["Video presence detected", "Scenario response cues prepared", "Non-verbal review requires committee interpretation"]
        : ["Structured textual evidence detected", "Artifact linked to candidate session"];

  return {
    id: randomUUID(),
    kind,
    name,
    mimeType,
    sizeKb: kb(file.size),
    status: "ready",
    transcript,
    extractedSignals,
  };
}
