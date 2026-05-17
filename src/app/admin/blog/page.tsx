import Link from "next/link";
import { getAdminStats, listTutorials } from "@/lib/db/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminBlogDashboard() {
  const stats = await getAdminStats();
  const latestPublished = await listTutorials("published", 5);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(stats.by_status).map(([status, n]) => (
          <div key={status} className="rounded-lg border border-[color:var(--border)] p-4">
            <div className="text-xs text-[color:var(--muted)] uppercase">{status}</div>
            <div className="text-2xl font-bold">{n}</div>
          </div>
        ))}
        <div className="rounded-lg border border-[color:var(--border)] p-4 bg-[color:var(--border)]">
          <div className="text-xs text-[color:var(--muted)] uppercase">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border border-[color:var(--border)] p-4">
          <h2 className="font-bold mb-3">Top categorías (published)</h2>
          <ul className="space-y-1 text-sm">
            {stats.by_category.length === 0 && (
              <li className="text-[color:var(--muted)]">Sin published aún.</li>
            )}
            {stats.by_category.map((c) => (
              <li key={c.category} className="flex justify-between">
                <span>{c.category}</span>
                <span className="font-mono">{c.n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-[color:var(--border)] p-4">
          <h2 className="font-bold mb-3">Volumen por source</h2>
          <ul className="space-y-1 text-sm">
            {stats.by_source.slice(0, 8).map((s) => (
              <li key={s.source_id} className="flex justify-between">
                <span>{s.source_id}</span>
                <span className="font-mono">{s.n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-[color:var(--border)] p-4">
        <h2 className="font-bold mb-3">Últimos publicados</h2>
        <ul className="space-y-2 text-sm">
          {latestPublished.length === 0 && (
            <li className="text-[color:var(--muted)]">Sin publicados aún.</li>
          )}
          {latestPublished.map((t) => (
            <li key={t.id}>
              <Link
                href={`/blog/${t.slug}`}
                className="hover:underline"
                target="_blank"
              >
                {t.title}
              </Link>{" "}
              <span className="text-xs text-[color:var(--muted)]">
                (cs={t.combined_score?.toFixed(2)} · {t.category})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
