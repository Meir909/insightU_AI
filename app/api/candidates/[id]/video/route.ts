import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/serverless-store";
import { analyzeVideo, analyzeAudio, analyzeVoiceMessage } from "@/lib/services/media-analysis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Candidates can only upload their own video
  if (session.role === "candidate" && session.entityId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const video = formData.get("video") as File;
    const question = formData.get("question") as string || "Tell us about yourself";

    if (!video) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];
    
    if (!allowedTypes.includes(video.type)) {
      return NextResponse.json(
        { error: "Invalid video format. Use MP4, WebM, MOV, or AVI" },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for video)
    if (video.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Video too large. Max 100MB" },
        { status: 400 }
      );
    }

    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === id) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Convert file to buffer
    const bytes = await video.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Analyze video
    const analysis = await analyzeVideo(buffer, video.type, question);

    // Save analysis results
    const videoId = `video-${Date.now()}`;
    candidate.videoInterviews = candidate.videoInterviews || [];
    candidate.videoInterviews.push({
      id: videoId,
      question,
      uploadedAt: new Date().toISOString(),
      analysis,
    });

    // Update candidate scores with video metrics
    candidate.videoScores = {
      communication: analysis.scores.communication,
      presentation: analysis.scores.presentation,
      content: analysis.scores.content,
      overall: analysis.scores.overall,
    };

    candidate.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      videoId,
      analysis: {
        scores: analysis.scores,
        transcript: analysis.transcript,
        behavioralAnalysis: analysis.behavioralAnalysis,
        redFlags: analysis.redFlags,
        summary: analysis.summary,
        highlights: analysis.highlights,
      },
      nextStep: "review_pending",
    });

  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze video" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Candidates can only view their own
  if (session.role === "candidate" && session.entityId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === id) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({
      videos: candidate.videoInterviews || [],
      latestScore: candidate.videoScores || null,
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
