// Serverless store using globalThis
import { randomUUID } from 'crypto';

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

interface Store {
  accounts: AuthAccount[];
  candidates: Candidate[];
  interviewSessions: InterviewSession[];
  committeeMembers: CommitteeMember[];
  _initialized: boolean;
}

// Use globalThis for cross-request persistence
function getStore(): Store {
  const g = globalThis as any;
  if (!g.__INSIGHTU_STORE__) {
    g.__INSIGHTU_STORE__ = {
      accounts: [],
      candidates: [],
      interviewSessions: [],
      committeeMembers: [],
      _initialized: false,
    };
  }
  return g.__INSIGHTU_STORE__;
}

// Initialize test data
function init() {
  const s = getStore();
  if (s._initialized) return;
  
  const testCandidateId = 'cand-test001';
  const testAccountId = 'acct-test001';
  
  s.accounts.push({
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

  s.candidates.push({
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
  
  s._initialized = true;
}

init();

// Account operations
export async function findAccountById(id: string) {
  return getStore().accounts.find(a => a.id === id) || null;
}

export async function findAccountForLogin(role: 'candidate' | 'committee', identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  return getStore().accounts.find(a => {
    if (a.role !== role) return false;
    if (role === 'candidate') {
      return (a.phone?.toLowerCase() === normalized) || (a.email?.toLowerCase() === normalized);
    }
    return a.email?.toLowerCase() === normalized;
  }) || null;
}

export async function saveAccount(account: AuthAccount) {
  const s = getStore();
  const idx = s.accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) s.accounts[idx] = account;
  else s.accounts.push(account);
  return account;
}

// Candidate operations
export async function registerCandidateProfile(input: { authSessionId: string; name: string; email?: string; phone?: string }) {
  const s = getStore();
  const candidateId = `cand-${randomUUID().slice(0, 8)}`;
  const code = `IU-${String(s.candidates.length + 2401).padStart(4, '0')}`;
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
  
  s.candidates.push(candidate);
  
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
  
  s.interviewSessions.push(session);
  
  return { candidateId, sessionId: session.id };
}

export async function getPersistedCandidate(id: string) {
  return getStore().candidates.find(c => c.id === id) || null;
}

export async function getPersistedCandidates() {
  return getStore().candidates;
}

export async function getPersistedSessionByAuthSession(authSessionId: string) {
  return getStore().interviewSessions.find(s => s.accountId === authSessionId) || null;
}

// Committee operations
export async function registerCommitteeMember(input: { name: string; email: string }) {
  const s = getStore();
  const existing = s.committeeMembers.find(m => m.email.toLowerCase() === input.email.toLowerCase());
  if (existing) return existing;
  
  const member: CommitteeMember = {
    id: `cm-${randomUUID().slice(0, 8)}`,
    name: input.name,
    email: input.email,
    createdAt: new Date().toISOString(),
  };
  
  s.committeeMembers.push(member);
  return member;
}
