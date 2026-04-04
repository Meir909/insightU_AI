/**
 * OpenAI Fine-Tuning System for inVision U Interview Evaluation
 * 
 * This module provides:
 * 1. Fine-tuning dataset generation
 * 2. Training data structure for inVisionU-specific evaluation
 * 3. Integration with fine-tuned models
 * 
 * To actually fine-tune:
 * 1. Generate training data using generateFineTuningDataset()
 * 2. Upload to OpenAI: openai.files.create({ file: fs.createReadStream('training.jsonl'), purpose: 'fine-tune' })
 * 3. Create fine-tune job: openai.fineTuning.jobs.create({ training_file: fileId, model: 'gpt-4o-2024-08-06' })
 * 4. Use fine-tuned model: model: 'ft:gpt-4o-2024-08-06:your-org:custom-model-name'
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// FINE-TUNING DATASET STRUCTURE
// ============================================================================

export interface FineTuningExample {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

// System prompt for inVisionU evaluator
const INVISU_SYSTEM_PROMPT = `You are an expert evaluator for inVision U, a digital university in Kazakhstan seeking "agents of change" - talented young leaders with high potential, not just academic achievers.

Your evaluation criteria:
1. LEADERSHIP POTENTIAL (30%): Initiative, influence, decision-making under uncertainty
2. CHANGE AGENT MINDSET (25%): Innovation drive, disruptor mentality, vision for impact
3. ADAPTABILITY (20%): Learning agility, resilience, growth mindset
4. COLLABORATION (15%): Team dynamics, cultural sensitivity, communication
5. AUTHENTICITY (10%): Self-awareness, genuine motivation, values alignment

Evaluation rubric (1-5 scale):
1 = Below threshold | 2 = Developing | 3 = Meets expectations | 4 = Exceeds | 5 = Exceptional

Provide:
- Dimension scores (1-5) with specific evidence
- Overall fit score (0-100)
- Strengths (3 specific examples)
- Growth areas (2 constructive points)
- Red flags (if any)
- Recommendation: STRONG_ACCEPT / ACCEPT / WAITLIST / REJECT / STRONG_REJECT

Always cite specific quotes or behaviors as evidence.`;

// ============================================================================
// TRAINING EXAMPLES FOR FINE-TUNING
// ============================================================================

export const trainingExamples: FineTuningExample[] = [
  // EXAMPLE 1: Strong Leader
  {
    messages: [
      { role: "system", content: INVISU_SYSTEM_PROMPT },
      { 
        role: "user", 
        content: `Interview Response:
Q: "Tell me about a time you led through a difficult situation."
A: "Last year our robotics team lost our main sponsor 2 weeks before competition. I immediately called emergency meetings, split the team into fundraising and cost-cutting groups. I personally pitched to 12 companies in 3 days, secured 2 smaller sponsors. We made it to nationals and placed 3rd. The experience taught me that crisis reveals true leadership - you can't plan for everything, but you can control your response."

Q: "Why inVision U specifically?"
A: "I don't want a traditional degree. I want to build things that matter. InVision's project-based approach and connection to real startups is exactly what I need. I'm not here for the diploma - I'm here to create impact."

Q: "How do you handle failure?"
A: "I fail fast and learn faster. Last semester I launched an app that got zero downloads. Instead of giving up, I interviewed 50 potential users, pivoted the concept, and relaunched. Now it has 2000 users. Failure is just data if you're willing to listen."

Assessment Request: Evaluate this candidate for inVision U "agent of change" program.` 
      },
      {
        role: "assistant",
        content: JSON.stringify({
          dimensionScores: {
            leadership_potential: { score: 5, evidence: "Crisis management: lost sponsor → immediate action, team mobilization, personal pitching effort, achieved result (3rd place nationals)" },
            change_agent_mindset: { score: 5, evidence: "Explicit disruptor language: 'don't want traditional degree', 'build things that matter', 'here to create impact'" },
            adaptability: { score: 5, evidence: "App failure → 50 user interviews → pivot → 2000 users. Shows resilience and learning agility" },
            collaboration: { score: 4, evidence: "Split team into groups, delegated effectively. Minor: focus on 'I' vs 'we' in some responses" },
            authenticity: { score: 5, evidence: "Genuine motivation, self-awareness about learning from failure, consistent values" }
          },
          overallFit: 96,
          strengths: [
            "Proven crisis leadership with measurable outcomes (3rd place nationals)",
            "Explicit alignment with inVision's non-traditional approach",
            "Demonstrated growth mindset with concrete pivot example"
          ],
          growthAreas: [
            "Could emphasize team contributions more (some 'I' vs 'we' language)",
            "Would benefit from international/cross-cultural experience"
          ],
          redFlags: [],
          recommendation: "STRONG_ACCEPT",
          reasoning: "This candidate exemplifies the 'agent of change' archetype. Shows initiative under pressure, authentic motivation, demonstrated learning agility, and results orientation. Crisis leadership example is exceptional with clear cause-effect chain. Explicit rejection of traditional education aligns perfectly with inVision's mission."
        }, null, 2)
      }
    ]
  },

  // EXAMPLE 2: High Academic, Low Leadership
  {
    messages: [
      { role: "system", content: INVISU_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Interview Response:
Q: "Tell me about a time you led through a difficult situation."
A: "Well, I maintained a 4.0 GPA while taking 6 AP courses. It was very difficult to balance everything. I created a strict study schedule and followed it rigorously. I guess that's leadership of myself?"

Q: "Why inVision U specifically?"
A: "I researched the best universities and inVision has excellent rankings. The degree will help me get into a good graduate program. I want to pursue a PhD eventually."

Q: "Describe a conflict you resolved."
A: "I don't really have conflicts. I focus on my studies and avoid drama. If someone disagrees with me, I usually just study harder to prove my point through results."

Assessment Request: Evaluate this candidate for inVision U "agent of change" program.`
      },
      {
        role: "assistant",
        content: JSON.stringify({
          dimensionScores: {
            leadership_potential: { score: 2, evidence: "Self-leadership only, no evidence of leading others. Avoids direct answer about difficult situation." },
            change_agent_mindset: { score: 1, evidence: "Traditional academic trajectory focus (rankings, PhD). No innovation or impact language." },
            adaptability: { score: 2, evidence: "Rigidity in approach ('strict schedule', 'avoid drama'). No evidence of pivoting or learning from failure." },
            collaboration: { score: 1, evidence: "Conflict avoidance ('avoid drama'), solitary approach ('prove through results'). No team experience shown." },
            authenticity: { score: 3, evidence: "Honest about academic focus, but misaligned with inVision mission. Values mismatch is clear." }
          },
          overallFit: 22,
          strengths: [
            "Strong academic discipline and self-management",
            "Clear about personal goals (transparency)"
          ],
          growthAreas: [
            "No demonstrated experience working with or leading others",
            "Fixed mindset evidence: avoids challenges/conflict rather than engaging",
            "Motivation misaligned with inVision's project-based, innovation focus"
          ],
          redFlags: [
            "Conflict avoidance suggests poor collaboration skills",
            "Academic credentialism contradicts 'agent of change' values",
            "No evidence of innovation or risk-taking"
          ],
          recommendation: "STRONG_REJECT",
          reasoning: "Fundamental misalignment with inVision U mission. Candidate seeks traditional academic path (rankings → PhD) while inVision seeks change agents. No leadership of others, conflict avoidance, rigid approach. This profile fits conventional universities, not inVision's innovation-focused model."
        }, null, 2)
      }
    ]
  },

  // EXAMPLE 3: Potential with Growth Areas
  {
    messages: [
      { role: "system", content: INVISU_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Interview Response:
Q: "Tell me about your leadership experience."
A: "I started a small tutoring business for younger students in my neighborhood. At first it was just me, but now I have 5 friends working with me. We help about 30 kids with math and science."

Q: "What's the biggest challenge you've faced?"
A: "Managing my friends. When we started, I treated them like... employees I guess? It didn't work. They almost quit. I had to learn to listen more and give them ownership. Now they suggest improvements and I mostly coordinate."

Q: "Why do you want to join inVision?"
A: "I want to learn how to scale impact. Right now I help 30 kids, but what about 300? 3000? I need the skills and network to grow bigger."

Assessment Request: Evaluate this candidate for inVision U "agent of change" program.`
      },
      {
        role: "assistant",
        content: JSON.stringify({
          dimensionScores: {
            leadership_potential: { score: 4, evidence: "Started business, scaled to team of 5. Growth from directive to collaborative leadership shows learning." },
            change_agent_mindset: { score: 4, evidence: "Impact scaling mindset: 30 → 300 → 3000. Clear desire for growth and systems thinking." },
            adaptability: { score: 4, evidence: "Recognized leadership approach failure, pivoted to collaborative style. Explicit learning moment." },
            collaboration: { score: 4, evidence: "Transitioned from top-down to empowering team. Friends now contribute ideas." },
            authenticity: { score: 4, evidence: "Self-aware about initial mistakes, genuine motivation for impact growth" }
          },
          overallFit: 82,
          strengths: [
            "Demonstrated entrepreneurial initiative with measurable results",
            "Self-aware leadership evolution: directive → collaborative",
            "Clear impact scaling vision aligned with inVision's growth mindset"
          ],
          growthAreas: [
            "Could benefit from broader perspective beyond local context",
            "No experience with technology/digital tools for scaling"
          ],
          redFlags: [],
          recommendation: "ACCEPT",
          reasoning: "Strong 'agent of change' potential with evidence of learning agility. Leadership evolution shows growth mindset. Scaling vision aligns with inVision. Minor gaps in tech experience and global perspective, but core values and trajectory are strong fits."
        }, null, 2)
      }
    ]
  },

  // EXAMPLE 4: Cultural Fit Assessment
  {
    messages: [
      { role: "system", content: INVISU_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Interview Response:
Q: "How do you work in diverse teams?"
A: "I grew up in a multilingual family - Kazakh, Russian, English. I think that helped me understand different perspectives. In my debate club, we had people from very different backgrounds. I learned to ask questions instead of assuming."

Q: "Describe a time you changed your mind."
A: "I used to think tech skills were everything. Then I worked on a project with someone who wasn't technical but had amazing user empathy. Our product succeeded because of their input. Now I actively seek people with different strengths."

Q: "What does 'change agent' mean to you?"
A: "Someone who sees a problem and acts, not just complains. But also someone who brings others along - you can't change anything alone. I try to be that person who starts conversations about what could be better."

Assessment Request: Evaluate this candidate for inVision U "agent of change" program.`
      },
      {
        role: "assistant",
        content: JSON.stringify({
          dimensionScores: {
            leadership_potential: { score: 4, evidence: "Initiates conversations, brings others along. Not just individual action but collective mobilization." },
            change_agent_mindset: { score: 5, evidence: "Sophisticated understanding: action + inclusion. 'Can't change anything alone' shows systemic thinking." },
            adaptability: { score: 4, evidence: "Changed fundamental belief about tech skills through experience. Shows cognitive flexibility." },
            collaboration: { score: 5, evidence: "Multilingual background, explicit perspective-taking, learned to value diverse strengths." },
            authenticity: { score: 4, evidence: "Self-aware about growth, genuine curiosity about others, consistent values" }
          },
          overallFit: 90,
          strengths: [
            "Multilingual/cultural background directly relevant to Kazakhstan context",
            "Sophisticated understanding of change agency (not just individual heroism)",
            "Demonstrated cognitive flexibility and learning from diverse perspectives"
          ],
          growthAreas: [
            "Could use more examples of concrete outcomes/impact",
            "May need support in translating cultural awareness into leadership action"
          ],
          redFlags: [],
          recommendation: "STRONG_ACCEPT",
          reasoning: "Exceptional cultural fit for Kazakhstan context with multilingual background. Nuanced understanding of change agency that includes others. Strong collaboration skills with evidence of learning from diversity. High potential for inVision's international, diverse environment."
        }, null, 2)
      }
    ]
  },

  // EXAMPLE 5: Inconsistent/Red Flags
  {
    messages: [
      { role: "system", content: INVISU_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Interview Response:
Q: "Tell me about your biggest failure."
A: "I've never really failed at anything major. I've always been successful in what I try."

Q: "How do you handle criticism?"
A: "I appreciate constructive feedback. But honestly, people usually don't criticize me because I do things well."

Q: "Describe working with a difficult teammate."
A: "I've been lucky to work with great people. If someone was difficult, I'd probably just avoid them and focus on my work."

Q: "What would you do if your project was failing?"
A: "I don't let projects fail. I work harder until they succeed."

Assessment Request: Evaluate this candidate for inVision U "agent of change" program.`
      },
      {
        role: "assistant",
        content: JSON.stringify({
          dimensionScores: {
            leadership_potential: { score: 2, evidence: "Avoidance strategy for difficult people. No evidence of engaging with challenges directly." },
            change_agent_mindset: { score: 2, evidence: "Fixed mindset language: 'don't let projects fail', 'work harder'. No learning from failure." },
            adaptability: { score: 1, evidence: "Claims never failed. Either dishonest or extremely risk-averse. Both are problems." },
            collaboration: { score: 1, evidence: "Conflict avoidance ('avoid them'), no evidence of engaging with different perspectives." },
            authenticity: { score: 2, evidence: "Inconsistency: claims to appreciate feedback but says no one criticizes. Likely inflated self-view." }
          },
          overallFit: 18,
          strengths: [
            "Self-confidence (though potentially excessive)"
          ],
          growthAreas: [
            "No demonstrated experience with failure or learning from setbacks",
            "Avoidance-based approach to difficult situations",
            "Possible inflated self-assessment or dishonesty about never failing",
            "Fixed mindset: 'work harder' instead of 'work smarter' or adapt"
          ],
          redFlags: [
            "INCONSISTENCY: Claims to value feedback but never receives it",
            "RISK AVOIDANCE: Never failed suggests avoiding challenging situations",
            "CONFLICT AVOIDANCE: Explicit strategy to avoid difficult people",
            "FIXED MINDSET: No evidence of growth or learning orientation"
          ],
          recommendation: "STRONG_REJECT",
          reasoning: "Multiple serious red flags. Claim of never failing is either dishonest or indicates extreme risk avoidance - both incompatible with innovation. Conflict avoidance explicit. Fixed mindset contradicts inVision's growth-oriented culture. Inconsistency in feedback attitude suggests lack of self-awareness."
        }, null, 2)
      }
    ]
  }
];

// ============================================================================
// FINE-TUNING UTILITIES
// ============================================================================

/**
 * Generate complete fine-tuning dataset
 */
export function generateFineTuningDataset(): string {
  return trainingExamples.map(ex => JSON.stringify(ex)).join('\n');
}

/**
 * Save dataset to file for upload to OpenAI
 */
export function saveDatasetToFile(): { filename: string; content: string; lineCount: number } {
  const content = generateFineTuningDataset();
  const lineCount = content.split('\n').filter(line => line.trim()).length;
  
  return {
    filename: `invisionu-training-${Date.now()}.jsonl`,
    content,
    lineCount
  };
}

/**
 * Add custom training example
 */
export function addTrainingExample(
  interviewResponses: string,
  evaluationResult: object
): void {
  trainingExamples.push({
    messages: [
      { role: "system", content: INVISU_SYSTEM_PROMPT },
      { role: "user", content: interviewResponses },
      { role: "assistant", content: JSON.stringify(evaluationResult, null, 2) }
    ]
  });
}

/**
 * Validate training data format
 */
export function validateTrainingData(examples: FineTuningExample[]): {
  valid: boolean;
  errors: string[];
  stats: { total: number; validMessages: number; invalidMessages: number };
} {
  const errors: string[] = [];
  let validMessages = 0;
  let invalidMessages = 0;

  examples.forEach((ex, idx) => {
    if (!ex.messages || !Array.isArray(ex.messages)) {
      errors.push(`Example ${idx}: Missing or invalid messages array`);
      invalidMessages++;
      return;
    }

    // Must have system, user, assistant
    const roles = ex.messages.map(m => m.role);
    if (!roles.includes('system')) {
      errors.push(`Example ${idx}: Missing system message`);
    }
    if (!roles.includes('user')) {
      errors.push(`Example ${idx}: Missing user message`);
    }
    if (!roles.includes('assistant')) {
      errors.push(`Example ${idx}: Missing assistant message`);
    }

    // Check content lengths
    ex.messages.forEach((msg, msgIdx) => {
      if (!msg.content || msg.content.length < 10) {
        errors.push(`Example ${idx}, message ${msgIdx}: Content too short`);
      }
    });

    if (errors.filter(e => e.startsWith(`Example ${idx}`)).length === 0) {
      validMessages++;
    } else {
      invalidMessages++;
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      total: examples.length,
      validMessages,
      invalidMessages
    }
  };
}

// ============================================================================
// FINE-TUNED MODEL USAGE (after training)
// ============================================================================

export interface FineTunedEvaluationRequest {
  candidateResponses: string[];
  questions: string[];
  model?: string; // Default: ft:gpt-4o-2024-08-06:your-org:invisionu-evaluator
}

export interface FineTunedEvaluationResult {
  dimensionScores: {
    leadership_potential: { score: number; evidence: string };
    change_agent_mindset: { score: number; evidence: string };
    adaptability: { score: number; evidence: string };
    collaboration: { score: number; evidence: string };
    authenticity: { score: number; evidence: string };
  };
  overallFit: number;
  strengths: string[];
  growthAreas: string[];
  redFlags: string[];
  recommendation: "STRONG_ACCEPT" | "ACCEPT" | "WAITLIST" | "REJECT" | "STRONG_REJECT";
  reasoning: string;
  confidence: number; // Model confidence in evaluation
}

/**
 * Evaluate candidate using fine-tuned model
 * Note: This requires uploading training data and creating fine-tune job first
 */
export async function evaluateWithFineTunedModel(
  request: FineTunedEvaluationRequest
): Promise<FineTunedEvaluationResult> {
  
  // Format interview as training example
  const interviewText = request.candidateResponses.map((response, idx) => 
    `Q: "${request.questions[idx]}"\nA: "${response}"`
  ).join('\n\n');

  const userPrompt = `Interview Response:\n${interviewText}\n\nAssessment Request: Evaluate this candidate for inVision U "agent of change" program.`;

  // Use fine-tuned model if available, otherwise use base GPT-4o with system prompt
  const model = request.model || "gpt-4o";
  
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: INVISU_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature for consistency
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from model");
    }

    const result = JSON.parse(content) as FineTunedEvaluationResult;
    
    // Add confidence based on logprobs if available
    result.confidence = calculateConfidence();
    
    return result;
  } catch (error) {
    console.error("Fine-tuned evaluation error:", error);
    throw error;
  }
}

function calculateConfidence(): number {
  // Simplified confidence calculation
  // In production, analyze logprobs from response
  return 0.85; // Placeholder
}

// ============================================================================
// UPLOAD & TRAINING WORKFLOW (CLI commands)
// ============================================================================

export const trainingWorkflow = `
# OpenAI Fine-Tuning Workflow for inVision U

## 1. Prepare Training Data
\`\`\`typescript
import { saveDatasetToFile } from './fine-tuning';
const dataset = saveDatasetToFile();
// Save dataset.content to file
\`\`\`

## 2. Upload to OpenAI
\`\`\`bash
# Using OpenAI CLI
curl https://api.openai.com/v1/files \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F purpose="fine-tune" \
  -F file="@invisionu-training.jsonl"
\`\`\`

## 3. Create Fine-Tune Job
\`\`\`bash
curl https://api.openai.com/v1/fine_tuning/jobs \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "training_file": "file-xxxxxxxx",
    "model": "gpt-4o-2024-08-06",
    "suffix": "invisionu-evaluator"
  }'
\`\`\`

## 4. Wait for Training (check status)
\`\`\`bash
curl https://api.openai.com/v1/fine_tuning/jobs/ftjob-xxxxxxxx \
  -H "Authorization: Bearer $OPENAI_API_KEY"
\`\`\`

## 5. Use Fine-Tuned Model
\`\`\`typescript
const result = await evaluateWithFineTunedModel({
  candidateResponses: [...],
  questions: [...],
  model: "ft:gpt-4o-2024-08-06:your-org:invisionu-evaluator"
});
\`\`\`

Expected training time: 30-60 minutes for 100 examples
Cost: ~$0.80-1.20 per 1K tokens (training + usage)
`;
