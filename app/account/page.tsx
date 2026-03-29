import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GreenButton } from "@/components/ui/green-button";
import { envFlags } from "@/lib/env";
import { getCandidateAccountOverview } from "@/lib/server/account-store";
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

export default async function CandidateAccountPage() {
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (!session || session.role !== "candidate") {
    redirect("/sign-in");
  }

  let backendOverview:
    | {
        account: { name: string; email?: string | null; phone?: string | null };
        candidate: { code: string; status: string; goals: string; experience: string };
        finalScore: number;
        progress: number;
        phase: string;
      }
    | null = null;

  if (envFlags.backend) {
    try {
      const [accountData, candidateData, interviewData] = await Promise.all([
        backendFetch<{
          account: { name: string; email?: string | null; phone?: string | null };
        }>("/api/v1/auth/me", undefined, session.sessionId),
        backendFetch<{
          candidate: {
            code: string;
            status: string;
            goals: string;
            experience: string;
          };
          final_score?: number;
        }>(`/api/v1/candidates/${session.entityId}`, undefined, session.sessionId),
        backendFetch<{
          session: {
            progress: number;
            phase: string;
          };
        }>("/api/v1/interviews/me", undefined, session.sessionId),
      ]);
      backendOverview = {
        account: accountData.account,
        candidate: candidateData.candidate,
        finalScore: candidateData.final_score ?? 0,
        progress: interviewData.session.progress,
        phase: interviewData.session.phase,
      };
    } catch {
      redirect("/sign-in");
    }
  }

  if (backendOverview) {
    return (
      <div className="dot-grid min-h-screen bg-bg-base px-4 py-8 lg:px-8">
        <div className="page-shell space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Candidate cabinet</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">{backendOverview.account.name}</h1>
              <p className="mt-2 text-sm text-text-secondary">
                {backendOverview.account.phone}
                {backendOverview.account.email ? ` • ${backendOverview.account.email}` : ""}
              </p>
            </div>
            <GreenButton href="/interview">Continue interview</GreenButton>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="panel-soft p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Application status</p>
              <p className="mt-3 text-2xl font-black text-white">{backendOverview.candidate.status}</p>
              <p className="mt-2 text-sm text-text-secondary">Candidate code: {backendOverview.candidate.code}</p>
            </div>
            <div className="panel-soft p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Interview progress</p>
              <p className="mt-3 text-2xl font-black text-white">{backendOverview.progress}%</p>
              <p className="mt-2 text-sm text-text-secondary">Phase: {backendOverview.phase}</p>
            </div>
            <div className="panel-soft p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Current score</p>
              <p className="mt-3 text-2xl font-black text-brand-green">{backendOverview.finalScore.toFixed(1)}</p>
              <p className="mt-2 text-sm text-text-secondary">
                Candidate sees only progress. Final decision stays with the committee.
              </p>
            </div>
          </div>

          <div className="panel-soft p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Profile summary</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="panel-muted p-4">
                <p className="text-sm font-semibold text-white">Goals</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{backendOverview.candidate.goals}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-sm font-semibold text-white">Experience</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{backendOverview.candidate.experience}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const overview = await getCandidateAccountOverview(session.sessionId);
  if (!overview?.candidate) {
    redirect("/sign-in");
  }

  return (
    <div className="dot-grid min-h-screen bg-bg-base px-4 py-8 lg:px-8">
      <div className="page-shell space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Candidate cabinet</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">{overview.account.name}</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {overview.account.phone} {overview.account.email ? `• ${overview.account.email}` : ""}
            </p>
          </div>
          <GreenButton href="/interview">Continue interview</GreenButton>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="panel-soft p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Application status</p>
            <p className="mt-3 text-2xl font-black text-white">{overview.candidate.status}</p>
            <p className="mt-2 text-sm text-text-secondary">Candidate code: {overview.candidate.code}</p>
          </div>
          <div className="panel-soft p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Interview progress</p>
            <p className="mt-3 text-2xl font-black text-white">{overview.session?.progress ?? 0}%</p>
            <p className="mt-2 text-sm text-text-secondary">Phase: {overview.session?.phase ?? "Not started"}</p>
          </div>
          <div className="panel-soft p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Current score</p>
            <p className="mt-3 text-2xl font-black text-brand-green">{overview.candidate.final_score.toFixed(1)}</p>
            <p className="mt-2 text-sm text-text-secondary">
              Candidate sees only progress. Final decision stays with the committee.
            </p>
          </div>
        </div>

        <div className="panel-soft p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Profile summary</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="panel-muted p-4">
              <p className="text-sm font-semibold text-white">Goals</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{overview.candidate.goals}</p>
            </div>
            <div className="panel-muted p-4">
              <p className="text-sm font-semibold text-white">Experience</p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{overview.candidate.experience}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
