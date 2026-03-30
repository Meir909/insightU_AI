// Serverless-compatible store using globalThis for cross-request persistence
import { randomUUID } from 'crypto';

// Use globalThis to persist data across requests in serverless environment
const getStore = () => {
  if (!(globalThis as any).__INSIGHTU_STORE__) {
    (globalThis as any).__INSIGHTU_STORE__ = {
      accounts: [] as AuthAccount[],
      authSessions: [] as AuthSession[],
      candidates: [] as Candidate[],
      interviewSessions: [] as InterviewSession[],
      committeeMembers: [] as CommitteeMember[],
      committeeVotes: {} as Record<string, CommitteeVote[]>,
      _initialized: false,
    };
  }
  return (globalThis as any).__INSIGHTU_STORE__;
};

// Initialize test data once
function initializeTestData() {
  const store = getStore();
  if (store._initialized) return;
  
  const testCandidateId = 'cand-test001';
  const testAccountId = 'acct-test001';
  
  store.accounts.push({
    id: testAccountId,
    role: 'candidate',
    name: 'Test Candidate',
    email: 'test@example.com',
    phone: '+77001234567',
    passwordHash: 'salt:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    entityId: testCandidateId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  store.candidates.push({
    id: testCandidateId,
    code: 'IU-2401',
    name: 'Test Candidate',
    email: 'test@example.com',
    phone: '+77001234567',
    city: 'Almaty',
    program: 'inVision U Applicant',
    goals: 'Learn and grow',
    experience: 'Some experience',
    motivationText: 'Motivated',
    essayExcerpt: 'Essay text',
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  store._initialized = true;
}

// Initialize on module load
initializeTestData();

export function getGlobalStore() {
  return getStore();
}

export interface AuthAccount {
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
  messages: any[];
  artifacts: any[];
  progress: number;
  status: 'active' | 'completed';
  phase: string;
  scoreUpdate?: any;
  createdAt: string;
  updatedAt: string;
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

export function getStore() {
  return globalStore;
}

export async function loadStore() {
  return globalStore;
}

export async function saveStore() {
  return;
}

export async function updateStore(updater: (state: typeof globalStore) => void) {
  updater(globalStore);
}

// Account operations
export async function findAccountById(id: string) {
  return globalStore.accounts.find(a => a.id === id) || null;
}

export async function findAccountForLogin(role: 'candidate' | 'committee', identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  return globalStore.accounts.find(a => {
    if (a.role !== role) return false;
    if (role === 'candidate') {
      return (a.phone?.toLowerCase() === normalized) || (a.email?.toLowerCase() === normalized);
    }
    return a.email?.toLowerCase() === normalized;
  }) || null;
}

export async function saveAccount(account: AuthAccount) {
  const existing = globalStore.accounts.findIndex(a => a.id === account.id);
  if (existing >= 0) {
    globalStore.accounts[existing] = account;
  } else {
    globalStore.accounts.push(account);
  }
  return account;
}

// Candidate operations
export async function registerCandidateProfile(input: { authSessionId: string; name: string; email?: string; phone?: string }) {
  const candidateId = `cand-${randomUUID().slice(0, 8)}`;
  const code = `IU-${String(globalStore.candidates.length + 2401).padStart(4, '0')}`;
  const now = new Date().toISOString();
  
  const candidate: Candidate = {
    id: candidateId,
    code,
    name: input.name,
    email: input.email,
    phone: input.phone,
    city: 'Unspecified',
    program: 'inVision U Applicant',
    goals: 'To be collected during the interview.',
    experience: 'To be collected during the interview.',
    motivationText: 'To be collected during the interview.',
    essayExcerpt: 'To be collected during the interview.',
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
  };
  
  globalStore.candidates.push(candidate);
  
  const session: InterviewSession = {
    id: `eval-${randomUUID().slice(0, 10)}`,
    candidateId,
    accountId: input.authSessionId,
    messages: [],
    artifacts: [],
    progress: 12,
    status: 'active',
    phase: 'Foundation',
    createdAt: now,
    updatedAt: now,
  };
  
  globalStore.interviewSessions.push(session);
  
  return { candidateId, sessionId: session.id };
}

export async function getPersistedCandidate(id: string) {
  return globalStore.candidates.find(c => c.id === id) || null;
}

export async function getPersistedCandidates() {
  return globalStore.candidates;
}

export async function getPersistedSessionByAuthSession(authSessionId: string) {
  return globalStore.interviewSessions.find(s => s.accountId === authSessionId) || null;
}

// Committee operations
export async function registerCommitteeMember(input: { name: string; email: string }) {
  const existing = globalStore.committeeMembers.find(m => m.email.toLowerCase() === input.email.toLowerCase());
  if (existing) return existing;
  
  const member: CommitteeMember = {
    id: `cm-${randomUUID().slice(0, 8)}`,
    name: input.name,
    email: input.email,
    createdAt: new Date().toISOString(),
  };
  
  globalStore.committeeMembers.push(member);
  return member;
}
