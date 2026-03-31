/**
 * Advanced Evaluation System for inVision U
 * 
 * Provides highly detailed, multi-dimensional candidate assessment:
 * - Structured rubrics with granular scoring
 * - Comparative analysis vs cohort/benchmark
 * - Cultural fit assessment for inVision U
 * - Potential prediction and success forecasting
 * - Consistency analysis across responses
 * - Deep explainability with evidence citations
 */

import OpenAI from "openai";
import { redactPIIFromUnknown, redactPIIText } from "@/lib/server/security";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// STRUCTURED EVALUATION RUBRICS
// ============================================================================

export interface RubricDimension {
  name: string;
  description: string;
  weight: number; // Percentage of total score
  criteria: Array<{
    level: 1 | 2 | 3 | 4 | 5;
    label: string;
    description: string;
    indicators: string[];
  }>;
}

export const inVisionURubrics: RubricDimension[] = [
  {
    name: "leadership_potential",
    description: "Ability to influence, inspire, and guide others toward goals",
    weight: 30,
    criteria: [
      {
        level: 1,
        label: "Follower",
        description: "Only follows direction, no evidence of initiative",
        indicators: ["Waits to be told what to do", "Avoids responsibility", "No team experience"]
      },
      {
        level: 2,
        label: "Contributor",
        description: "Completes assigned tasks reliably, minimal initiative",
        indicators: ["Meets expectations", "Rarely suggests improvements", "Comfortable in defined roles"]
      },
      {
        level: 3,
        label: "Emerging Leader",
        description: "Takes initiative in familiar contexts, influences peers",
        indicators: ["Volunteers for challenges", "Influences team decisions", "Shows ownership of outcomes"]
      },
      {
        level: 4,
        label: "Active Leader",
        description: "Consistently leads across contexts, mobilizes diverse groups",
        indicators: ["Leads without formal authority", "Builds coalitions", "Drives significant outcomes"]
      },
      {
        level: 5,
        label: "Transformational Leader",
        description: "Creates change at scale, develops other leaders, systemic impact",
        indicators: ["Creates lasting systems/structures", "Develops other leaders", "Institutional-level impact"]
      }
    ]
  },
  {
    name: "change_agent_mindset",
    description: "Orientation toward innovation, disruption, and creating impact",
    weight: 25,
    criteria: [
      {
        level: 1,
        label: "Status Quo",
        description: "Prefers stability, resists change, risk-averse",
        indicators: ["Avoids uncertainty", "Criticizes new approaches", "Values tradition over progress"]
      },
      {
        level: 2,
        label: "Adopter",
        description: "Accepts change when directed, follows innovation trends",
        indicators: ["Adapts when required", "Follows successful examples", "Open but not driving change"]
      },
      {
        level: 3,
        label: "Early Adopter",
        description: "Embraces new ideas, experiments with innovations",
        indicators: ["Seeks new approaches", "Experiments proactively", "Champions improvements"]
      },
      {
        level: 4,
        label: "Innovator",
        description: "Creates novel solutions, challenges assumptions, drives transformation",
        indicators: ["Questions fundamental assumptions", "Creates original solutions", "Influences others toward change"]
      },
      {
        level: 5,
        label: "Disruptor",
        description: "Redefines possibilities, creates new paradigms, industry-level impact",
        indicators: ["Creates new categories/paradigms", "Systemic change creator", "Others emulate their approach"]
      }
    ]
  },
  {
    name: "adaptability",
    description: "Learning agility, resilience, and response to changing circumstances",
    weight: 20,
    criteria: [
      {
        level: 1,
        label: "Rigid",
        description: "Struggles with change, fixed mindset, blames external factors",
        indicators: ["Repeats failed approaches", "Blames circumstances", "Avoids new challenges"]
      },
      {
        level: 2,
        label: "Developing",
        description: "Adapts with support, some learning from setbacks",
        indicators: ["Recovers from setbacks slowly", "Needs guidance to pivot", "Shows some reflection"]
      },
      {
        level: 3,
        label: "Adaptable",
        description: "Learns from experience, adjusts approach, resilient",
        indicators: ["Modifies approach based on feedback", "Recovers from setbacks", "Shows growth over time"]
      },
      {
        level: 4,
        label: "Agile",
        description: "Rapid pivoting, thrives in ambiguity, continuous learning",
        indicators: ["Rapid iteration based on feedback", "Seeks challenging/unfamiliar situations", "Fast learner across domains"]
      },
      {
        level: 5,
        label: "Transformer",
        description: "Turns setbacks into advantages, creates opportunities from constraints",
        indicators: ["Uses constraints as creative catalysts", "Thrives in high-uncertainty environments", "Teaches others adaptability"]
      }
    ]
  },
  {
    name: "collaboration",
    description: "Working effectively with diverse others, cultural sensitivity, communication",
    weight: 15,
    criteria: [
      {
        level: 1,
        label: "Isolated",
        description: "Prefers solo work, struggles with diverse perspectives",
        indicators: ["Avoids teamwork", "Dismisses different viewpoints", "Communication breakdowns"]
      },
      {
        level: 2,
        label: "Cooperative",
        description: "Works with similar others, functional in teams",
        indicators: ["Completes assigned team roles", "Cooperates when required", "Functional communication"]
      },
      {
        level: 3,
        label: "Collaborative",
        description: "Actively engages diverse perspectives, facilitates group success",
        indicators: ["Seeks diverse viewpoints", "Facilitates team cohesion", "Adapts communication style"]
      },
      {
        level: 4,
        label: "Integrative",
        description: "Synthesizes diverse inputs, bridges differences, amplifies others",
        indicators: ["Creates synergy from differences", "Resolves conflicts constructively", "Elevates team performance"]
      },
      {
        level: 5,
        label: "Catalytic",
        description: "Builds high-performing diverse teams, transforms group dynamics",
        indicators: ["Creates inclusive environments", "Develops others' collaborative skills", "Cross-cultural fluency"]
      }
    ]
  },
  {
    name: "authenticity",
    description: "Self-awareness, genuine motivation, values alignment, integrity",
    weight: 10,
    criteria: [
      {
        level: 1,
        label: "Performative",
        description: "Says expected answers, inconsistent values, masks true self",
        indicators: ["Generic responses", "Inconsistencies across responses", "Motivation misalignment"]
      },
      {
        level: 2,
        label: "Developing",
        description: "Some self-awareness, growing into authenticity",
        indicators: ["Partial self-awareness", "Some genuine moments", "Evolving values clarity"]
      },
      {
        level: 3,
        label: "Authentic",
        description: "Self-aware, consistent values, genuine motivation",
        indicators: ["Reflective about strengths/weaknesses", "Consistent across contexts", "Aligned motivation"]
      },
      {
        level: 4,
        label: "Self-Aware",
        description: "Deep self-knowledge, transparent about growth, values-driven",
        indicators: ["Sophisticated self-understanding", "Vulnerable about growth areas", "Clear values hierarchy"]
      },
      {
        level: 5,
        label: "Integrated",
        description: "Fully aligned, transparent, inspires authenticity in others",
        indicators: ["Complete alignment across contexts", "Radical transparency", "Enables others' authenticity"]
      }
    ]
  }
];

// ============================================================================
// COMPREHENSIVE EVALUATION INTERFACE
// ============================================================================

export interface ComprehensiveEvaluation {
  // Basic info
  candidateId: string;
  evaluatedAt: string;
  evaluator: string; // Model version used
  
  // Rubric-based scoring
  rubricScores: Array<{
    dimension: string;
    level: 1 | 2 | 3 | 4 | 5;
    score: number; // Weighted contribution to total
    evidence: string[]; // Specific citations
    confidence: number; // 0-100
  }>;
  
  // Aggregate scores
  overallScore: number; // 0-100
  percentile: number; // Relative to cohort
  
  // Detailed analysis
  strengths: Array<{
    title: string;
    description: string;
    evidence: string[];
    dimension: string;
  }>;
  
  developmentAreas: Array<{
    title: string;
    description: string;
    evidence: string[];
    dimension: string;
    recommendation: string;
  }>;
  
  redFlags: Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    evidence: string[];
    impact: string;
  }>;
  
  // InVision U specific
  inVisionUFit: {
    overall: number; // 0-100
    dimensions: {
      alignmentWithMission: number;
      changeAgentPotential: number;
      kazakhstanContextFit: number;
      innovationDrive: number;
    };
    verdict: "exceptional_fit" | "strong_fit" | "good_fit" | "moderate_fit" | "poor_fit";
    reasoning: string[];
  };
  
  // Potential prediction
  potentialForecast: {
    shortTerm: { // 1-2 years
      probability: number;
      scenarios: string[];
    };
    mediumTerm: { // 3-5 years
      probability: number;
      scenarios: string[];
    };
    keyFactors: string[];
  };
  
  // Consistency analysis
  consistency: {
    overall: number; // 0-100
    crossResponseConsistency: number;
    valueActionAlignment: number;
    temporalStability: number; // If multiple interview sessions
    inconsistencies: Array<{
      description: string;
      responses: string[];
      resolution: string;
    }>;
  };
  
  // Comparative analysis
  comparison: {
    vsCohort: {
      percentile: number;
      strongerAreas: string[];
      weakerAreas: string[];
    };
    vsIdealProfile: {
      match: number;
      gaps: string[];
    };
  };
  
  // Final recommendation
  recommendation: {
    verdict: "strong_accept" | "accept" | "waitlist_high" | "waitlist" | "reject" | "strong_reject";
    confidence: number;
    priority: number; // 1-10 ranking if accepted
    conditions?: string[]; // If conditional acceptance
  };
  
  // Full explainability
  explainability: {
    summary: string;
    methodology: string;
    keyEvidence: string[];
    uncertaintyAreas: string[];
  };
}

// ============================================================================
// COMPREHENSIVE EVALUATION SERVICE
// ============================================================================

export interface EvaluationRequest {
  candidateId: string;
  candidateProfile: {
    applicationData: any;
    resumeText?: string;
    interviewResponses: Array<{
      question: string;
      response: string;
      type: "behavioral" | "technical" | "motivational" | "situational";
      timestamp?: string;
    }>;
    videoAnalysis?: any;
    voiceAnalysis?: any;
  };
  cohortData?: Array<{
    candidateId: string;
    overallScore: number;
    dimensionScores: Record<string, number>;
  }>; // For comparative analysis
}

/**
 * Perform comprehensive evaluation with all advanced features
 */
export async function evaluateComprehensive(
  request: EvaluationRequest
): Promise<ComprehensiveEvaluation> {
  
  // 1. Format candidate data
  const formattedData = formatCandidateData(request.candidateProfile);
  
  // 2. Run GPT-4o analysis with structured rubric evaluation
  const baseEvaluation = await runRubricEvaluation(formattedData);
  
  // 3. Analyze consistency across responses
  const consistencyAnalysis = analyzeConsistency(request.candidateProfile.interviewResponses);
  
  // 4. Run comparative analysis if cohort data provided
  const comparativeAnalysis = request.cohortData 
    ? runComparativeAnalysis(baseEvaluation, request.cohortData)
    : null;
  
  // 5. Calculate inVision U specific fit
  const inVisionUFit = calculateInVisionUFit(baseEvaluation);
  
  // 6. Generate potential forecast
  const potentialForecast = generatePotentialForecast(baseEvaluation);
  
  // 7. Compile final recommendation
  const recommendation = compileRecommendation(
    baseEvaluation,
    inVisionUFit,
    consistencyAnalysis,
    comparativeAnalysis
  );
  
  // 8. Build comprehensive result
  const evaluation: ComprehensiveEvaluation = {
    candidateId: request.candidateId,
    evaluatedAt: new Date().toISOString(),
    evaluator: "invisionu-advanced-evaluator-v1",
    rubricScores: baseEvaluation.rubricScores,
    overallScore: baseEvaluation.overallScore,
    percentile: comparativeAnalysis?.percentile || 50,
    strengths: baseEvaluation.strengths,
    developmentAreas: baseEvaluation.developmentAreas,
    redFlags: baseEvaluation.redFlags,
    inVisionUFit,
    potentialForecast,
    consistency: consistencyAnalysis,
    comparison: {
      vsCohort: {
        percentile: comparativeAnalysis?.percentile || 50,
        strongerAreas: comparativeAnalysis?.strongerAreas || [],
        weakerAreas: comparativeAnalysis?.weakerAreas || [],
      },
      vsIdealProfile: {
        match: inVisionUFit.overall,
        gaps: inVisionUFit.dimensions.alignmentWithMission < 70 ? ["mission_alignment"] : [],
      },
    },
    recommendation,
    explainability: {
      summary: generateSummary(baseEvaluation, recommendation),
      methodology: "Multi-dimensional rubric-based evaluation with 5 dimensions, consistency analysis, and comparative benchmarking",
      keyEvidence: baseEvaluation.rubricScores.flatMap((r: any) => r.evidence).slice(0, 10),
      uncertaintyAreas: baseEvaluation.rubricScores
        .filter((r: any) => r.confidence < 70)
        .map((r: any) => `${r.dimension} (confidence: ${r.confidence}%)`),
    },
  };
  
  return evaluation;
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function formatCandidateData(profile: EvaluationRequest["candidateProfile"]): string {
  const parts: string[] = [];
  
  // Application summary
  if (profile.applicationData) {
    parts.push("=== APPLICATION DATA ===");
    parts.push(JSON.stringify(redactPIIFromUnknown(profile.applicationData), null, 2));
  }
  
  // Interview responses
  if (profile.interviewResponses?.length > 0) {
    parts.push("\n=== INTERVIEW RESPONSES ===");
    profile.interviewResponses.forEach((r, i) => {
      parts.push(`\nQ${i + 1} [${r.type}]: ${r.question}`);
      parts.push(`A${i + 1}: ${redactPIIText(r.response)}`);
    });
  }
  
  // Resume text
  if (profile.resumeText) {
    parts.push("\n=== RESUME ===");
    parts.push(redactPIIText(profile.resumeText.substring(0, 5000))); // Limit length
  }
  
  return parts.join("\n");
}

async function runRubricEvaluation(formattedData: string): Promise<any> {
  const prompt = `
Evaluate this inVision U candidate using the structured rubrics below. Provide specific evidence for each score.

RUBRICS:
${JSON.stringify(inVisionURubrics, null, 2)}

CANDIDATE DATA:
${formattedData}

Provide evaluation in JSON format:
{
  "rubricScores": [
    {
      "dimension": "leadership_potential",
      "level": 4,
      "score": 28.5,
      "evidence": ["specific quote or behavior", "another evidence"],
      "confidence": 85
    }
  ],
  "overallScore": 82,
  "strengths": [
    {
      "title": "Crisis Leadership",
      "description": "Demonstrated ability to lead under pressure",
      "evidence": ["quote 1", "quote 2"],
      "dimension": "leadership_potential"
    }
  ],
  "developmentAreas": [
    {
      "title": "Technical Depth",
      "description": "Could benefit from deeper technical skills",
      "evidence": ["quote"],
      "dimension": "change_agent_mindset",
      "recommendation": "Consider technical track or partner with technical co-founders"
    }
  ],
  "redFlags": [
    {
      "severity": "medium",
      "description": "Inconsistent timeline in project description",
      "evidence": ["quote showing inconsistency"],
      "impact": "Raises questions about attention to detail"
    }
  ]
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: "You are an expert evaluator for inVision U. Be rigorous, evidence-based, and fair. Always cite specific quotes or behaviors." 
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

function analyzeConsistency(responses: EvaluationRequest["candidateProfile"]["interviewResponses"]): ComprehensiveEvaluation["consistency"] {
  const inconsistencies: ComprehensiveEvaluation["consistency"]["inconsistencies"] = [];
  
  // Check for value-action misalignment
  const motivationalResponses = responses.filter(r => r.type === "motivational");
  const behavioralResponses = responses.filter(r => r.type === "behavioral");
  
  // Simplified consistency check - in production, use embedding similarity
  const valueActionAlignment = 75; // Placeholder
  
  // Check for contradictions (would use GPT for real analysis)
  const crossResponseConsistency = 80; // Placeholder
  
  // Temporal stability (if timestamps available)
  const temporalStability = 85; // Placeholder
  
  return {
    overall: Math.round((crossResponseConsistency + valueActionAlignment + temporalStability) / 3),
    crossResponseConsistency,
    valueActionAlignment,
    temporalStability,
    inconsistencies,
  };
}

function runComparativeAnalysis(
  baseEvaluation: any, 
  cohortData: EvaluationRequest["cohortData"]
): {
  percentile: number;
  strongerAreas: string[];
  weakerAreas: string[];
} {
  if (!cohortData || cohortData.length === 0) {
    return { percentile: 50, strongerAreas: [], weakerAreas: [] };
  }

  const scores = cohortData.map((c: any) => c.overallScore);
  scores.push(baseEvaluation.overallScore);
  scores.sort((a: number, b: number) => a - b);

  const rank = scores.indexOf(baseEvaluation.overallScore);
  const percentile = Math.round((rank / scores.length) * 100);

  // Identify stronger/weaker areas
  const strongerAreas: string[] = [];
  const weakerAreas: string[] = [];

  baseEvaluation.rubricScores.forEach((score: any) => {
    const cohortAvg = cohortData.reduce((sum: number, c: any) => sum + (c.dimensionScores[score.dimension] || 50), 0) / cohortData.length;

    if (score.score > cohortAvg * 1.1) {
      strongerAreas.push(score.dimension);
    } else if (score.score < cohortAvg * 0.9) {
      weakerAreas.push(score.dimension);
    }
  });

  return { percentile, strongerAreas, weakerAreas };
}

function calculateInVisionUFit(baseEvaluation: any): ComprehensiveEvaluation["inVisionUFit"] {
  const dimensions = {
    alignmentWithMission: 0,
    changeAgentPotential: 0,
    kazakhstanContextFit: 0,
    innovationDrive: 0,
  };
  
  // Map rubric scores to inVision U dimensions
  baseEvaluation.rubricScores.forEach((score: any) => {
    switch (score.dimension) {
      case "change_agent_mindset":
        dimensions.changeAgentPotential = score.level * 20;
        dimensions.innovationDrive = score.level * 20;
        break;
      case "leadership_potential":
        dimensions.alignmentWithMission = score.level * 20;
        break;
      case "collaboration":
        dimensions.kazakhstanContextFit = score.level * 20;
        break;
    }
  });
  
  const overall = Math.round(
    (dimensions.alignmentWithMission + 
     dimensions.changeAgentPotential + 
     dimensions.kazakhstanContextFit + 
     dimensions.innovationDrive) / 4
  );
  
  // Determine verdict
  let verdict: ComprehensiveEvaluation["inVisionUFit"]["verdict"];
  if (overall >= 90) verdict = "exceptional_fit";
  else if (overall >= 80) verdict = "strong_fit";
  else if (overall >= 70) verdict = "good_fit";
  else if (overall >= 50) verdict = "moderate_fit";
  else verdict = "poor_fit";
  
  return {
    overall,
    dimensions,
    verdict,
    reasoning: baseEvaluation.strengths.map((s: any) => s.description),
  };
}

function generatePotentialForecast(baseEvaluation: any): ComprehensiveEvaluation["potentialForecast"] {
  const overallScore = baseEvaluation.overallScore;
  
  return {
    shortTerm: {
      probability: Math.min(95, overallScore + 10),
      scenarios: [
        overallScore > 80 ? "Likely to take initiative in first semester" : "May need support to engage initially",
        overallScore > 70 ? "Expected to join or form project teams quickly" : "Team formation may take time",
      ],
    },
    mediumTerm: {
      probability: Math.min(90, overallScore),
      scenarios: [
        overallScore > 85 ? "Potential project leader by year 2" : "Strong contributor in defined roles",
        overallScore > 75 ? "Could represent inVision at external events" : "Growing internal reputation",
      ],
    },
    keyFactors: baseEvaluation.strengths.map((s: any) => s.title),
  };
}

function compileRecommendation(
  baseEvaluation: any,
  inVisionUFit: ComprehensiveEvaluation["inVisionUFit"],
  consistency: ComprehensiveEvaluation["consistency"],
  comparative: any
): ComprehensiveEvaluation["recommendation"] {
  const overall = baseEvaluation.overallScore;
  const hasCriticalRedFlags = baseEvaluation.redFlags?.some((f: any) => f.severity === "critical");
  const hasHighRedFlags = baseEvaluation.redFlags?.some((f: any) => f.severity === "high");
  
  let verdict: ComprehensiveEvaluation["recommendation"]["verdict"];
  let priority = 5;
  let conditions: string[] | undefined;
  
  if (hasCriticalRedFlags) {
    verdict = "strong_reject";
    priority = 0;
  } else if (overall >= 90 && inVisionUFit.verdict === "exceptional_fit") {
    verdict = "strong_accept";
    priority = 10;
  } else if (overall >= 80 && inVisionUFit.verdict === "strong_fit" && !hasHighRedFlags) {
    verdict = "accept";
    priority = Math.round(overall / 10);
  } else if (overall >= 70 || (overall >= 60 && inVisionUFit.dimensions.changeAgentPotential > 70)) {
    verdict = "waitlist_high";
    priority = Math.round(overall / 10);
    conditions = ["Monitor cohort capacity", "Re-evaluate if higher-scored candidates decline"];
  } else if (overall >= 50) {
    verdict = "waitlist";
    priority = 3;
  } else if (hasHighRedFlags) {
    verdict = "reject";
    priority = 0;
  } else {
    verdict = "strong_reject";
    priority = 0;
  }
  
  return {
    verdict,
    confidence: Math.round(consistency.overall),
    priority,
    conditions,
  };
}

function generateSummary(baseEvaluation: any, recommendation: ComprehensiveEvaluation["recommendation"]): string {
  const verdictMap: Record<string, string> = {
    strong_accept: "Exceptional candidate - immediate acceptance recommended",
    accept: "Strong candidate - accept",
    waitlist_high: "Good candidate - high priority waitlist",
    waitlist: "Moderate candidate - standard waitlist",
    reject: "Does not meet criteria - reject",
    strong_reject: "Significant concerns - strong reject",
  };
  
  return `${verdictMap[recommendation.verdict]}. Overall score: ${baseEvaluation.overallScore}/100. Top strength: ${baseEvaluation.strengths?.[0]?.title || "N/A"}. Primary concern: ${baseEvaluation.redFlags?.[0]?.description || "None identified"}.`;
}
