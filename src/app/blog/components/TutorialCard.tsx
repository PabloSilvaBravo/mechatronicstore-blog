import Link from "next/link";
import type { TutorialPublished } from "@/lib/db/queries";
import ImageWithSkeleton from "./ImageWithSkeleton";

/**
 * Componente reusable de card de tutorial para listings.
 *
 * Pablo 25-may-2026 (Fase B audit): consolidar 4 implementaciones inline
 * divergentes (home / categoria / tag / tutoriales) en un solo componente
 * con variants. Antes:
 *  - home: inline TutorialCard con `feature|compact` (con badges, metadata)
 *  - categoria/tag/tutoriales: cada uno inline simple, sin badges ni metadata
 *  - resultado: inconsistencia visual, drift cada vez que se tocaba uno
 *
 * Variants:
 *  - `compact`: card mediana para grids 3-col (default en listings)
 *  - `feature`: card mas grande para grids 2-col (home "Featured 2 next")
 *
 * El hero gigante de la home (16:10 image + "Destacado" badge + h2 enorme)
 * sigue inline en page.tsx por ser unico (1x por pagina). No se generaliza.
 */

const CATEGORY_LABELS: Record<string, string> = {
  arduino: "Arduino",
  esp32: "ESP32",
  rpi: "Raspberry Pi",
  robotica: "Robótica",
  sensores: "Sensores",
  "3d": "Impresión 3D",
  otros: "Otros",
};

function difficultyLabel(d: string | null): string {
  if (d === "beginner") return "Principiante";
  if (d === "intermediate" || d === "intermedia") return "Intermedio";
  if (d === "advanced") return "Avanzado";
  return d || "";
}

function difficultyColor(d: string | null): string {
  if (d === "beginner") return "var(--brand-yellow)";
  if (d === "intermediate" || d === "intermedia") return "var(--brand-purple-light)";
  if (d === "advanced") return "var(--text-accent)";
  return "var(--text-muted)";
}

function formatPublishedDate(iso: string): string {
  const dateStr = iso.slice(0, 10);
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${months[m - 1]} ${y}`;
}

interface Props {
  t: TutorialPublished;
  variant?: "feature" | "compact";
}

export default function TutorialCard({ t, variant = "compact" }: Props) {
  return (
    <Link href={`/blog/${t.slug}`} className="card-luis group block p-4">
      <article>
        {t.hero_image_url && (
          <div
            className={`relative overflow-hidden rounded-lg border mb-4 ${
              variant === "feature" ? "aspect-[16/10]" : "aspect-[16/9]"
            }`}
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <ImageWithSkeleton
              src={t.hero_image_url}
              alt={t.title_es}
              className="card-img w-full h-full"
            />
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          {t.category && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-accent)" }}
            >
              {CATEGORY_LABELS[t.category] || t.category}
            </span>
          )}
          {t.difficulty && (
            <>
              <span style={{ color: "var(--text-dim)" }} aria-hidden>·</span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: difficultyColor(t.difficulty) }}
              >
                {difficultyLabel(t.difficulty)}
              </span>
            </>
          )}
        </div>
        <h3
          className={`font-headline leading-tight mb-2 group-hover:text-[color:var(--text-accent)] transition-colors ${
            variant === "feature" ? "text-2xl" : "text-lg"
          }`}
          style={{
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {t.title_es}
        </h3>
        <p
          className={`leading-snug line-clamp-2 ${variant === "feature" ? "text-base" : "text-sm"}`}
          style={{ color: "var(--text-muted)" }}
        >
          {t.subtitle_es}
        </p>
        {(t.published_at || t.estimated_time_minutes) && (
          <div
            className="flex items-center gap-3 mt-3 text-[11px]"
            style={{ color: "var(--text-dim)" }}
          >
            {t.published_at && <span>{formatPublishedDate(t.published_at)}</span>}
            {t.estimated_time_minutes && (
              <>
                <span aria-hidden>·</span>
                <span>{t.estimated_time_minutes} min</span>
              </>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
