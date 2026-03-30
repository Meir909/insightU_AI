import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import {
  createArtifact,
  createAuditLog,
  createLiveInterviewRecord,
  getCandidateById,
  getInterviewSessionByCandidateId,
  getAuthenticatedAccountByToken,
} from "@/lib/server/prisma";
import { analyzeAudio, analyzeVoiceMessage } from "@/lib/services/media-analysis";
import { uploadAudio, validateFile } from "@/lib/services/s3";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { id } = await params;
  if (session.role === "candidate" && session.entityId !== id) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const question = String(formData.get("question") || "");
    const context = String(formData.get("context") || "");

    if (!(audio instanceof File)) {
      return addSecurityHeaders(NextResponse.json({ error: "No audio file provided" }, { status: 400 }));
    }

    const validation = validateFile(audio, "audio");
    if (!validation.valid) {
      return addSecurityHeaders(NextResponse.json({ error: validation.error }, { status: 400 }));
    }

    const candidate = await getCandidateById(id);
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const bytes = Buffer.from(await audio.arrayBuffer());
    const upload = await uploadAudio(bytes, audio.name, audio.type, id);
    if (!upload.success || !upload.url) {
      return addSecurityHeaders(
        NextResponse.json({ error: upload.error || "Failed to upload audio" }, { status: 500 }),
      );
    }

    const analysis = question
      ? await analyzeAudio(bytes, audio.type)
      : await analyzeVoiceMessage(bytes, audio.type, context);

    const artifact = await createArtifact({
      candidateId: id,
      type: "audio",
      name: audio.name,
      url: upload.url,
      size: audio.size,
      mimeType: audio.type,
      analysis: {
        question,
        context,
        ...analysis,
      },
    });

    const interviewSession = await getInterviewSessionByCandidateId(id);
    await createLiveInterviewRecord({
      candidateId: id,
      sessionId: interviewSession?.id ?? `voice-${randomUUID()}`,
      type: "voice",
      voiceAnalysis: analysis,
      combinedScore: "scores" in analysis ? analysis.scores.overall : analysis.confidence,
      confidence: "scores" in analysis ? analysis.scores.confidence : analysis.confidence,
      stressLevel: "emotions" in analysis ? analysis.emotions.stress : undefined,
      authenticity: "scores" in analysis ? analysis.scores.confidence : analysis.confidence,
      recommendation:
        "scores" in analysis && analysis.scores.overall >= 75
          ? "proceed"
          : "manual_review",
    });

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    await createAuditLog({
      action: "VOICE_ARTIFACT_UPLOADED",
      entityType: "artifact",
      entityId: artifact.id,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: id,
        artifactType: "audio",
        question,
        context,
      },
    });

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        artifactId: artifact.id,
        analysis,
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to analyze voice" },
        { status: 500 },
      ),
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { id } = await params;
  if (session.role === "candidate" && session.entityId !== id) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  try {
    const candidate = await getCandidateById(id);
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const voiceMessages = candidate.artifacts
      .filter((artifact) => artifact.type === "audio")
      .map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        url: artifact.url,
        uploadedAt: artifact.createdAt.toISOString(),
        analysis: artifact.analysis,
      }));

    return addSecurityHeaders(NextResponse.json({ voiceMessages }));
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch voice messages" },
        { status: 500 },
      ),
    );
  }
}
