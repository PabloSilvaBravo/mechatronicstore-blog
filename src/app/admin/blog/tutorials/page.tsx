import Link from "next/link";
import { listTutorials } from "@/lib/db/admin-queries";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ status?: string; offset?: string }>;
}

const STATUSES = ["published", "ranked", "draft", "translating", "rejected"];

export default async function AdminTutorials({ searchParams }: Props) {
  const { status, offset: offsetStr } = await searchParams;
  const offset = Math.max(0, parseInt(offsetStr || "0", 10));
  const tutorials = await listTutorials(status, 50, offset);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📚 Tutoriales</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Link
          href="/admin/blog/tutorials"
          className={`px-3 py-1 text-xs rounded border ${!status ? "bg-[color:var(--primary)] text-black" : "border-[color:var(--border)]"}`}
        >
          Todos
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/blog/tutorials?status=${s}`}
            className={`px-3 py-1 text-xs rounded border ${status === s ? "bg-[color:var(--primary)] text-black" : "border-[color:var(--border)]"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[color:var(--muted)]">
            <tr>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">CS</th>
              <th className="px-2 py-2">Cat</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Título</th>
              <th className="px-2 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tutorials.map((t) => (
              <tr key={t.id} className="border-t border-[color:var(--border)]">
                <td className="px-2 py-2 text-xs">{t.status}</td>
                <td className="px-2 py-2 font-mono text-xs">{t.combined_score?.toFixed(2) || "-"}</td>
                <td className="px-2 py-2 text-xs">{t.category || "-"}</td>
                <td className="px-2 py-2 text-xs">{t.source_id}</td>
                <td className="px-2 py-2 max-w-md truncate">{t.title}</td>
                <td className="px-2 py-2 text-xs">
                  {t.status === "published" && (
                    <Link href={`/blog/${t.slug}`} target="_blank" className="text-[color:var(--primary)] hover:underline">
                      Ver →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tutorials.length === 0 && (
          <div className="text-center py-12 text-[color:var(--muted)]">
            Sin tutoriales {status ? `con status="${status}"` : ""}.
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2 text-xs">
        {offset > 0 && (
          <Link
            href={`/admin/blog/tutorials?${new URLSearchParams({ ...(status ? { status } : {}), offset: String(Math.max(0, offset - 50)) }).toString()}`}
            className="px-3 py-1 border border-[color:var(--border)] rounded"
          >
            ← Anterior
          </Link>
        )}
        {tutorials.length === 50 && (
          <Link
            href={`/admin/blog/tutorials?${new URLSearchParams({ ...(status ? { status } : {}), offset: String(offset + 50) }).toString()}`}
            className="px-3 py-1 border border-[color:var(--border)] rounded"
          >
            Siguiente →
          </Link>
        )}
        <span className="px-3 py-1 text-[color:var(--muted)]">
          Offset {offset}–{offset + tutorials.length}
        </span>
      </div>
    </div>
  );
}
