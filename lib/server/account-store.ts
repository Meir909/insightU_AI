import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { envFlags } from "@/lib/env";
import {
  getPersistedCandidate,
  getPersistedCandidates,
  getPersistedSessionByAuthSession,
  registerCandidateProfile,
  registerCommitteeMember,
} from "@/lib/server/persistent-store";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import type { AuthRole } from "@/lib/server/auth";

export type AuthAccount = {
  id: string;
  role: AuthRole;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  entityId: string;
  createdAt: string;
  updatedAt: string;
};

type StoredAccounts = {
  accounts: AuthAccount[];
};

type CandidateOverview = {
  account: AuthAccount;
  candidate: Awaited<ReturnType<typeof getPersistedCandidate>>;
  session: Awaited<ReturnType<typeof getPersistedSessionByAuthSession>>;
};

type CommitteeOverview = {
  account: AuthAccount;
  assignedVotes: number;
  approvedVotes: number;
  pendingCases: number;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const ACCOUNTS_PATH = path.join(DATA_DIR, "accounts.json");

async function ensureAccountsDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readLocalAccounts(): Promise<StoredAccounts> {
  await ensureAccountsDir();

  try {
    const raw = await readFile(ACCOUNTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoredAccounts;
    return { accounts: parsed.accounts ?? [] };
  } catch {
    const base = { accounts: [] };
    await writeFile(ACCOUNTS_PATH, JSON.stringify(base, null, 2), "utf8");
    return base;
  }
}

async function writeLocalAccounts(data: StoredAccounts) {
  await ensureAccountsDir();
  await writeFile(ACCOUNTS_PATH, JSON.stringify(data, null, 2), "utf8");
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

async function getAllAccounts(): Promise<AuthAccount[]> {
  if (!envFlags.supabase) {
    const local = await readLocalAccounts();
    return local.accounts;
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("auth_accounts").select("*");
  return ((data as Array<Record<string, string>> | null) ?? []).map((row) => ({
    id: row.id,
    role: row.role as AuthRole,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    passwordHash: row.password_hash,
    entityId: row.entity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function saveAccount(account: AuthAccount) {
  if (!envFlags.supabase) {
    const local = await readLocalAccounts();
    local.accounts.push(account);
    await writeLocalAccounts(local);
    return account;
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("auth_accounts").insert({
    id: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
    phone: account.phone,
    password_hash: account.passwordHash,
    entity_id: account.entityId,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  });

  return account;
}

export async function findAccountById(id: string) {
  const accounts = await getAllAccounts();
  return accounts.find((account) => account.id === id) ?? null;
}

export async function findAccountForLogin(role: AuthRole, identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  const accounts = await getAllAccounts();

  return (
    accounts.find((account) => {
      if (account.role !== role) return false;
      if (role === "candidate") {
        return (
          normalizeIdentifier(account.phone || "") === normalized ||
          normalizeIdentifier(account.email || "") === normalized
        );
      }

      return normalizeIdentifier(account.email || "") === normalized;
    }) ?? null
  );
}

export async function registerCandidateAccount(input: {
  name: string;
  email?: string;
  phone: string;
  passwordHash: string;
}) {
  const existing = await findAccountForLogin("candidate", input.phone);
  if (existing) {
    throw new Error("Candidate account already exists");
  }

  if (input.email) {
    const existingEmail = await findAccountForLogin("candidate", input.email);
    if (existingEmail) {
      throw new Error("Candidate account already exists");
    }
  }

  const accountId = `acct-${randomUUID().slice(0, 10)}`;
  const entity = await registerCandidateProfile({
    authSessionId: accountId,
    name: input.name,
    email: input.email,
    phone: input.phone,
  });

  return saveAccount({
    id: accountId,
    role: "candidate",
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: input.passwordHash,
    entityId: entity.candidateId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function registerCommitteeAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const existing = await findAccountForLogin("committee", input.email);
  if (existing) {
    throw new Error("Committee account already exists");
  }

  const member = await registerCommitteeMember({
    name: input.name,
    email: input.email,
  });

  return saveAccount({
    id: `acct-${randomUUID().slice(0, 10)}`,
    role: "committee",
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    entityId: member.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function getCandidateAccountOverview(accountId: string): Promise<CandidateOverview | null> {
  const account = await findAccountById(accountId);
  if (!account || account.role !== "candidate") return null;

  const [candidate, session] = await Promise.all([
    getPersistedCandidate(account.entityId),
    getPersistedSessionByAuthSession(account.id),
  ]);

  return {
    account,
    candidate,
    session,
  };
}

export async function getCommitteeAccountOverview(accountId: string): Promise<CommitteeOverview | null> {
  const account = await findAccountById(accountId);
  if (!account || account.role !== "committee") return null;

  const candidates = await getPersistedCandidates();
  const votes = candidates.flatMap((candidate) => candidate.committee_review?.votes ?? []);
  const assignedVotes = votes.filter((vote) => vote.memberId === account.entityId).length;
  const approvedVotes = votes.filter((vote) => vote.memberId === account.entityId && vote.decision === "approve").length;
  const pendingCases = candidates.filter((candidate) => candidate.committee_review?.finalDecision === "pending").length;

  return {
    account,
    assignedVotes,
    approvedVotes,
    pendingCases,
  };
}
