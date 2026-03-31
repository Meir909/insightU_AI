import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCandidateStats, getCommitteeStats, getAuditLogs } from "@/lib/server/prisma";
import { getAllCandidates } from "@/lib/server/prisma";

// This page is LOCAL ONLY — blocked in production unless ADMIN_SECRET matches
async function checkLocalAccess() {
  const hdrs = await headers();
  const host = hdrs.get("host") || "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (!isLocal) {
    redirect("/");
  }
}

export default async function AdminPage() {
  await checkLocalAccess();

  const [stats, committeeStats, recentLogs, allCandidates] = await Promise.all([
    getCandidateStats().catch(() => null),
    getCommitteeStats().catch(() => []),
    getAuditLogs().catch(() => []),
    getAllCandidates().catch(() => []),
  ]);

  const recentLogsTyped = recentLogs as Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    actorName?: string | null;
    actorType: string;
    ipAddress?: string | null;
    createdAt: Date;
  }>;

  const flaggedCandidates = allCandidates.filter((c) => c.status === "flagged");
  // Low confidence (<50) means model is unsure — needs manual review
  const lowConfidenceCandidates = allCandidates.filter(
    (c) => c.evaluations[0]?.confidence != null && c.evaluations[0].confidence < 50,
  );

  return (
    <div className="min-h-screen bg-[#0C0C0C] text-white p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C8F000]">
              LOCAL ADMIN — InsightU AI
            </span>
            <span className="text-xs text-[#555] bg-[#1C1C1C] px-2 py-0.5 rounded">
              localhost only
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Панель наблюдения</h1>
          <p className="text-xs text-[#555] mt-1">Эта страница доступна только на localhost. В продакшне — редирект на /.</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">Кандидаты</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Всего", value: stats.total, color: "#C8F000" },
                { label: "Шорт-лист", value: stats.shortlisted, color: "#C8F000" },
                { label: "Отклонено", value: stats.rejected, color: "#E53935" },
                { label: "Средний скор", value: stats.averageScore?.toFixed(1) ?? "—", color: "#F5A623" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#141414] border border-white/5 rounded-xl p-4">
                  <p className="text-[10px] text-[#555] uppercase tracking-widest">{label}</p>
                  <p className="text-3xl font-black mt-1" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* By status */}
            <div className="mt-3 bg-[#141414] border border-white/5 rounded-xl p-4">
              <p className="text-[10px] text-[#555] uppercase tracking-widest mb-3">По статусам</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <span className="text-xs text-[#A0A0A0]">{status}</span>
                    <span className="text-xs font-bold text-[#C8F000] font-mono">{String(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Low Confidence Alerts */}
        {lowConfidenceCandidates.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#BF5AF2] mb-3">
              Низкая уверенность модели &lt;50% ({lowConfidenceCandidates.length})
            </h2>
            <div className="bg-[#141414] border border-[#BF5AF2]/20 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-2 text-[#555]">ID</th>
                    <th className="text-left px-4 py-2 text-[#555]">Имя</th>
                    <th className="text-left px-4 py-2 text-[#555]">Уверенность</th>
                    <th className="text-left px-4 py-2 text-[#555]">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {lowConfidenceCandidates.map((c) => (
                    <tr key={c.id} className="border-b border-white/3">
                      <td className="px-4 py-2 text-[#555]">{c.id.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-white">{c.fullName}</td>
                      <td className="px-4 py-2 font-bold text-[#BF5AF2]">
                        {c.evaluations[0]?.confidence ?? "—"}%
                      </td>
                      <td className="px-4 py-2 text-[#A0A0A0]">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Flagged Candidates */}
        {flaggedCandidates.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#FF6B35] mb-3">
              Флаги ({flaggedCandidates.length})
            </h2>
            <div className="bg-[#141414] border border-[#FF6B35]/20 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-2 text-[#555]">Имя</th>
                    <th className="text-left px-4 py-2 text-[#555]">Email</th>
                    <th className="text-left px-4 py-2 text-[#555]">Скор</th>
                    <th className="text-left px-4 py-2 text-[#555]">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedCandidates.map((c) => (
                    <tr key={c.id} className="border-b border-white/3">
                      <td className="px-4 py-2 text-white">{c.fullName}</td>
                      <td className="px-4 py-2 text-[#A0A0A0]">{c.email}</td>
                      <td className="px-4 py-2 font-bold text-[#FF6B35]">
                        {c.overallScore?.toFixed(1) ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-[#555]">
                        {new Date(c.createdAt).toLocaleDateString("ru")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Committee Stats */}
        {committeeStats.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">
              Члены комиссии ({committeeStats.length})
            </h2>
            <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-2 text-[#555]">Имя</th>
                    <th className="text-left px-4 py-2 text-[#555]">Email</th>
                    <th className="text-left px-4 py-2 text-[#555]">Голосов</th>
                    <th className="text-left px-4 py-2 text-[#555]">Одобрено</th>
                    <th className="text-left px-4 py-2 text-[#555]">Отклонено</th>
                  </tr>
                </thead>
                <tbody>
                  {committeeStats.map((m) => {
                    const approved = m.votes.filter((v) => v.decision === "approved").length;
                    const rejected = m.votes.filter((v) => v.decision === "rejected").length;
                    return (
                      <tr key={m.id} className="border-b border-white/3">
                        <td className="px-4 py-2 text-white">{m.name}</td>
                        <td className="px-4 py-2 text-[#A0A0A0]">{m.email}</td>
                        <td className="px-4 py-2 font-bold text-[#C8F000]">{m._count.votes}</td>
                        <td className="px-4 py-2 text-[#C8F000]">{approved}</td>
                        <td className="px-4 py-2 text-[#E53935]">{rejected}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Audit Log */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">
            Последние события audit log
          </h2>
          <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2 text-[#555]">Действие</th>
                  <th className="text-left px-4 py-2 text-[#555]">Актор</th>
                  <th className="text-left px-4 py-2 text-[#555]">Тип</th>
                  <th className="text-left px-4 py-2 text-[#555]">IP</th>
                  <th className="text-left px-4 py-2 text-[#555]">Время</th>
                </tr>
              </thead>
              <tbody>
                {recentLogsTyped.slice(0, 30).map((log) => (
                  <tr key={log.id} className="border-b border-white/3">
                    <td className="px-4 py-2 font-bold text-[#C8F000]">{log.action}</td>
                    <td className="px-4 py-2 text-[#A0A0A0]">{log.actorName ?? "—"}</td>
                    <td className="px-4 py-2 text-[#555]">{log.actorType}</td>
                    <td className="px-4 py-2 text-[#555]">{log.ipAddress ?? "—"}</td>
                    <td className="px-4 py-2 text-[#555]">
                      {new Date(log.createdAt).toLocaleString("ru")}
                    </td>
                  </tr>
                ))}
                {recentLogsTyped.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-[#555]">Нет записей</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
