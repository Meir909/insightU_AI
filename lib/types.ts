export type CandidateStatus =
  | "in_progress"
  | "completed"
  | "shortlisted"
  | "rejected"
  | "flagged";

export type ArtifactKind = "text" | "audio" | "video" | "document";
export type ChatRole = "assistant" | "user";
export type CommitteeVoteDecision = "approve" | "hold" | "reject";

export interface CandidateArtifact {
  id: string;
  kind: ArtifactKind;
  name: string;
  mimeType: string;
  sizeKb: number;
  transcript?: string;
  extractedSignals: string[];
  evidenceWeight: number;
}

export interface ModelContribution {
  model: string;
  score: number;
  weight: number;
  rationale: string;
}

export interface ExplainabilityEvidence {
  title: string;
  summary: string;
  supports: Array<"cognitive" | "leadership" | "growth" | "decision" | "motivation" | "authenticity">;
}

export interface AdvancedExplainability {
  verdict: string;
  plainLanguage: string;
  evidence: ExplainabilityEvidence[];
  modelContributions: ModelContribution[];
  fairnessNotes: string[];
}

export interface CommitteeVote {
  memberId: string;
  memberName: string;
  decision: CommitteeVoteDecision;
  rationale: string;
  createdAt: string;
}

export interface CommitteeReview {
  requiredApprovals: number;
  votes: CommitteeVote[];
  approvedCount: number;
  rejectCount: number;
  holdCount: number;
  finalDecision: "approved" | "escalated" | "pending" | "rejected";
  corruptionGuard: string;
}

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
  artifacts?: CandidateArtifact[];
  ensemble?: ModelContribution[];
  explainability_v2?: AdvancedExplainability;
  committee_review?: CommitteeReview;
}

export interface ChatAttachment {
  id: string;
  kind: ArtifactKind;
  name: string;
  mimeType: string;
  sizeKb: number;
  status: "uploaded" | "processing" | "ready";
  transcript?: string;
  extractedSignals?: string[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
}

export interface InterviewScoreUpdate {
  cognitive: number;
  leadership: number;
  growth: number;
  decision: number;
  motivation: number;
  authenticity: number;
  final_score: number;
  confidence: number;
  ai_detection_prob: number;
  needs_manual_review: boolean;
  recommendation?: string;
  explanation?: string;
  ensemble?: ModelContribution[];
}
