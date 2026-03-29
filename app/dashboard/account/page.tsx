import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { envFlags } from "@/lib/env";
import { getCommitteeAccountOverview } from "@/lib/server/account-store";
import { backendFetch } from "@/lib/server/backend-client";
import {
  AUTH_EMAIL_COOKIE,
  AUTH_ENTITY_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  parseAuthSession,
} from "@/lib/server/auth";

export default async function CommitteeAccountPage() {
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (!session || session.role !== "committee") {
    redirect("/sign-in");
  }

  let backendOverview:
    | {
        name: string;
        email?: string | null;
        assignedVotes: number;
        approvedVotes: number;
        pendingCases: number;
      }
    | null = null;

  if (envFlags.backend) {
    try {
      const [accountData, rankingData] = await Promise.all([
        backendFetch<{
          account: { name: string; email?: string | null; entity_id: string };
        }>("/api/v1/auth/me", undefined, session.sessionId),
        backendFetch<{
          candidates: Array<{
            candidate: { status: string };
            votes: Array<{ member_id: string; decision: "approve" | "hold" | "reject" }>;
          }>;
        }>("/api/v1/candidates", undefined, session.sessionId),
      ]);

      const memberId = session.entityId ?? accountData.account.entity_id;
      const allVotes = rankingData.candidates.flatMap((item) => item.votes);
      const assignedVotes = allVotes.filter((vote) => vote.member_id === memberId).length;
      const approvedVotes = allVotes.filter((vote) => vote.member_id === memberId && vote.decision === "approve").length;
      const pendingCases = rankingData.candidates.filter((item) =>
        ["in_progress", "completed", "flagged"].includes(item.candidate.status),
      ).length;
      backendOverview = {
        name: accountData.account.name,
        email: accountData.account.email,
        assignedVotes,
        approvedVotes,
        pendingCases,
      };
    } catch {
      redirect("/sign-in");
    }
  }

  if (backendOverview) {
    return (
      <div className="space-y-8">
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Committee cabinet</p>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">{backendOverview.name}</h2>
            <p className="mt-2 text-sm text-text-secondary">{backendOverview.email}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="panel-soft p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Saved votes</p>
            <p className="mt-3 text-3xl font-black text-white">{backendOverview.assignedVotes}</p>
          </div>
          <div className="panel-soft p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Approve votes</p>
            <p className="mt-3 text-3xl font-black text-brand-green">{backendOverview.approvedVotes}</p>
          </div>
          <div className="panel-soft p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Pending cases</p>
            <p className="mt-3 text-3xl font-black text-white">{backendOverview.pendingCases}</p>
          </div>
        </section>
      </div>
    );
  }

  const overview = await getCommitteeAccountOverview(session.sessionId);
  if (!overview) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Committee cabinet</p>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">{overview.account.name}</h2>
          <p className="mt-2 text-sm text-text-secondary">{overview.account.email}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel-soft p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Saved votes</p>
          <p className="mt-3 text-3xl font-black text-white">{overview.assignedVotes}</p>
        </div>
        <div className="panel-soft p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Approve votes</p>
          <p className="mt-3 text-3xl font-black text-brand-green">{overview.approvedVotes}</p>
        </div>
        <div className="panel-soft p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Pending cases</p>
          <p className="mt-3 text-3xl font-black text-white">{overview.pendingCases}</p>
        </div>
      </section>
    </div>
  );
}
