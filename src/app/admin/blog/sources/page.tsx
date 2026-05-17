import { listSources } from "@/lib/db/admin-queries";
import { toggleSourceActive } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminSources() {
  const sources = await listSources();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📰 Sources</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[color:var(--muted)]">
            <tr>
              <th className="px-2 py-2">Active</th>
              <th className="px-2 py-2">Tier</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Parser</th>
              <th className="px-2 py-2">Last poll</th>
              <th className="px-2 py-2">Fails</th>
              <th className="px-2 py-2">Pub/Total</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-t border-[color:var(--border)]">
                <td className="px-2 py-2">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${s.is_active ? "bg-green-500" : "bg-gray-400"}`}
                    title={s.is_active ? "Active" : "Inactive"}
                  />
                </td>
                <td className="px-2 py-2 font-mono">T{s.tier}</td>
                <td className="px-2 py-2">{s.name}</td>
                <td className="px-2 py-2 text-xs">{s.parser_id}</td>
                <td className="px-2 py-2 text-xs">{s.last_polled_at?.slice(0, 16) || "nunca"}</td>
                <td className="px-2 py-2 font-mono text-xs">
                  {s.consecutive_failures > 0 ? `⚠ ${s.consecutive_failures}` : "—"}
                </td>
                <td className="px-2 py-2 font-mono text-xs">
                  {s.tutorials_published} / {s.tutorials_total}
                </td>
                <td className="px-2 py-2">
                  <form
                    action={async () => {
                      "use server";
                      await toggleSourceActive(s.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 border border-[color:var(--border)] rounded hover:bg-[color:var(--border)]"
                    >
                      {s.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
