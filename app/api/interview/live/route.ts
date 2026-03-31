import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/server/auth";
import { addSecurityHeaders } from "@/lib/server/security";
import {
  createAuditLog,
  createEvaluation,
  createLiveInterviewRecord,
  getAuthenticatedAccountByToken,
  getCandidateById,
  getLiveInterviewBySessionId,
} from "@/lib/server/prisma";
import {
  analyzeFullInterview,
  analyzeVideoFrame,
  analyzeVoiceStress,
  RealTimeFrameAnalysis,
  VoiceStressAnalysis,
} from "@/lib/services/realtime-interview";

const startSessionSchema = z.object({
  candidateId: z.string(),
  interviewType: z.enum(["structured", "behavioral", "technical", "mixed"]).default("mixed"),
  duration: z.number().min(5).max(60).default(30),
  questions: z.array(z.string()).optional(),
});

type ActiveLiveSession = {
  candidateId: string;
  startTime: string;
  frames: RealTimeFrameAnalysis[];
  voiceSegments: VoiceStressAnalysis[];
  questions: string[];
  currentQuestionIndex: number;
  interviewType: "structured" | "behavioral" | "technical" | "mixed";
};

const activeSessions = new Map<string, ActiveLiveSession>();

export async function POST(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    const params = startSessionSchema.parse(await request.json());
    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    const candidate = await getCandidateById(params.candidateId);

    if (!candidate) {
      return addSecurityHeaders(NextResponse.json({ error: "Candidate not found" }, { status: 404 }));
    }

    if (session.role === "candidate" && persistedSession?.account.candidate?.id !== params.candidateId) {
      return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const questions = params.questions || getDefaultQuestions(params.interviewType);
    const sessionId = `live-${randomUUID()}`;

    activeSessions.set(sessionId, {
      candidateId: params.candidateId,
      startTime: new Date().toISOString(),
      frames: [],
      voiceSegments: [],
      questions,
      currentQuestionIndex: 0,
      interviewType: params.interviewType,
    });

    await createLiveInterviewRecord({
      candidateId: params.candidateId,
      sessionId,
      type: params.interviewType,
      status: "active",
      keyMoments: {
        questions,
        durationMinutes: params.duration,
      },
    });

    await createAuditLog({
      action: "LIVE_INTERVIEW_STARTED",
      entityType: "live_interview",
      entityId: sessionId,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: params.candidateId,
        interviewType: params.interviewType,
        questions,
      },
    });

    return addSecurityHeaders(
      NextResponse.json({
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
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 }),
      );
    }

    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to start interview" },
        { status: 500 },
      ),
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId") as string;
    const frame = formData.get("frame") as File;
    const audioChunk = formData.get("audio") as File | null;

    if (!sessionId || !frame) {
      return addSecurityHeaders(
        NextResponse.json({ error: "sessionId and frame required" }, { status: 400 }),
      );
    }

    const activeSession = activeSessions.get(sessionId);
    if (!activeSession) {
      return addSecurityHeaders(NextResponse.json({ error: "Session not found" }, { status: 404 }));
    }

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    if (session.role === "candidate" && persistedSession?.account.candidate?.id !== activeSession.candidateId) {
      return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const frameBuffer = Buffer.from(await frame.arrayBuffer());
    const frameAnalysis = await analyzeVideoFrame(
      frameBuffer,
      activeSession.frames,
      activeSession.voiceSegments[activeSession.voiceSegments.length - 1],
    );
    activeSession.frames.push(frameAnalysis);

    let voiceAnalysis: VoiceStressAnalysis | null = null;
    if (audioChunk) {
      const audioBuffer = Buffer.from(await audioChunk.arrayBuffer());
      voiceAnalysis = await analyzeVoiceStress(
        audioBuffer,
        activeSession.voiceSegments[activeSession.voiceSegments.length - 1],
      );
      activeSession.voiceSegments.push(voiceAnalysis);
    }

    const currentQuestion = activeSession.questions[activeSession.currentQuestionIndex];
    const shouldAdvance = detectQuestionCompletion(frameAnalysis, voiceAnalysis);
    if (shouldAdvance && activeSession.currentQuestionIndex < activeSession.questions.length - 1) {
      activeSession.currentQuestionIndex += 1;
    }

    await createLiveInterviewRecord({
      candidateId: activeSession.candidateId,
      sessionId,
      type: activeSession.interviewType,
      status: "active",
      videoAnalysis: {
        latestFrame: frameAnalysis,
        frameCount: activeSession.frames.length,
      },
      voiceAnalysis: voiceAnalysis
        ? {
            latestVoice: voiceAnalysis,
            segmentCount: activeSession.voiceSegments.length,
          }
        : undefined,
      combinedScore: Math.round((frameAnalysis.state.confidence + frameAnalysis.state.authenticity) / 2),
      confidence: frameAnalysis.state.confidence,
      stressLevel: frameAnalysis.state.stressLevel,
      authenticity: frameAnalysis.state.authenticity,
      keyMoments: {
        currentQuestionIndex: activeSession.currentQuestionIndex,
        questions: activeSession.questions,
      },
    });

    return addSecurityHeaders(
      NextResponse.json({
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
          voice: voiceAnalysis
            ? {
                stress: voiceAnalysis.emotions.stress,
                confidence: voiceAnalysis.emotions.confidence,
                dominance: voiceAnalysis.emotions.dominance,
              }
            : null,
        },
        progress: {
          currentQuestion: activeSession.currentQuestionIndex + 1,
          totalQuestions: activeSession.questions.length,
          percentage: Math.round((activeSession.currentQuestionIndex / activeSession.questions.length) * 100),
        },
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Analysis failed" },
        { status: 500 },
      ),
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    const body = await request.json();
    const { sessionId, action } = body as { sessionId?: string; action?: string };

    if (!sessionId || action !== "complete") {
      return addSecurityHeaders(
        NextResponse.json({ error: "sessionId and action='complete' required" }, { status: 400 }),
      );
    }

    const activeSession = activeSessions.get(sessionId);
    if (!activeSession) {
      return addSecurityHeaders(NextResponse.json({ error: "Session not found" }, { status: 404 }));
    }

    const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
    if (session.role === "candidate" && persistedSession?.account.candidate?.id !== activeSession.candidateId) {
      return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    const fullAnalysis = await analyzeFullInterview(
      activeSession.frames,
      activeSession.voiceSegments,
      activeSession.questions,
    );
    fullAnalysis.candidateId = activeSession.candidateId;

    const combinedOverall = Math.round(
      (fullAnalysis.overall.confidence +
        fullAnalysis.overall.stressManagement +
        fullAnalysis.overall.authenticity +
        fullAnalysis.overall.engagement +
        fullAnalysis.overall.presence) /
        5,
    );

    const liveRecord = await createLiveInterviewRecord({
      candidateId: activeSession.candidateId,
      sessionId,
      type: activeSession.interviewType,
      status: "completed",
      videoAnalysis: fullAnalysis.video,
      voiceAnalysis: fullAnalysis.voice,
      combinedScore: combinedOverall,
      keyMoments: fullAnalysis.keyMoments,
      confidence: fullAnalysis.overall.confidence,
      stressLevel: fullAnalysis.overall.stressManagement,
      authenticity: fullAnalysis.overall.authenticity,
      recommendation: fullAnalysis.overall.recommendation,
    });

    const evaluation = await createEvaluation({
      candidateId: activeSession.candidateId,
      hardSkills: combinedOverall,
      softSkills: fullAnalysis.overall.engagement,
      problemSolving: fullAnalysis.overall.presence,
      communication: fullAnalysis.overall.confidence,
      adaptability: fullAnalysis.overall.stressManagement,
      leadershipPotential: fullAnalysis.overall.presence,
      changeAgentMindset: fullAnalysis.overall.engagement,
      authenticity: fullAnalysis.overall.authenticity,
      overallScore: combinedOverall,
      confidence: fullAnalysis.overall.confidence,
      strengths: fullAnalysis.keyMoments.flatMap((moment) => moment.highlights).slice(0, 8),
      weaknesses: fullAnalysis.keyMoments.flatMap((moment) => moment.redFlags).slice(0, 8),
      redFlags: fullAnalysis.keyMoments.filter((moment) => moment.redFlags.length > 0).slice(0, 5),
      recommendation: fullAnalysis.overall.recommendation,
      reasoning: fullAnalysis.overall.reasoning.join(" "),
      evaluatorType: "live_interview_ai",
    });

    await createAuditLog({
      action: "LIVE_INTERVIEW_COMPLETED",
      entityType: "live_interview",
      entityId: liveRecord.id,
      actorId: persistedSession?.account.id,
      actorType: session.role,
      actorName: session.name,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        candidateId: activeSession.candidateId,
        sessionId,
        evaluationId: evaluation.id,
        combinedOverall,
      },
    });

    activeSessions.delete(sessionId);

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        sessionId,
        analysis: {
          session: {
            duration: fullAnalysis.duration,
            questionCount: fullAnalysis.questionCount,
          },
          scores: fullAnalysis.overall,
          keyMoments: fullAnalysis.keyMoments.slice(0, 5),
          videoMetrics: fullAnalysis.video,
          voiceMetrics: fullAnalysis.voice,
        },
        recommendation: fullAnalysis.overall.recommendation,
        reasoning: fullAnalysis.overall.reasoning,
      }),
    );
  } catch (error) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to complete interview" },
        { status: 500 },
      ),
    );
  }
}

export async function GET(request: NextRequest) {
  const session = getAuthSession(request);
  if (!session) {
    return addSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return addSecurityHeaders(NextResponse.json({ error: "sessionId required" }, { status: 400 }));
  }

  const activeSession = activeSessions.get(sessionId);
  const persistedSession = await getAuthenticatedAccountByToken(session.sessionId);
  const persistedRecord = await getLiveInterviewBySessionId(sessionId);
  const candidateId = activeSession?.candidateId ?? persistedRecord?.candidateId;

  if (!candidateId) {
    return addSecurityHeaders(NextResponse.json({ error: "Session not found" }, { status: 404 }));
  }

  if (session.role === "candidate" && persistedSession?.account.candidate?.id !== candidateId) {
    return addSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  }

  if (!activeSession) {
    return addSecurityHeaders(
      NextResponse.json({
        sessionId,
        status: persistedRecord?.status || "completed",
        candidateId,
        persisted: true,
      }),
    );
  }

  const recentFrames = activeSession.frames.slice(-30);
  const avgConfidence =
    recentFrames.length > 0
      ? recentFrames.reduce((sum, frame) => sum + frame.state.confidence, 0) / recentFrames.length
      : 0;
  const avgStress =
    recentFrames.length > 0
      ? recentFrames.reduce((sum, frame) => sum + frame.state.stressLevel, 0) / recentFrames.length
      : 0;

  return addSecurityHeaders(
    NextResponse.json({
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
        eyeContact:
          recentFrames.length > 0
            ? (recentFrames.filter((frame) => frame.eyes.lookingAtCamera).length / recentFrames.length) * 100
            : 0,
      },
      currentQuestion: activeSession.questions[activeSession.currentQuestionIndex],
      timeElapsed: Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000),
    }),
  );
}

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
      "What drives your passion for technology or innovation?",
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
  voiceAnalysis: VoiceStressAnalysis | null,
) {
  if (voiceAnalysis?.pausePatterns.averageDuration && voiceAnalysis.pausePatterns.averageDuration > 3 && frameAnalysis.face.expressions.neutral > 0.6) {
    return true;
  }

  if (!frameAnalysis.eyes.lookingAtCamera && frameAnalysis.body.movementLevel < 20 && (voiceAnalysis?.pausePatterns.frequency ?? 0) > 5) {
    return true;
  }

  return false;
}
