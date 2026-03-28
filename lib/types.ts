export type CandidateStatus =
  | "in_progress"
  | "completed"
  | "shortlisted"
  | "rejected"
  | "flagged";

export interface Candidate {
  id: string;
  code: string;
  name: string;
  city: string;
  program: string;
  status: CandidateStatus;
  final_score: number;
  cognitive: number;
  leadership: number;
  growth: number;
  decision: number;
  motivation: number;
  authenticity: number;
  confidence: number;
  ai_detection_prob: number;
  ai_signals: string[];
  needs_manual_review: boolean;
  reasoning: string;
  key_quotes: string[];
  goals: string;
  experience: string;
  motivation_text: string;
  essay_excerpt: string;
}
