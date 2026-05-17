import {
  topTutorialsByClicks,
  topProductsByClicks,
  clicksBySource,
  recentClicks,
} from "@/lib/db/conversion-queries";

export const dynamic = "force-dynamic";

const DAYS = 30;

export default async function AdminConversion() {
  const [topTuts, topProds, bySource, recent] = await Promise.all([
    topTutorialsByClicks(DAYS, 10),
    topProductsByClicks(DAYS, 10),
    clicksBySource(DAYS),
    recentClicks(50),
  ]);

  const totalClicks = bySource.reduce((s, r) => s + r.clicks, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">📈 Conversión</h1>
      <p className="text-sm text-[color:var(--muted)] mb-6">
        Tracking clicks tutorial → tienda, últimos {DAYS} días.
        Total: <b>{totalClicks}</b> clicks.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <section className="rounded border border-[color:var(--border)] p-4">
          <h2 className="font-bold mb-3">Top tutoriales por clicks</h2>
          {topTuts.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Sin clicks aún.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {topTuts.map((t, i) => (
                <li key={t.slug} className="flex justify-between gap-3">
                  <span className="truncate flex-1">
                    <span className="text-[color:var(--muted)] mr-2">{i + 1}.</span>
                    <a
                      href={`/blog/${t.slug}`}
                      target="_blank"
                      rel="noopener"
                      className="hover:underline"
                    >
                      {t.title || t.slug}
                    </a>
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    {t.clicks}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded border border-[color:var(--border)] p-4">
          <h2 className="font-bold mb-3">Top productos clickeados</h2>
          {topProds.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Sin clicks aún.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {topProds.map((p, i) => (
                <li key={p.product_id} className="flex justify-between gap-3">
                  <span className="truncate flex-1">
                    <span className="text-[color:var(--muted)] mr-2">{i + 1}.</span>
                    {p.product_name}
                    <span className="text-xs text-[color:var(--muted)] ml-2">
                      ({p.product_id})
                    </span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    {p.clicks}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="rounded border border-[color:var(--border)] p-4 mb-8">
        <h2 className="font-bold mb-3">Distribución por source</h2>
        {bySource.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Sin clicks aún.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {bySource.map((s) => (
              <li key={s.source} className="flex justify-between">
                <span>
                  <code className="px-2 py-0.5 rounded bg-[color:var(--border)]">
                    {s.source}
                  </code>
                </span>
                <span className="font-semibold">
                  {s.clicks}
                  {totalClicks > 0 && (
                    <> ({((s.clicks / totalClicks) * 100).toFixed(1)}%)</>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-bold mb-3">Últimos 50 clicks (debug)</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">
            Aún no hay clicks registrados.
          </p>
        ) : (
          <div className="text-xs space-y-1 font-mono">
            {recent.map((c) => (
              <div
                key={c.id}
                className="flex gap-3 border-b border-[color:var(--border)] pb-1"
              >
                <span className="text-[color:var(--muted)]">
                  {c.clicked_at}
                </span>
                <span className="px-1 rounded bg-[color:var(--border)]">
                  {c.source}
                </span>
                <span className="truncate flex-1">
                  {c.tutorial_slug} →{" "}
                  {c.product_name || c.product_id || "(buy_all)"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
