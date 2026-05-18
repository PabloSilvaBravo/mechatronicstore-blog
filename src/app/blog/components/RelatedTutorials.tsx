import Link from "next/link";
import { getPublishedTutorials } from "@/lib/db/queries";

interface Props {
  category: string;
  excludeSlug: string;
  limit?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  arduino: "Arduino",
  esp32: "ESP32",
  rpi: "Raspberry Pi",
  robotica: "Robótica",
  sensores: "Sensores",
  "3d": "Impresión 3D",
  otros: "Otros",
};

/**
 * Sección de tutoriales relacionados al final de la página.
 * Filtra por misma categoría y excluye el actual.
 */
export default async function RelatedTutorials({
  category,
  excludeSlug,
  limit = 4,
}: Props) {
  const all = await getPublishedTutorials(limit + 1, category);
  const related = all.filter((t) => t.slug !== excludeSlug).slice(0, limit);

  if (related.length === 0) return null;

  const label = CATEGORY_LABELS[category] || category;

  return (
    <section
      className="my-12 pt-10 border-t"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2"
            style={{ color: "var(--brand-yellow)" }}
          >
            Más sobre {label}
          </div>
          <h2
            className="font-headline"
            style={{
              fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)",
              color: "var(--text)",
              lineHeight: 1.2,
            }}
          >
            Tutoriales relacionados
          </h2>
        </div>
        <Link
          href={`/blog/categoria/${category}`}
          className="text-sm whitespace-nowrap hover:underline"
          style={{ color: "var(--text-accent)" }}
        >
          Ver todos →
        </Link>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {related.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/blog/${t.slug}`}
              className="group flex gap-4 p-3 rounded-lg transition-colors hover:bg-[color:var(--bg-elevated)]"
            >
              {t.hero_image_url && (
                <img
                  src={t.hero_image_url}
                  alt={t.title_es}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-md flex-shrink-0 border"
                  style={{ borderColor: "var(--border-subtle)" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3
                  className="font-bold leading-tight mb-1 group-hover:text-[color:var(--text-accent)] transition-colors line-clamp-2"
                  style={{ color: "var(--text)", fontSize: "0.95rem" }}
                >
                  {t.title_es}
                </h3>
                <p
                  className="text-sm line-clamp-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t.subtitle_es}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
