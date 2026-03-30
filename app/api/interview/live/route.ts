import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { getStore } from "@/lib/server/serverless-store";
import { 
  analyzeVideoFrame, 
  analyzeVoiceStress, 
  analyzeFullInterview,
  RealTimeFrameAnalysis 
} from "@/lib/services/realtime-interview";

// Schema for starting a session
const startSessionSchema = z.object({
  candidateId: z.string(),
  interviewType: z.enum(["structured", "behavioral", "technical", "mixed"]).default("mixed"),
  duration: z.number().min(5).max(60).default(30), // minutes
  questions: z.array(z.string()).optional(),
});

// Active sessions storage (in production, use Redis)
const activeSessions = new Map<string, {
  candidateId: string;
  startTime: string;
  frames: RealTimeFrameAnalysis[];
  voiceSegments: any[];
  questions: string[];
  currentQuestionIndex: number;
}>();

/**
 * Start a new real-life interview session
 */
export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const params = startSessionSchema.parse(body);

    // Verify candidate exists
    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === params.candidateId) as any;
    
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Check permissions
    if (session.role === "candidate" && session.entityId !== params.candidateId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate default questions if not provided
    const defaultQuestions = getDefaultQuestions(params.interviewType);
    const questions = params.questions || defaultQuestions;

    // Create session
    const sessionId = `live-${Date.now()}`;
    activeSessions.set(sessionId, {
      candidateId: params.candidateId,
      startTime: new Date().toISOString(),
      frames: [],
      voiceSegments: [],
      questions,
      currentQuestionIndex: 0,
    });

    // Save to candidate record
    candidate.liveInterviews = candidate.liveInterviews || [];
    candidate.liveInterviews.push({
      sessionId,
      type: params.interviewType,
      status: "active",
      startedAt: new Date().toISOString(),
      questions,
    });
    candidate.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      sessionId,
      candidateId: params.candidateId,
      interviewType: params.interviewType,
      questions,
      duration: params.duration,
      message: "Real-life interview session started",
      instructions: [
        "Ensure good lighting and quiet environment",
        "Position camera at eye level",
        "Speak clearly and maintain eye contact",
        "Answer naturally - this is AI-analyzed but human-reviewed",
      ],
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start interview" },
      { status: 500 }
    );
  }
}

/**
 * Submit video frame for real-time analysis
 */
export async function PUT(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    const frame = formData.get("frame") as File;
    const audioChunk = formData.get("audio") as File | null;

    if (!sessionId || !frame) {
      return NextResponse.json(
        { error: "sessionId and frame required" },
        { status: 400 }
      );
    }

    const activeSession = activeSessions.get(sessionId);
    if (!activeSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify permission
    if (session.role === "candidate" && session.entityId !== activeSession.candidateId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convert frame to buffer
    const frameBytes = await frame.arrayBuffer();
    const frameBuffer = Buffer.from(frameBytes);

    // Analyze frame
    const frameAnalysis = await analyzeVideoFrame(
      frameBuffer,
      activeSession.frames,
      activeSession.voiceSegments[activeSession.voiceSegments.length - 1]
    );

    activeSession.frames.push(frameAnalysis);

    // Analyze audio if provided
    let voiceAnalysis = null;
    if (audioChunk) {
      const audioBytes = await audioChunk.arrayBuffer();
      const audioBuffer = Buffer.from(audioBytes);
      
      voiceAnalysis = await analyzeVoiceStress(
        audioBuffer,
        activeSession.voiceSegments[activeSession.voiceSegments.length - 1]
      );
      
      activeSession.voiceSegments.push(voiceAnalysis);
    }

    // Get current question
    const currentQuestion = activeSession.questions[activeSession.currentQuestionIndex];

    // Determine if we should move to next question
    const shouldAdvance = detectQuestionCompletion(frameAnalysis, voiceAnalysis);
    if (shouldAdvance && activeSession.currentQuestionIndex < activeSession.questions.length - 1) {
      activeSession.currentQuestionIndex++;
    }

    return NextResponse.json({
      success: true,
      sessionId,
      timestamp: frameAnalysis.timestamp,
      currentQuestion,
      nextQuestionIndex: activeSession.currentQuestionIndex,
      analysis: {
        face: {
          visible: frameAnalysis.face.visible,
          dominantExpression: frameAnalysis.face.dominanceExpression,
          confidence: frameAnalysis.face.confidence,
        },
        eyes: {
          lookingAtCamera: frameAnalysis.eyes.lookingAtCamera,
          eyeContactDuration: frameAnalysis.eyes.eyeContactDuration,
        },
        state: frameAnalysis.state,
        voice: voiceAnalysis ? {
          stress: voiceAnalysis.emotions.stress,
          confidence: voiceAnalysis.emotions.confidence,
          dominance: voiceAnalysis.emotions.dominance,
        } : null,
      },
      progress: {
        currentQuestion: activeSession.currentQuestionIndex + 1,
        totalQuestions: activeSession.questions.length,
        percentage: Math.round((activeSession.currentQuestionIndex / activeSession.questions.length) * 100),
      },
    });

  } catch (error) {
    console.error("Frame analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

/**
 * Complete interview and get final analysis
 */
export async function PATCH(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sessionId, action } = body;

    if (!sessionId || action !== "complete") {
      return NextResponse.json(
        { error: "sessionId and action='complete' required" },
        { status: 400 }
      );
    }

    const activeSession = activeSessions.get(sessionId);
    if (!activeSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify permission
    if (session.role === "candidate" && session.entityId !== activeSession.candidateId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Run full interview analysis
    const fullAnalysis = await analyzeFullInterview(
      activeSession.frames,
      activeSession.voiceSegments,
      activeSession.questions
    );

    fullAnalysis.candidateId = activeSession.candidateId;

    // Save results
    const store = getStore();
    const candidate = store.candidates.find((c: any) => c.id === activeSession.candidateId) as any;
    
    if (candidate) {
      const liveInterview = candidate.liveInterviews?.find((li: any) => li.sessionId === sessionId);
      if (liveInterview) {
        liveInterview.status = "completed";
        liveInterview.completedAt = new Date().toISOString();
        liveInterview.analysis = fullAnalysis;
      }
      
      // Update candidate scores with live interview data
      candidate.liveInterviewScores = {
        confidence: fullAnalysis.overall.confidence,
        stressManagement: fullAnalysis.overall.stressManagement,
        authenticity: fullAnalysis.overall.authenticity,
        engagement: fullAnalysis.overall.engagement,
        presence: fullAnalysis.overall.presence,
        recommendation: fullAnalysis.overall.recommendation,
      };
      
      candidate.updatedAt = new Date().toISOString();
    }

    // Clean up session
    activeSessions.delete(sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      analysis: {
        session: {
          duration: fullAnalysis.duration,
          questionCount: fullAnalysis.questionCount,
        },
        scores: fullAnalysis.overall,
        keyMoments: fullAnalysis.keyMoments.slice(0, 5), // Top 5 moments
        videoMetrics: fullAnalysis.video,
        voiceMetrics: fullAnalysis.voice,
      },
      recommendation: fullAnalysis.overall.recommendation,
      reasoning: fullAnalysis.overall.reasoning,
    });

  } catch (error) {
    console.error("Completion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete interview" },
      { status: 500 }
    );
  }
}

/**
 * Get session status (for real-time updates)
 */
export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const activeSession = activeSessions.get(sessionId);
  if (!activeSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Verify permission
  if (session.role === "candidate" && session.entityId !== activeSession.candidateId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Calculate current stats
  const recentFrames = activeSession.frames.slice(-30); // Last 3 seconds at 10fps
  const avgConfidence = recentFrames.length > 0
    ? recentFrames.reduce((sum, f) => sum + f.state.confidence, 0) / recentFrames.length
    : 0;
  const avgStress = recentFrames.length > 0
    ? recentFrames.reduce((sum, f) => sum + f.state.stressLevel, 0) / recentFrames.length
    : 0;

  return NextResponse.json({
    sessionId,
    status: "active",
    candidateId: activeSession.candidateId,
    progress: {
      currentQuestion: activeSession.currentQuestionIndex + 1,
      totalQuestions: activeSession.questions.length,
      percentage: Math.round((activeSession.currentQuestionIndex / activeSession.questions.length) * 100),
    },
    currentMetrics: {
      confidence: Math.round(avgConfidence),
      stress: Math.round(avgStress),
      eyeContact: recentFrames.filter(f => f.eyes.lookingAtCamera).length / recentFrames.length * 100,
    },
    currentQuestion: activeSession.questions[activeSession.currentQuestionIndex],
    timeElapsed: Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000),
  });
}

// Helper functions
function getDefaultQuestions(type: string): string[] {
  const questionSets: Record<string, string[]> = {
    structured: [
      "Tell me about yourself and your background.",
      "Why are you interested in joining inVision U?",
      "Describe a time when you demonstrated leadership.",
      "What is your greatest strength and weakness?",
      "Where do you see yourself in 5 years?",
      "How do you handle stress and pressure?",
      "Tell me about a challenge you overcame.",
      "Why should we select you?",
    ],
    behavioral: [
      "Tell me about a time you led a team through a difficult situation.",
      "Describe a situation where you had to persuade others to accept your viewpoint.",
      "Give an example of a goal you set and how you achieved it.",
      "Tell me about a time you failed and what you learned.",
      "Describe a situation where you had to work with a difficult person.",
      "Give an example of when you took initiative.",
      "Tell me about a time you had to make a quick decision.",
      "Describe a situation where you had to adapt to change quickly.",
    ],
    technical: [
      "Explain a complex concept you know well to a beginner.",
      "How do you approach learning new technologies?",
      "Describe a technical project you're proud of.",
      "How do you stay updated with industry trends?",
      "Tell me about a time you solved a difficult problem.",
      "How do you prioritize tasks when everything is urgent?",
      "Describe your approach to teamwork in technical projects.",
      "What drives your passion for technology/innovation?",
    ],
    mixed: [
      "Tell me about yourself.",
      "Why inVision U? What makes you a change agent?",
      "Describe a time you demonstrated leadership or initiative.",
      "How do you approach complex problems?",
      "Tell me about a failure and what you learned.",
      "How do you handle disagreement in a team?",
      "What are your goals for the next 3-5 years?",
      "What questions do you have for us?",
    ],
  };
  
  return questionSets[type] || questionSets.mixed;
}

function detectQuestionCompletion(
  frameAnalysis: RealTimeFrameAnalysis,
  voiceAnalysis: any
): boolean {
  // Detect if candidate has finished answering
  
  // Long pause + neutral expression = likely done
  if (voiceAnalysis?.pausePatterns?.averageDuration > 3 && 
      frameAnalysis.face.expressions.neutral > 0.6) {
    return true;
  }
  
  // Looking away + low movement = thinking about next question
  if (!frameAnalysis.eyes.lookingAtCamera && 
      frameAnalysis.body.movementLevel < 20 &&
      voiceAnalysis?.pausePatterns?.frequency > 5) {
    return true;
  }
  
  return false;
}
