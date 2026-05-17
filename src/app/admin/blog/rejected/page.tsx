import { listTutorials } from "@/lib/db/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminRejected() {
  const rejected = await listTutorials("rejected", 100);

  const groups = new Map<string, typeof rejected>();
  for (const t of rejected) {
    const reason = (t.rejected_reason || "unknown").split(":")[0];
    if (!groups.has(reason)) groups.set(reason, []);
    groups.get(reason)!.push(t);
  }
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">❌ Rejected</h1>
      <p className="text-sm text-[color:var(--muted)] mb-6">
        {rejected.length} tutoriales rechazados. Agrupados por razón para debug de filtros.
      </p>

      {sortedGroups.map(([reason, items]) => (
        <details
          key={reason}
          className="mb-3 rounded border border-[color:var(--border)]"
          open={items.length > 5}
        >
          <summary className="px-4 py-2 cursor-pointer font-semibold flex justify-between items-center">
            <span>{reason}</span>
            <span className="text-xs text-[color:var(--muted)]">{items.length}</span>
          </summary>
          <ul className="px-4 py-2 border-t border-[color:var(--border)] space-y-1 text-sm">
            {items.slice(0, 20).map((t) => (
              <li key={t.id} className="flex justify-between gap-3">
                <span className="truncate flex-1">{t.title}</span>
                <span className="text-xs text-[color:var(--muted)] whitespace-nowrap">
                  {t.source_id} · {t.rejected_reason?.slice(0, 60)}
                </span>
              </li>
            ))}
            {items.length > 20 && (
              <li className="text-xs text-[color:var(--muted)] pt-1">
                ... y {items.length - 20} más
              </li>
            )}
          </ul>
        </details>
      ))}
    </div>
  );
}
