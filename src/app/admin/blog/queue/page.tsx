import { listTutorials, type AdminTutorialRow } from "@/lib/db/admin-queries";
import { rejectTutorial, forcePublish } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminQueue() {
  const drafts = await listTutorials("draft", 50);
  const ranked = await listTutorials("ranked", 50);
  const translating = await listTutorials("translating", 50);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">⏳ Queue</h1>

      <Section
        title="📥 Drafts (esperando ranking)"
        items={drafts}
        showActions={false}
      />
      <Section
        title="✅ Ranked (esperando translation)"
        items={ranked}
        showActions={true}
      />
      <Section
        title="🔄 Translating (en proceso)"
        items={translating}
        showActions={false}
      />
    </div>
  );
}

function Section({
  title,
  items,
  showActions,
}: {
  title: string;
  items: AdminTutorialRow[];
  showActions: boolean;
}) {
  return (
    <div className="mb-8">
      <h2 className="font-bold mb-3">{title} ({items.length})</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">Vacío.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className="rounded border border-[color:var(--border)] p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{t.title}</div>
                <div className="text-xs text-[color:var(--muted)]">
                  {t.source_id} · cs={t.combined_score?.toFixed(2) || "-"} · cat={t.category || "-"}
                </div>
              </div>
              {showActions && (
                <div className="flex gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await rejectTutorial(t.id, "admin_panel");
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white"
                    >
                      Rechazar
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await forcePublish(t.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs px-3 py-1 border border-[color:var(--primary)] text-[color:var(--primary)] rounded hover:bg-[color:var(--primary)] hover:text-black"
                    >
                      Force publish
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
