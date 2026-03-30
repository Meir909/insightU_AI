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
import { analyzeVideo } from "@/lib/services/media-analysis";
import { uploadVideo, validateFile } from "@/lib/services/s3";

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
    const video = formData.get("video");
    const question = String(formData.get("question") || "Tell us about yourself");

    if (!(video instanceof File)) {
      return addSecurityHeaders(NextResponse.json({ error: "No video file provided" }, { status: 400 }));
    }

    const validation = validateFile(video, "video");
    if (!validation.valid) {
      return addSecurityHeaders(NextResponse.json({ error: validation.error }, { status: 400 }));
    }

    const candidate = await getCandidateById(id);
    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    const bytes = Buffer.from(await video.arrayBuffer());
    const upload = await uploadVideo(bytes, video.name, video.type, id);
    if (!upload.success || !upload.url) {
      return addSecurityHeaders(
        NextResponse.json({ error: upload.error || "Failed to upload video" }, { status: 500 }),
      );
    }

    const analysis = await analyzeVideo(bytes, video.type, question);
    const artifact = await createArtifact({
      candidateId: id,
      type: "video",
      name: video.name,
      url: upload.url,
      size: video.size,
      mimeType: video.type,
      analysis: {
        question,
        ...analysis,
      },
    });

    const interviewSession = await getInterviewSessionByCandidateId(id);
    await createLiveInterviewRecord({
      candidateId: id,
      sessionId: interviewSession?.id ?? `video-${randomUUID()}`,
      type: "behavioral",
      videoAnalysis: analysis,
      combinedScore: analysis.scores.overall,
      keyMoments: { highlights: analysis.highlights },
      confidence: analysis.behavioralAnalysis.confidence,
      stressLevel: analysis.behavioralAnalysis.stressLevel,
      authenticity: analysis.behavioralAnalysis.authenticity,
      recommendation: analysis.scores.overall >= 75 ? "proceed" : "manual_review",
    });

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    await createAuditLog({
      action: "VIDEO_ARTIFACT_UPLOADED",
      entityType: "artifact",
      entityId: artifact.id,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: id,
        artifactType: "video",
        question,
        overallScore: analysis.scores.overall,
      },
    });

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        artifactId: artifact.id,
        analysis: {
          scores: analysis.scores,
          transcript: analysis.transcript,
          behavioralAnalysis: analysis.behavioralAnalysis,
          redFlags: analysis.redFlags,
          summary: analysis.summary,
          highlights: analysis.highlights,
        },
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to analyze video" },
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

    const videos = candidate.artifacts
      .filter((artifact) => artifact.type === "video")
      .map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        url: artifact.url,
        uploadedAt: artifact.createdAt.toISOString(),
        analysis: artifact.analysis,
      }));

    const latestVideo = videos[0]?.analysis as { scores?: { overall?: number } } | undefined;

    return addSecurityHeaders(
      NextResponse.json({
        videos,
        latestScore: latestVideo?.scores || null,
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch videos" },
        { status: 500 },
      ),
    );
  }
}
