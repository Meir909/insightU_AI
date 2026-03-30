import { z } from 'zod';

// Role Types
export const RoleTypeSchema = z.enum(['default', 'backend_engineer', 'student_leader', 'driver', 'support']);
export type RoleType = z.infer<typeof RoleTypeSchema>;

// Dimension Score
export const DimensionScoreSchema = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  evidence: z.array(z.string()).default([]),
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

// MultiDimensional Score
export const MultiDimensionalScoreSchema = z.object({
  hard_skills: DimensionScoreSchema,
  soft_skills: DimensionScoreSchema,
  problem_solving: DimensionScoreSchema,
  communication: DimensionScoreSchema,
  adaptability: DimensionScoreSchema,
});
export type MultiDimensionalScore = z.infer<typeof MultiDimensionalScoreSchema>;

// Behavioral Signals
export const BehavioralSignalsSchema = z.object({
  confidence_level: z.number().min(0).max(1),
  hesitation_detected: z.boolean(),
  evasiveness_score: z.number().min(0).max(1),
  behavioral_flags: z.array(z.string()).default([]),
});
export type BehavioralSignals = z.infer<typeof BehavioralSignalsSchema>;

// Cross Validation
export const CrossValidationResultSchema = z.object({
  pass1_scores: z.record(z.string(), z.number()),
  pass2_scores: z.record(z.string(), z.number()),
  divergence: z.record(z.string(), z.number()),
  is_consistent: z.boolean(),
  flagged_dimensions: z.array(z.string()),
});
export type CrossValidationResult = z.infer<typeof CrossValidationResultSchema>;

// Final Score
export const FinalScoreSchema = z.object({
  candidate_id: z.string(),
  role: RoleTypeSchema,
  weighted_total: z.number().min(0).max(100),
  dimensional_scores: MultiDimensionalScoreSchema,
  behavioral_signals: BehavioralSignalsSchema,
  cross_validation: CrossValidationResultSchema,
  overall_confidence: z.number().min(0).max(1),
  needs_manual_review: z.boolean(),
  review_reasons: z.array(z.string()),
  ensemble_breakdown: z.record(z.string(), z.any()),
});
export type FinalScore = z.infer<typeof FinalScoreSchema>;

// Requests
export const MultiDimensionalRequestSchema = z.object({
  candidate_id: z.string(),
  role: RoleTypeSchema.default('default'),
  interview_transcript: z.string().min(50),
  essay_text: z.string().optional(),
  context: z.record(z.string(), z.any()).optional(),
});
export type MultiDimensionalRequest = z.infer<typeof MultiDimensionalRequestSchema>;

export const FinalScoreRequestSchema = z.object({
  candidate_id: z.string(),
  role: RoleTypeSchema.default('default'),
  interview_transcript: z.string(),
  essay_text: z.string().optional(),
  portfolio_urls: z.array(z.string()).default([]),
});
export type FinalScoreRequest = z.infer<typeof FinalScoreRequestSchema>;

// AI Detection
export const AIDetectionSignalsSchema = z.object({
  entropy_score: z.number().min(0).max(1),
  burstiness: z.number().min(0).max(1),
  lexical_diversity: z.number().min(0).max(1),
  over_structured: z.boolean(),
  unnatural_perfection: z.boolean(),
  template_phrases_found: z.array(z.string()),
  llm_verdict_probability: z.number().min(0).max(1),
});
export type AIDetectionSignals = z.infer<typeof AIDetectionSignalsSchema>;

export const AIDetectionResultSchema = z.object({
  text_id: z.string(),
  final_probability: z.number().min(0).max(1),
  verdict: z.enum(['likely_human', 'uncertain', 'likely_ai']),
  signals: AIDetectionSignalsSchema,
  used_fallback: z.boolean().default(false),
});
export type AIDetectionResult = z.infer<typeof AIDetectionResultSchema>;

export const AIDetectionRequestSchema = z.object({
  text_id: z.string(),
  text: z.string().min(50),
});
export type AIDetectionRequest = z.infer<typeof AIDetectionRequestSchema>;

// Interview Analysis
export const AnswerDepthSchema = z.enum(['shallow', 'medium', 'deep']);
export type AnswerDepth = z.infer<typeof AnswerDepthSchema>;

export const ThinkingStyleSchema = z.enum(['human_analytical', 'human_intuitive', 'human_narrative', 'ai_patterned', 'mixed']);
export type ThinkingStyle = z.infer<typeof ThinkingStyleSchema>;

export const SingleAnswerAnalysisSchema = z.object({
  question: z.string(),
  answer: z.string(),
  depth: AnswerDepthSchema,
  depth_score: z.number().min(0).max(1),
  thinking_style: ThinkingStyleSchema,
  behavioral_signals: z.record(z.string(), z.number()),
  dimensional_deltas: z.record(z.string(), z.number()),
  weak_areas: z.array(z.string()),
  strong_areas: z.array(z.string()),
});
export type SingleAnswerAnalysis = z.infer<typeof SingleAnswerAnalysisSchema>;

export const InterviewAnalysisRequestSchema = z.object({
  session_id: z.string(),
  candidate_id: z.string(),
  role: z.string().default('default'),
  question: z.string(),
  answer: z.string(),
  previous_qa: z.array(z.record(z.string(), z.string())).default([]),
  current_scores: z.record(z.string(), z.number()).optional(),
});
export type InterviewAnalysisRequest = z.infer<typeof InterviewAnalysisRequestSchema>;

export const InterviewAnalysisResponseSchema = z.object({
  session_id: z.string(),
  analysis: SingleAnswerAnalysisSchema,
  updated_scores: z.record(z.string(), z.number()),
  session_progress: z.number().min(0).max(1),
});
export type InterviewAnalysisResponse = z.infer<typeof InterviewAnalysisResponseSchema>;

// Copilot
export const FollowUpRequestSchema = z.object({
  session_id: z.string(),
  role: z.string().default('default'),
  previous_qa: z.array(z.record(z.string(), z.string())),
  weak_areas: z.array(z.string()).default([]),
  current_scores: z.record(z.string(), z.number()).optional(),
});
export type FollowUpRequest = z.infer<typeof FollowUpRequestSchema>;

export const FollowUpResponseSchema = z.object({
  session_id: z.string(),
  suggested_question: z.string(),
  target_dimension: z.string(),
  reasoning: z.string(),
  urgency: z.enum(['critical', 'recommended', 'optional']),
});
export type FollowUpResponse = z.infer<typeof FollowUpResponseSchema>;

// Committee
export const CommitteeVoteSchema = z.object({
  member_id: z.string(),
  candidate_id: z.string(),
  vote: z.enum(['approve', 'reject', 'hold']),
  score: z.number().min(0).max(100),
  justification: z.string().min(30),
});
export type CommitteeVote = z.infer<typeof CommitteeVoteSchema>;

export const BiasCheckRequestSchema = z.object({
  candidate_id: z.string(),
  votes: z.array(CommitteeVoteSchema),
});
export type BiasCheckRequest = z.infer<typeof BiasCheckRequestSchema>;

export const BiasCheckResultSchema = z.object({
  candidate_id: z.string(),
  has_anomaly: z.boolean(),
  outlier_voters: z.array(z.string()),
  z_scores: z.record(z.string(), z.number()),
  score_variance: z.number(),
  recommendation: z.string(),
  details: z.string(),
});
export type BiasCheckResult = z.infer<typeof BiasCheckResultSchema>;

// Auth
export const CandidateRegisterRequestSchema = z.object({
  role: z.literal('candidate').default('candidate'),
  name: z.string().min(2).max(80),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+7\d{10}$/),
  password: z.string().min(8).max(128),
});
export type CandidateRegisterRequest = z.infer<typeof CandidateRegisterRequestSchema>;

export const CommitteeRegisterRequestSchema = z.object({
  role: z.literal('committee').default('committee'),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  access_key: z.string().min(4),
});
export type CommitteeRegisterRequest = z.infer<typeof CommitteeRegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  role: z.enum(['candidate', 'committee']),
  identifier: z.string().min(3),
  password: z.string().min(8).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Vote
export const VoteRequestSchema = z.object({
  candidate_id: z.string().min(1),
  decision: z.enum(['approve', 'hold', 'reject']),
  rationale: z.string().min(10).max(600),
});
export type VoteRequest = z.infer<typeof VoteRequestSchema>;
