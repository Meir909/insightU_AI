import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), '.data');
const STORE_FILE = join(DATA_DIR, 'store.json');

export interface StoreState {
  accounts: Account[];
  authSessions: AuthSession[];
  candidates: Candidate[];
  interviewSessions: InterviewSession[];
  committeeMembers: CommitteeMember[];
  committeeVotes: Record<string, CommitteeVote[]>;
}

export interface Account {
  id: string;
  role: 'candidate' | 'committee';
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  entityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  accountId: string;
  role: 'candidate' | 'committee';
  createdAt: string;
  expiresAt: string;
}

export interface Candidate {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  city: string;
  program: string;
  goals: string;
  experience: string;
  motivationText: string;
  essayExcerpt: string;
  status: 'in_progress' | 'completed' | 'shortlisted' | 'rejected' | 'flagged';
  createdAt: string;
  updatedAt: string;
}

export interface InterviewSession {
  id: string;
  candidateId: string;
  accountId: string;
  messages: ChatMessage[];
  artifacts: Artifact[];
  progress: number;
  status: 'active' | 'completed';
  phase: string;
  scoreUpdate?: ScoreSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  attachments?: Artifact[];
}

export interface Artifact {
  id: string;
  kind: 'text' | 'audio' | 'video' | 'document';
  name: string;
  mimeType: string;
  sizeKb: number;
  status: 'uploaded' | 'processing' | 'ready';
  transcript?: string;
  extractedSignals?: string[];
  storagePath?: string;
}

export interface ScoreSnapshot {
  cognitive: number;
  leadership: number;
  growth: number;
  decision: number;
  motivation: number;
  authenticity: number;
  finalScore: number;
  confidence: number;
  aiDetectionProb: number;
  needsManualReview: boolean;
  recommendation?: string;
  explanation?: string;
}

export interface CommitteeMember {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CommitteeVote {
  memberId: string;
  memberName: string;
  decision: 'approve' | 'hold' | 'reject';
  rationale: string;
  createdAt: string;
}

const defaultState: StoreState = {
  accounts: [],
  authSessions: [],
  candidates: [],
  interviewSessions: [],
  committeeMembers: [],
  committeeVotes: {},
};

export async function loadStore(): Promise<StoreState> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(STORE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { ...defaultState };
  }
}

export async function saveStore(state: StoreState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export async function updateStore(updater: (state: StoreState) => void): Promise<void> {
  const state = await loadStore();
  updater(state);
  await saveStore(state);
}
