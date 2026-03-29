import { NextRequest, NextResponse } from "next/server";
import { envFlags } from "@/lib/env";
import { getAuthSession } from "@/lib/server/auth";
import { backendFetch } from "@/lib/server/backend-client";
import { processUpload } from "@/lib/server/multimodal";
import { persistUploadedArtifactMeta } from "@/lib/server/persistent-store";

export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (envFlags.backend) {
    try {
      const backendForm = new FormData();
      backendForm.set("file", file);

      const data = await backendFetch<{
        artifact: {
          id: string;
          kind: "text" | "audio" | "video" | "document";
          name: string;
          mime_type: string;
          size_kb: number;
          status: "uploaded" | "processing" | "ready";
          transcript?: string | null;
          extracted_signals?: string[];
          storage_path?: string | null;
        };
      }>("/api/v1/uploads", { method: "POST", body: backendForm }, session.sessionId);

      return NextResponse.json({
        attachment: {
          id: data.artifact.id,
          kind: data.artifact.kind,
          name: data.artifact.name,
          mimeType: data.artifact.mime_type,
          sizeKb: data.artifact.size_kb,
          status: data.artifact.status,
          transcript: data.artifact.transcript ?? undefined,
          extractedSignals: data.artifact.extracted_signals ?? [],
          storagePath: data.artifact.storage_path ?? undefined,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to upload artifact" },
        { status: 500 },
      );
    }
  }

  const attachment = await processUpload(file);
  await persistUploadedArtifactMeta(attachment);
  return NextResponse.json({ attachment });
}
