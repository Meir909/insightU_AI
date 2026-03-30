import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import { analyzeAudio, analyzeVideo } from "@/lib/services/media-analysis";
import { uploadAudio, uploadDocument, uploadVideo } from "@/lib/services/s3";
import {
  createArtifact,
  createAuditLog,
  getCandidateByAccountId,
  getAuthenticatedAccountByToken,
} from "@/lib/server/prisma";

function inferKind(mimeType: string) {
  if (mimeType.startsWith("audio/")) return "audio" as const;
  if (mimeType.startsWith("video/")) return "video" as const;
  return "document" as const;
}

export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    const candidate = await getCandidateByAccountId(session.sessionId);
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate profile not found" }, { status: 404 }));
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return addSecurityHeaders(NextResponse.json({ error: "file is required" }, { status: 400 }));
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const kind = inferKind(mimeType);

    const upload =
      kind === "audio"
        ? await uploadAudio(bytes, file.name, mimeType, candidate.id)
        : kind === "video"
          ? await uploadVideo(bytes, file.name, mimeType, candidate.id)
          : await uploadDocument(bytes, file.name, mimeType, candidate.id);

    if (!upload.success || !upload.url) {
      return addSecurityHeaders(
        NextResponse.json({ error: upload.error || "Failed to upload artifact" }, { status: 500 }),
      );
    }

    const analysis =
      kind === "audio"
        ? await analyzeAudio(bytes, mimeType)
        : kind === "video"
          ? await analyzeVideo(bytes, mimeType, "Candidate uploaded supporting video evidence.")
          : {
              transcript: await file.text().catch(() => ""),
              keyPoints: ["Structured document uploaded", "Document linked to candidate session"],
              summary: "Document uploaded and attached to the candidate interview session.",
            };

    const artifact = await createArtifact({
      candidateId: candidate.id,
      type: kind,
      name: file.name,
      url: upload.url,
      size: file.size,
      mimeType,
      analysis,
    });

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    await createAuditLog({
      action: "CHAT_ARTIFACT_UPLOADED",
      entityType: "artifact",
      entityId: artifact.id,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: candidate.id,
        kind,
        fileName: file.name,
      },
    });

    const transcript =
      analysis && typeof analysis === "object" && "transcript" in analysis && typeof analysis.transcript === "string"
        ? analysis.transcript
        : undefined;
    const extractedSignals =
      analysis && typeof analysis === "object" && "keyPoints" in analysis && Array.isArray(analysis.keyPoints)
        ? analysis.keyPoints.filter((item): item is string => typeof item === "string")
        : [];

    return addSecurityHeaders(
      NextResponse.json({
        attachment: {
          id: artifact.id,
          kind,
          name: artifact.name,
          mimeType: artifact.mimeType,
          sizeKb: Math.max(1, Math.round(artifact.size / 1024)),
          status: "ready",
          transcript,
          extractedSignals,
          storagePath: artifact.url,
        },
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to upload artifact" },
        { status: 500 },
      ),
    );
  }
}
