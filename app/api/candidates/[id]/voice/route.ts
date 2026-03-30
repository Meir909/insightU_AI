import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/serverless-store";
import { analyzeAudio, analyzeVoiceMessage } from "@/lib/services/media-analysis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Candidates can only upload their own voice
  if (session.role === "candidate" && session.entityId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;
    const question = formData.get("question") as string;
    const context = formData.get("context") as string;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/aac",
    ];
    
    if (!allowedTypes.includes(audio.type)) {
      return NextResponse.json(
        { error: "Invalid audio format. Use MP3, WAV, WebM, OGG, or AAC" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for audio)
    if (audio.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio too large. Max 10MB" },
        { status: 400 }
      );
    }

    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === id) as any;

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Convert file to buffer
    const bytes = await audio.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Analyze based on use case
    let analysis;
    if (question) {
      // Full analysis for interview responses
      analysis = await analyzeAudio(buffer, audio.type);
    } else {
      // Quick analysis for chat voice messages
      analysis = await analyzeVoiceMessage(buffer, audio.type, context);
    }

    // Save voice analysis
    const voiceId = `voice-${Date.now()}`;
    candidate.voiceMessages = candidate.voiceMessages || [];
    const voiceAnalysis = analysis as any;
    candidate.voiceMessages.push({
      id: voiceId,
      question: question || null,
      context: context || null,
      uploadedAt: new Date().toISOString(),
      analysis: {
        transcript: voiceAnalysis.transcript,
        sentiment: voiceAnalysis.sentiment || "neutral",
        confidence: voiceAnalysis.confidence,
        responseTime: voiceAnalysis.responseTime || 0,
        keyPoints: voiceAnalysis.keyPoints || [],
      },
    });

    candidate.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      voiceId,
      analysis: {
        transcript: voiceAnalysis.transcript,
        confidence: voiceAnalysis.confidence,
        sentiment: voiceAnalysis.sentiment,
        keyPoints: voiceAnalysis.keyPoints,
      },
    });

  } catch (error) {
    console.error("Voice upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze voice" },
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
      voiceMessages: candidate.voiceMessages || [],
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch voice messages" },
      { status: 500 }
    );
  }
}
