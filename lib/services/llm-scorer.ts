/**
 * LLM Scorer — GPT-4o based candidate evaluation
 *
 * Analyzes full interview transcript and scores candidate across
 * 6 dimensions using GPT-4o. Runs async after interview completion.
 * Falls back gracefully if OpenAI is unavailable.
 */

export interface LLMScoreResult {
  cognitive: number;        // 0–100: analytical thinking, problem solving
  leadership: number;       // 0–100: initiative, influence, responsibility
  growth: number;           // 0–100: learning mindset, trajectory, adaptability
  decision: number;         // 0–100: structured thinking, case reasoning
  motivation: number;       // 0–100: genuine drive, vision, alignment with program
  authenticity: number;     // 0–100: personal story, specificity, consistency
  overallScore: number;     // weighted final
  confidence: number;       // 0–1: how confident is the model in this assessment
  reasoning: string;        // 2–4 sentence overall reasoning (Russian)
  strengths: string[];      // top 2–3 strengths observed
  weaknesses: string[];     // top 1–2 areas for development
  redFlags: string[];       // any concerns (vague answers, inconsistency, etc.)
  keyQuotes: string[];      // 2–3 verbatim candidate phrases that drove scoring
}

interface CandidateContext {
  name?: string;
  city?: string;
  program?: string;
  goals?: string;
  experience?: string;
}

const SCORING_PROMPT = (transcript: string, ctx: CandidateContext) => `
You are an expert admissions evaluator for inVision U — a selective leadership development program in Kazakhstan.

Candidate profile:
- Name: ${ctx.name || "Anonymous"}
- City: ${ctx.city || "Unknown"}
- Program: ${ctx.program || "inVision U"}
- Stated goals: ${ctx.goals || "Not provided"}
- Experience background: ${ctx.experience || "Not provided"}

Full interview transcript:
${transcript}

Evaluate this candidate strictly and honestly. Score each dimension from 0 to 100.
Be critical — not every answer deserves 70+. A score of 50 is average, 75 is strong, 90+ is exceptional.

Respond ONLY with a valid JSON object in this exact format:
{
  "cognitive": <number 0-100>,
  "leadership": <number 0-100>,
  "growth": <number 0-100>,
  "decision": <number 0-100>,
  "motivation": <number 0-100>,
  "authenticity": <number 0-100>,
  "reasoning": "<2-4 sentences in Russian summarizing candidate quality>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<area for development>"],
  "redFlags": ["<concern if any, or empty array>"],
  "keyQuotes": ["<exact quote from candidate>", "<another quote>"]
}

Scoring rubric:
- cognitive: depth of analytical thinking, ability to structure complex problems
- leadership: demonstrated initiative, influence on others, taking responsibility
- growth: learning mindset, ability to reflect on failure, trajectory not just results
- decision: quality of reasoning in the case scenario, pragmatism
- motivation: authenticity of drive toward the program, long-term vision
- authenticity: specificity of examples (names, places, dates), internal consistency

Do not include any text outside the JSON.
`.trim();

export async function scoreCandidateWithLLM(
  messages: string[],
  context: CandidateContext,
): Promise<LLMScoreResult | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  if (messages.length < 3) return null; // too short to evaluate

  const transcript = messages
    .map((msg, i) => {
      const questions = [
        "Для начала кратко представьтесь и расскажите, из какой среды вы выросли.",
        "Почему вы хотите поступить в inVision U и какой путь хотите пройти после обучения?",
        "Расскажите про ситуацию, где вы взяли инициативу и изменили ход событий.",
        "Опишите проект или достижение, которым вы действительно гордитесь. Что именно сделали вы?",
        "Кейс: в вашей школе или сообществе низкая вовлечённость в общественные проекты. Что вы сделаете за ближайшие 3 месяца?",
      ];
      const question = questions[i] || `Вопрос ${i + 1}`;
      return `[Вопрос ${i + 1}]: ${question}\n[Ответ кандидата]: ${msg}`;
    })
    .join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: SCORING_PROMPT(transcript, context),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[llm-scorer] OpenAI error:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as Omit<LLMScoreResult, "overallScore" | "confidence">;

    // Weighted final score: cognitive 25%, leadership 20%, growth 20%, decision 15%, motivation 10%, authenticity 10%
    const overallScore = Math.round(
      parsed.cognitive * 0.25 +
        parsed.leadership * 0.2 +
        parsed.growth * 0.2 +
        parsed.decision * 0.15 +
        parsed.motivation * 0.1 +
        parsed.authenticity * 0.1,
    );

    // Confidence based on answer count and red flag count
    const rawConfidence = 0.75 + messages.length * 0.02 - (parsed.redFlags?.length || 0) * 0.05;
    const confidence = Math.max(0.4, Math.min(0.97, rawConfidence));

    return {
      ...parsed,
      overallScore,
      confidence,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      redFlags: parsed.redFlags || [],
      keyQuotes: parsed.keyQuotes || [],
    };
  } catch (error) {
    console.error("[llm-scorer] Parse/fetch error:", error instanceof Error ? error.message : String(error));
    return null;
  }
}
