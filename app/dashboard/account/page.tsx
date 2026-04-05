import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCommitteeAccountOverview } from "@/lib/server/account-store";
import {
  AUTH_EMAIL_COOKIE,
  AUTH_ENTITY_COOKIE,
  AUTH_NAME_COOKIE,
  AUTH_PHONE_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
  hasBackofficeAccess,
  parseAuthSession,
} from "@/lib/server/auth";

export default async function BackofficeAccountPage() {
  const cookieStore = await cookies();
  const session = parseAuthSession({
    sessionId: cookieStore.get(AUTH_SESSION_COOKIE)?.value,
    role: cookieStore.get(AUTH_ROLE_COOKIE)?.value,
    name: cookieStore.get(AUTH_NAME_COOKIE)?.value,
    email: cookieStore.get(AUTH_EMAIL_COOKIE)?.value,
    phone: cookieStore.get(AUTH_PHONE_COOKIE)?.value,
    entityId: cookieStore.get(AUTH_ENTITY_COOKIE)?.value,
  });

  if (!session || !hasBackofficeAccess(session.role)) {
    redirect("/sign-in");
  }

  const overview = await getCommitteeAccountOverview(session.sessionId);
  if (!overview) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">Личный кабинет</p>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">{overview.account.name}</h2>
          <p className="mt-1 text-sm text-text-secondary">{overview.account.email}</p>
          <p className="mt-1 inline-flex items-center rounded-full border border-brand-green/20 bg-brand-green/8 px-3 py-1 text-xs font-semibold text-brand-green">Член комиссии</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel-soft p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Всего голосов</p>
          <p className="mt-3 text-3xl font-black text-white">{overview.assignedVotes}</p>
        </div>
        <div className="panel-soft p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Одобрено</p>
          <p className="mt-3 text-3xl font-black text-brand-green">{overview.approvedVotes}</p>
        </div>
        <div className="panel-soft p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Ожидают решения</p>
          <p className="mt-3 text-3xl font-black text-white">{overview.pendingCases}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-brand-green/20 bg-brand-green/6 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold text-white">Техподдержка комиссии</p>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              Если нужен доступ, есть вопросы по голосованию, shortlist или audit trail, напишите в техподдержку с
              рабочего email комиссии.
            </p>
          </div>
          <a
            href={`mailto:nurmiko22@gmail.com?subject=${encodeURIComponent(`Поддержка комиссии ${overview.account.email ?? overview.account.name}`)}`}
            className="shrink-0 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green transition hover:bg-brand-green/15"
          >
            Написать в поддержку
          </a>
        </div>
      </section>
    </div>
  );
}
