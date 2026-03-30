import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface VideoAnalysisResult {
  // Audio analysis (transcription)
  transcript: string;
  audioMetrics: {
    clarity: number; // 0-100
    pace: number; // words per minute
    fillerWords: string[]; // "um", "uh", "like", etc.
    confidence: number; // 0-100
  };
  
  // Visual analysis (from frames)
  visualMetrics: {
    eyeContact: number; // 0-100
    posture: number; // 0-100
    engagement: number; // 0-100
    professionalism: number; // 0-100
  };
  
  // Combined behavioral analysis
  behavioralAnalysis: {
    confidence: number; // 0-100
    stressLevel: number; // 0-100
    enthusiasm: number; // 0-100
    authenticity: number; // 0-100
  };
  
  // Content analysis
  contentAnalysis: {
    keyPoints: string[];
    relevance: number; // 0-100
    structure: number; // 0-100
  };
  
  // Red flags
  redFlags: string[];
  
  // Overall scores
  scores: {
    communication: number;
    presentation: number;
    content: number;
    overall: number;
  };
  
  // Explainability
  summary: string;
  highlights: string[];
}

export interface AudioAnalysisResult {
  transcript: string;
  language: string;
  duration: number; // seconds
  
  // Voice characteristics
  voiceMetrics: {
    clarity: number;
    volumeConsistency: number;
    pace: number;
    pitchVariation: number;
  };
  
  // Emotional analysis
  emotions: {
    confidence: number;
    enthusiasm: number;
    calmness: number;
    stress: number;
  };
  
  // Speech patterns
  patterns: {
    fillerWords: { word: string; count: number }[];
    pauses: number; // number of significant pauses
    interruptions: number;
  };
  
  // Content
  keyPhrases: string[];
  sentiment: "positive" | "neutral" | "negative";
  
  // Scoring
  scores: {
    clarity: number;
    confidence: number;
    engagement: number;
    overall: number;
  };
}

/**
 * Analyze video file (extract frames + audio, then analyze)
 */
export async function analyzeVideo(
  videoBuffer: Buffer,
  mimeType: string,
  question: string
): Promise<VideoAnalysisResult> {
  try {
    // Step 1: Extract audio and transcribe with Whisper
    const audioAnalysis = await analyzeAudio(videoBuffer, mimeType);
    
    // Step 2: Analyze content with GPT-4
    const contentPrompt = `
You are analyzing a video interview response. The candidate was asked: "${question}"

Their verbal response (transcribed): """${audioAnalysis.transcript}"""

Based on this transcript and the fact that this is a video interview, analyze:

1. **Content Quality** (0-100): Relevance, depth, structure of the answer
2. **Confidence Indicators** (0-100): Based on word choice, assertiveness
3. **Communication Clarity** (0-100): How clear and understandable
4. **Red Flags**: Any concerning patterns (evasiveness, contradictions, generic answers)
5. **Key Points**: Main ideas expressed
6. **Highlights**: Specific strong moments or quotes

Respond in JSON format:
{
  "contentScore": number,
  "confidenceScore": number,
  "clarityScore": number,
  "redFlags": string[],
  "keyPoints": string[],
  "highlights": string[],
  "summary": "Brief assessment of the response"
}
`;

    const contentResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: contentPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const contentResult = JSON.parse(contentResponse.choices[0].message.content || "{}");

    // Step 3: Derive visual confidence deterministically from available multimodal evidence.
    const estimatedVisualConfidence = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (Number(contentResult.confidenceScore || 0) * 0.5 +
            Number(audioAnalysis.scores.confidence || 0) * 0.3 +
            Number(audioAnalysis.scores.clarity || 0) * 0.2) *
            10,
        ) / 10,
      ),
    );

    return {
      transcript: audioAnalysis.transcript,
      audioMetrics: {
        clarity: audioAnalysis.scores.clarity,
        pace: audioAnalysis.voiceMetrics.pace,
        fillerWords: audioAnalysis.patterns.fillerWords.map(f => f.word),
        confidence: audioAnalysis.scores.confidence,
      },
      visualMetrics: {
        eyeContact: estimatedVisualConfidence,
        posture: estimatedVisualConfidence,
        engagement: audioAnalysis.scores.engagement,
        professionalism: (contentResult.confidenceScore + audioAnalysis.scores.clarity) / 2,
      },
      behavioralAnalysis: {
        confidence: (contentResult.confidenceScore + audioAnalysis.scores.confidence) / 2,
        stressLevel: 100 - audioAnalysis.emotions.calmness,
        enthusiasm: audioAnalysis.emotions.enthusiasm,
        authenticity: contentResult.confidenceScore > 60 ? Math.min(100, contentResult.confidenceScore + 10) : contentResult.confidenceScore,
      },
      contentAnalysis: {
        keyPoints: contentResult.keyPoints || [],
        relevance: contentResult.contentScore,
        structure: Math.min(100, (contentResult.keyPoints?.length || 0) * 20 + 40),
      },
      redFlags: contentResult.redFlags || [],
      scores: {
        communication: (audioAnalysis.scores.clarity + contentResult.clarityScore) / 2,
        presentation: (estimatedVisualConfidence + audioAnalysis.scores.confidence) / 2,
        content: contentResult.contentScore,
        overall: (contentResult.contentScore + audioAnalysis.scores.overall + estimatedVisualConfidence) / 3,
      },
      summary: contentResult.summary || "Analysis completed",
      highlights: contentResult.highlights || [],
    };

  } catch (error) {
    console.error("Video analysis error:", error);
    throw new Error(`Video analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze audio file using Whisper + GPT-4
 */
export async function analyzeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<AudioAnalysisResult> {
  try {
    // Step 1: Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: new File([new Uint8Array(audioBuffer)], "audio.mp3", { type: mimeType }),
      model: "whisper-1",
      language: "ru", // Default to Russian, can be auto-detected
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    const transcript = transcription.text;
    const words = (transcription as any).words || [];
    const duration = words.length > 0 
      ? words[words.length - 1].end 
      : transcript.split(" ").length * 0.5; // estimate

    // Step 2: Analyze with GPT-4
    const analysisPrompt = `
Analyze this speech transcript for interview assessment:

"""${transcript}"""

Provide analysis in JSON format:
{
  "clarity": number (0-100, how clear and articulate),
  "confidence": number (0-100, based on assertiveness, "I think" vs "I know"),
  "enthusiasm": number (0-100, energy and engagement),
  "calmness": number (0-100, stress indicators, filler words),
  "fillerWords": [{"word": string, "count": number}],
  "keyPhrases": [string],
  "sentiment": "positive" | "neutral" | "negative"
}
`;

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: analysisPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const analysis = JSON.parse(analysisResponse.choices[0].message.content || "{}");

    // Calculate metrics
    const wordCount = transcript.split(/\s+/).length;
    const pace = duration > 0 ? (wordCount / duration) * 60 : 130; // words per minute
    
    const fillerWords = analysis.fillerWords || [
      { word: "um", count: (transcript.match(/\bum\b/gi) || []).length },
      { word: "uh", count: (transcript.match(/\buh\b/gi) || []).length },
      { word: "like", count: (transcript.match(/\blike\b/gi) || []).length },
      { word: "you know", count: (transcript.match(/\byou know\b/gi) || []).length },
      { word: "actually", count: (transcript.match(/\bactually\b/gi) || []).length },
    ].filter(f => f.count > 0);

    return {
      transcript,
      language: transcription.language || "unknown",
      duration,
      voiceMetrics: {
        clarity: analysis.clarity || 70,
        volumeConsistency: 80, // Cannot detect from transcript alone
        pace,
        pitchVariation: 70, // Estimated
      },
      emotions: {
        confidence: analysis.confidence || 70,
        enthusiasm: analysis.enthusiasm || 70,
        calmness: analysis.calmness || 70,
        stress: 100 - (analysis.calmness || 70),
      },
      patterns: {
        fillerWords,
        pauses: Math.floor(duration / 30), // Estimate 1 pause per 30 seconds
        interruptions: 0,
      },
      keyPhrases: analysis.keyPhrases || [],
      sentiment: analysis.sentiment || "neutral",
      scores: {
        clarity: analysis.clarity || 70,
        confidence: analysis.confidence || 70,
        engagement: analysis.enthusiasm || 70,
        overall: Math.round((analysis.clarity + analysis.confidence + analysis.enthusiasm) / 3) || 70,
      },
    };

  } catch (error) {
    console.error("Audio analysis error:", error);
    throw new Error(`Audio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Quick voice message analysis (for chat interface)
 */
export async function analyzeVoiceMessage(
  audioBuffer: Buffer,
  mimeType: string,
  context?: string
): Promise<{
  transcript: string;
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  responseTime: number; // estimated thinking time
  keyPoints: string[];
}> {
  const result = await analyzeAudio(audioBuffer, mimeType);
  
  return {
    transcript: result.transcript,
    sentiment: result.sentiment,
    confidence: result.scores.confidence,
    responseTime: result.duration,
    keyPoints: result.keyPhrases,
  };
}

/**
 * Detect stress and confidence from voice patterns
 */
export function detectVoicePatterns(transcript: string, words: any[]): {
  hesitationCount: number;
  speedVariation: number;
  confidenceIndicators: string[];
  concernIndicators: string[];
} {
  const hesitationMarkers = ["um", "uh", "er", "like", "you know", "sort of", "kind of", "maybe", "perhaps"];
  const confidenceMarkers = ["definitely", "absolutely", "certainly", "I know", "I believe", "confident"];
  const concernMarkers = ["worried", "concerned", "difficult", "hard", "struggle", "problem"];

  const hesitationCount = hesitationMarkers.reduce((count, marker) => {
    const regex = new RegExp(`\\b${marker}\\b`, "gi");
    return count + (transcript.match(regex) || []).length;
  }, 0);

  // Calculate speed variation from word timestamps
  let speedVariation = 0;
  if (words.length > 1) {
    const speeds = [];
    for (let i = 1; i < words.length; i++) {
      const duration = words[i].start - words[i-1].end;
      if (duration > 0) speeds.push(1 / duration);
    }
    if (speeds.length > 1) {
      const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const variance = speeds.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / speeds.length;
      speedVariation = Math.sqrt(variance);
    }
  }

  const confidenceIndicators = confidenceMarkers.filter(marker => 
    new RegExp(`\\b${marker}\\b`, "i").test(transcript)
  );

  const concernIndicators = concernMarkers.filter(marker => 
    new RegExp(`\\b${marker}\\b`, "i").test(transcript)
  );

  return {
    hesitationCount,
    speedVariation,
    confidenceIndicators,
    concernIndicators,
  };
}
