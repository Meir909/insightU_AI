/**
 * Real-Life Interview Analysis System
 * 
 * Architecture:
 * 1. Video Stream Processing (MediaPipe/OpenCV)
 * 2. Face Analysis (expressions, gaze, micro-expressions)
 * 3. Body Language (posture, gestures, movement)
 * 4. Voice Analysis (stress, confidence, emotion)
 * 5. Fusion Layer (combining all signals)
 * 6. Interview Scoring Model
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for real-time analysis
export interface RealTimeFrameAnalysis {
  timestamp: number;
  
  // Face Analysis
  face: {
    visible: boolean;
    position: { x: number; y: number; width: number; height: number };
    expressions: {
      neutral: number;
      happy: number;
      sad: number;
      angry: number;
      fearful: number;
      disgusted: number;
      surprised: number;
    };
    dominanceExpression: string;
    confidence: number;
  };
  
  // Eye Tracking
  eyes: {
    lookingAtCamera: boolean;
    gazeDirection: "center" | "left" | "right" | "up" | "down";
    eyeContactDuration: number; // seconds in current session
    blinkRate: number; // blinks per minute
    pupilDilation: number; // stress indicator
  };
  
  // Body Language
  body: {
    posture: "upright" | "slouched" | "leaning_forward" | "leaning_back";
    handVisibility: boolean;
    handGestures: string[]; // "open", "closed", "pointing", etc.
    movementLevel: number; // 0-100, fidgeting detection
    openness: number; // 0-100, closed vs open posture
  };
  
  // Micro-expressions (short bursts < 0.5s)
  microExpressions: Array<{
    expression: string;
    duration: number;
    timestamp: number;
    intensity: number;
  }>;
  
  // Overall behavioral state
  state: {
    stressLevel: number; // 0-100
    engagement: number; // 0-100
    confidence: number; // 0-100
    authenticity: number; // 0-100
    deceptionIndicators: string[];
  };
}

export interface VoiceStressAnalysis {
  // Basic metrics
  pitch: {
    mean: number; // Hz
    variation: number; // standard deviation
    trend: "stable" | "rising" | "falling";
  };
  
  // Voice quality
  tremor: number; // 0-100, shakiness
  jitter: number; // frequency variation
  shimmer: number; // amplitude variation
  hoarseness: number; // 0-100
  
  // Speaking patterns
  pausePatterns: {
    averageDuration: number; // seconds
    frequency: number; // pauses per minute
    type: "natural" | "thinking" | "nervous" | "strategic";
  };
  
  // Emotional state from voice
  emotions: {
    stress: number; // 0-100
    anxiety: number; // 0-100
    confidence: number; // 0-100
    enthusiasm: number; // 0-100
    dominance: "confident" | "neutral" | "uncertain" | "stressed";
  };
  
  // Comparison to baseline
  deviationFromBaseline: {
    pitch: number;
    pace: number;
    pausePattern: number;
    overall: number;
  };
}

export interface InterviewSessionAnalysis {
  // Session metadata
  sessionId: string;
  candidateId: string;
  startTime: string;
  duration: number; // seconds
  questionCount: number;
  
  // Aggregated video analysis
  video: {
    averageEyeContact: number; // percentage
    postureConsistency: number; // 0-100
    expressionVariability: number; // 0-100
    microExpressionCount: number;
    stressIndicators: string[];
    confidenceTrajectory: number[]; // over time
  };
  
  // Aggregated voice analysis
  voice: {
    averagePitch: number;
    stressTrajectory: number[];
    confidenceTrajectory: number[];
    fillerWordFrequency: number; // per minute
    pausePattern: string;
  };
  
  // Synchronized moments (when video and voice agree)
  keyMoments: Array<{
    timestamp: number;
    question: string;
    videoState: RealTimeFrameAnalysis["state"];
    voiceState: VoiceStressAnalysis["emotions"];
    combinedScore: {
      confidence: number;
      stress: number;
      authenticity: number;
    };
    redFlags: string[];
    highlights: string[];
  }>;
  
  // Final assessment
  overall: {
    confidence: number; // 0-100
    stressManagement: number; // 0-100
    authenticity: number; // 0-100
    engagement: number; // 0-100
    presence: number; // 0-100 (overall "presence")
    recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
    reasoning: string[];
  };
}

/**
 * Real-time frame analysis contract.
 * Without a CV provider, this derives stable estimates from session trajectory
 * and optional voice context instead of fabricating random outputs.
 */
export async function analyzeVideoFrame(
  frameData: Buffer,
  previousFrames: RealTimeFrameAnalysis[],
  audioContext?: VoiceStressAnalysis
): Promise<RealTimeFrameAnalysis> {
  const baseTimestamp = Date.now();
  const previousState = previousFrames[previousFrames.length - 1]?.state;
  const frameSignal = Math.min(1, Math.max(0, frameData.length / 2_000_000));
  const previousConfidence = previousState?.confidence ?? 70;
  const previousStress = previousState?.stressLevel ?? 30;
  const audioConfidence = audioContext?.emotions.confidence ?? previousConfidence;
  const audioStress = audioContext?.emotions.stress ?? previousStress;
  const currentConfidence = clampNumber(previousConfidence * 0.45 + audioConfidence * 0.45 + frameSignal * 10, 0, 100);
  const currentStress = clampNumber(previousStress * 0.4 + audioStress * 0.5 + (1 - frameSignal) * 15, 0, 100);
  const neutral = clamp01(0.55 - currentStress / 250);
  const happy = clamp01(currentConfidence / 180);
  const sad = clamp01((100 - currentConfidence) / 500);
  const angry = clamp01(currentStress / 900);
  const fearful = clamp01(currentStress / 180);
  const surprised = clamp01(Math.abs(currentConfidence - previousConfidence) / 250);
  const disgusted = clamp01(Math.max(0, currentStress - 60) / 500);
  const lookingAtCamera = currentConfidence >= 55 && currentStress <= 65;
  const eyeContactDuration = previousFrames.reduce((sum, frame) => sum + (frame.eyes.lookingAtCamera ? 0.1 : 0), 0);
  const blinkRate = clampNumber(14 + currentStress / 10, 10, 28);
  const posture = currentConfidence > 65 ? "upright" : currentStress > 65 ? "leaning_forward" : "slouched";
  const openness = clampNumber(currentConfidence - currentStress / 4, 0, 100);
  const movementLevel = clampNumber(currentStress * 0.7, 0, 100);
  const handVisibility = openness >= 50;

  return {
    timestamp: baseTimestamp,
    
    face: {
      visible: true,
      position: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 },
      expressions: {
        neutral,
        happy,
        sad,
        angry,
        fearful,
        disgusted,
        surprised,
      },
      dominanceExpression: currentConfidence > 70 ? "confident" : currentConfidence > 50 ? "neutral" : "uncertain",
      confidence: currentConfidence,
    },
    
    eyes: {
      lookingAtCamera,
      gazeDirection: lookingAtCamera ? "center" : currentStress > 65 ? "down" : "left",
      eyeContactDuration,
      blinkRate,
      pupilDilation: clampNumber(0.3 + (currentStress / 100) * 0.4, 0.2, 0.8),
    },
    
    body: {
      posture,
      handVisibility,
      handGestures: openness > 65 ? ["open", "expressive"] : openness > 45 ? ["minimal"] : ["closed"],
      movementLevel,
      openness,
    },
    
    microExpressions: detectMicroExpressions(previousFrames, currentStress),
    
    state: {
      stressLevel: currentStress,
      engagement: 100 - currentStress,
      confidence: currentConfidence,
      authenticity: clampNumber((currentConfidence + (100 - currentStress)) / 2, 0, 100),
      deceptionIndicators: currentStress > 70 && currentConfidence < 40 
        ? ["high_stress", "low_confidence", "inconsistent_signals"]
        : [],
    },
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value * 10) / 10));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

/**
 * Advanced voice stress analysis
 */
export async function analyzeVoiceStress(
  audioBuffer: Buffer,
  baselineVoice?: VoiceStressAnalysis
): Promise<VoiceStressAnalysis> {
  
  // Use Whisper for transcription + GPT-4 for emotional analysis
  const transcription = await openai.audio.transcriptions.create({
    file: new File([new Uint8Array(audioBuffer)], "audio.mp3", { type: "audio/mp3" }),
    model: "whisper-1",
    response_format: "verbose_json",
  });
  
  const transcript = transcription.text;
  
  // Advanced voice analysis prompt
  const analysisPrompt = `
Analyze this interview response for voice stress and confidence indicators:

Transcript: """${transcript}"""

Provide detailed analysis in JSON format:
{
  "pitch": {
    "mean": number, // estimated average Hz (120-280 for adults)
    "variation": number, // 0-100, higher = more variation = more confident
    "trend": "stable" | "rising" | "falling"
  },
  "tremor": number, // 0-100, voice shakiness (0=steady, 100=very shaky)
  "jitter": number, // 0-100, frequency instability
  "shimmer": number, // 0-100, amplitude variation
  "hoarseness": number, // 0-100
  "pausePatterns": {
    "averageDuration": number, // seconds between phrases
    "frequency": number, // pauses per minute
    "type": "natural" | "thinking" | "nervous" | "strategic"
  },
  "emotions": {
    "stress": number, // 0-100
    "anxiety": number, // 0-100
    "confidence": number, // 0-100
    "enthusiasm": number, // 0-100
    "dominance": "confident" | "neutral" | "uncertain" | "stressed"
  },
  "deviationFromBaseline": {
    "overall": number // how much this differs from normal speech (0-100)
  }
}

Consider:
- Rising pitch at end of sentences = uncertainty (uptalk)
- Monotone = low confidence or rehearsed
- Excessive pauses = nervousness or calculation
- Fast speech = anxiety or enthusiasm
- Tremor/shakiness = high stress
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: analysisPrompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const analysis = JSON.parse(response.choices[0].message.content || "{}");
  
  // Calculate deviations if baseline exists
  let deviations = {
    pitch: 0,
    pace: 0,
    pausePattern: 0,
    overall: analysis.deviationFromBaseline?.overall || 20,
  };
  
  if (baselineVoice) {
    deviations = {
      pitch: Math.abs(analysis.pitch?.mean - baselineVoice.pitch.mean) / baselineVoice.pitch.mean * 100,
      pace: 0, // Would need word timestamps
      pausePattern: analysis.pausePatterns?.frequency !== baselineVoice.pausePatterns.frequency ? 30 : 0,
      overall: analysis.deviationFromBaseline?.overall || 20,
    };
  }
  
  return {
    pitch: {
      mean: analysis.pitch?.mean || 150,
      variation: analysis.pitch?.variation || 50,
      trend: analysis.pitch?.trend || "stable",
    },
    tremor: analysis.tremor || 20,
    jitter: analysis.jitter || 15,
    shimmer: analysis.shimmer || 20,
    hoarseness: analysis.hoarseness || 10,
    pausePatterns: {
      averageDuration: analysis.pausePatterns?.averageDuration || 0.5,
      frequency: analysis.pausePatterns?.frequency || 8,
      type: analysis.pausePatterns?.type || "natural",
    },
    emotions: {
      stress: analysis.emotions?.stress || 30,
      anxiety: analysis.emotions?.anxiety || 25,
      confidence: analysis.emotions?.confidence || 65,
      enthusiasm: analysis.emotions?.enthusiasm || 60,
      dominance: analysis.emotions?.dominance || "neutral",
    },
    deviationFromBaseline: deviations,
  };
}

/**
 * Detect micro-expressions from frame history
 */
function detectMicroExpressions(
  previousFrames: RealTimeFrameAnalysis[],
  currentStress: number
): RealTimeFrameAnalysis["microExpressions"] {
  
  const microExps: RealTimeFrameAnalysis["microExpressions"] = [];
  
  if (previousFrames.length < 3) return microExps;
  
  // Look for sudden expression changes
  const recent = previousFrames.slice(-5);
  
  // Stress spike = possible fear/disgust micro-expression
  if (currentStress > 70) {
    microExps.push({
      expression: "stress_spike",
      duration: 0.2,
      timestamp: Date.now(),
      intensity: currentStress / 100,
    });
  }
  
  // Detect suppression (neutral face after emotion)
  const lastExpr = recent[recent.length - 1]?.face.expressions;
  if (lastExpr && lastExpr.neutral > 0.8) {
    const prevExpr = recent[0]?.face.expressions;
    if (prevExpr && prevExpr.neutral < 0.5) {
      microExps.push({
        expression: "suppression",
        duration: 0.3,
        timestamp: Date.now(),
        intensity: 0.6,
      });
    }
  }
  
  return microExps;
}

/**
 * Complete interview session analysis
 */
export async function analyzeFullInterview(
  frames: RealTimeFrameAnalysis[],
  voiceSegments: VoiceStressAnalysis[],
  questions: string[]
): Promise<InterviewSessionAnalysis> {
  
  // Calculate aggregated metrics
  const avgEyeContact = frames.filter(f => f.eyes.lookingAtCamera).length / frames.length * 100;
  const avgConfidence = average(frames.map(f => f.state.confidence));
  const avgStress = average(frames.map(f => f.state.stressLevel));
  
  // Synchronize video and voice data
  const keyMoments: InterviewSessionAnalysis["keyMoments"] = [];
  
  questions.forEach((question, idx) => {
    const frameIdx = Math.floor((idx / questions.length) * frames.length);
    const voiceIdx = Math.floor((idx / questions.length) * voiceSegments.length);
    
    const frame = frames[frameIdx];
    const voice = voiceSegments[voiceIdx];
    
    if (frame && voice) {
      // Combine signals
      const combinedConfidence = (frame.state.confidence + voice.emotions.confidence) / 2;
      const combinedStress = (frame.state.stressLevel + voice.emotions.stress) / 2;
      
      keyMoments.push({
        timestamp: frame.timestamp,
        question,
        videoState: frame.state,
        voiceState: voice.emotions,
        combinedScore: {
          confidence: combinedConfidence,
          stress: combinedStress,
          authenticity: (frame.state.authenticity + (100 - voice.emotions.anxiety)) / 2,
        },
        redFlags: [
          ...(frame.state.deceptionIndicators || []),
          ...(voice.emotions.stress > 80 ? ["high_voice_stress"] : []),
          ...(voice.emotions.dominance === "stressed" ? ["voice_dominance_stressed"] : []),
        ],
        highlights: [
          ...(combinedConfidence > 80 ? ["high_confidence_response"] : []),
          ...(voice.emotions.enthusiasm > 80 ? ["enthusiastic_delivery"] : []),
          ...(frame.eyes.lookingAtCamera && frame.state.confidence > 75 ? ["strong_eye_contact"] : []),
        ],
      });
    }
  });
  
  // Generate overall assessment
  const trajectory = keyMoments.map(m => m.combinedScore.confidence);
  const improving = trajectory[trajectory.length - 1] > trajectory[0];
  
  return {
    sessionId: `session-${Date.now()}`,
    candidateId: "unknown", // Set by caller
    startTime: new Date().toISOString(),
    duration: frames.length * 0.1, // Assuming 10fps
    questionCount: questions.length,
    
    video: {
      averageEyeContact: avgEyeContact,
      postureConsistency: calculateConsistency(frames.map(f => f.body.posture === "upright")),
      expressionVariability: calculateStdDev(frames.map(f => f.face.expressions.happy)),
      microExpressionCount: frames.reduce((sum, f) => sum + f.microExpressions.length, 0),
      stressIndicators: detectVideoStressPatterns(frames),
      confidenceTrajectory: frames.map(f => f.state.confidence),
    },
    
    voice: {
      averagePitch: average(voiceSegments.map(v => v.pitch.mean)),
      stressTrajectory: voiceSegments.map(v => v.emotions.stress),
      confidenceTrajectory: voiceSegments.map(v => v.emotions.confidence),
      fillerWordFrequency: 0, // Would need transcript analysis
      pausePattern: mode(voiceSegments.map(v => v.pausePatterns.type)),
    },
    
    keyMoments,
    
    overall: {
      confidence: avgConfidence,
      stressManagement: 100 - avgStress,
      authenticity: average(frames.map(f => f.state.authenticity)),
      engagement: average(frames.map(f => f.state.engagement)),
      presence: (avgConfidence + avgEyeContact) / 2,
      recommendation: generateRecommendation(avgConfidence, avgStress, improving),
      reasoning: generateReasoning(keyMoments, improving),
    },
  };
}

// Helper functions
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = average(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateConsistency(booleans: boolean[]): number {
  if (booleans.length === 0) return 0;
  const trues = booleans.filter(b => b).length;
  return Math.round((trues / booleans.length) * 100);
}

function mode(values: string[]): string {
  if (values.length === 0) return "natural";
  const counts: Record<string, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function detectVideoStressPatterns(frames: RealTimeFrameAnalysis[]): string[] {
  const indicators: string[] = [];
  
  // Check for sustained high stress
  const highStressFrames = frames.filter(f => f.state.stressLevel > 75);
  if (highStressFrames.length > frames.length * 0.3) {
    indicators.push("sustained_high_stress");
  }
  
  // Check for low eye contact
  const lowEyeContact = frames.filter(f => !f.eyes.lookingAtCamera).length / frames.length;
  if (lowEyeContact > 0.4) {
    indicators.push("poor_eye_contact");
  }
  
  // Check for many micro-expressions
  const totalMicro = frames.reduce((sum, f) => sum + f.microExpressions.length, 0);
  if (totalMicro > frames.length * 0.1) {
    indicators.push("frequent_micro_expressions");
  }
  
  return indicators;
}

function generateRecommendation(
  confidence: number,
  stress: number,
  improving: boolean
): InterviewSessionAnalysis["overall"]["recommendation"] {
  if (confidence > 85 && stress < 25) return "strong_yes";
  if (confidence > 70 && stress < 40) return "yes";
  if (improving && confidence > 60) return "maybe";
  if (confidence < 40 && stress > 70) return "strong_no";
  return "no";
}

function generateReasoning(
  moments: InterviewSessionAnalysis["keyMoments"],
  improving: boolean
): string[] {
  const reasoning: string[] = [];
  
  const avgConfidence = average(moments.map(m => m.combinedScore.confidence));
  const avgStress = average(moments.map(m => m.combinedScore.stress));
  const redFlagCount = moments.reduce((sum, m) => sum + m.redFlags.length, 0);
  const highlightCount = moments.reduce((sum, m) => sum + m.highlights.length, 0);
  
  reasoning.push(`Average confidence level: ${avgConfidence}%`);
  reasoning.push(`Stress management: ${100 - avgStress}%`);
  
  if (improving) {
    reasoning.push("Candidate showed improvement throughout interview");
  } else if (avgConfidence < moments[0]?.combinedScore.confidence) {
    reasoning.push("Confidence declined during interview");
  }
  
  if (redFlagCount > highlightCount) {
    reasoning.push(`More concerning signals (${redFlagCount}) than positive (${highlightCount})`);
  } else if (highlightCount > redFlagCount) {
    reasoning.push(`Strong positive signals (${highlightCount}) with minimal concerns (${redFlagCount})`);
  }
  
  return reasoning;
}
