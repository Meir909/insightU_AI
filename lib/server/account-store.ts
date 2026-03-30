import { randomUUID } from "crypto";
import { envFlags } from "@/lib/env";
import {
  findAccountById,
  findAccountForLogin,
  getPersistedCandidate,
  getPersistedSessionByAuthSession,
  registerCandidateProfile,
  registerCommitteeMember,
  saveAccount,
} from "@/lib/server/simple-store";
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

type CandidateOverview = {
  account: AuthAccount;
  candidate: any;
  session: any;
};

type CommitteeOverview = {
  account: AuthAccount;
  assignedVotes: number;
  approvedVotes: number;
  pendingCases: number;
};

export { findAccountById, findAccountForLogin };

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

  return {
    account,
    assignedVotes: 0,
    approvedVotes: 0,
    pendingCases: 0,
  };
}
