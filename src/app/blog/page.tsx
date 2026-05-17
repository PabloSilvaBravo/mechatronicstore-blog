import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedTutorials } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Tutoriales de electrónica, robótica y DIY paso a paso. Adaptados al español Chile con productos linkeados a MechatronicStore.",
  alternates: { canonical: "https://www.mechatronicstore.cl/blog" },
};

export const revalidate = 600;

function categoryLabel(c: string | null): string {
  const map: Record<string, string> = {
    arduino: "Arduino",
    esp32: "ESP32",
    rpi: "Raspberry Pi",
    robotica: "Robótica",
    sensores: "Sensores",
    "3d": "Impresión 3D",
    otros: "Otros",
  };
  return c ? map[c] || c : "";
}

function difficultyLabel(d: string | null): string {
  if (d === "beginner") return "Principiante";
  if (d === "intermediate" || d === "intermedia") return "Intermedio";
  if (d === "advanced") return "Avanzado";
  return d || "";
}

export default async function BlogHomePage() {
  const tutorials = await getPublishedTutorials(24);

  return (
    <div>
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-3">Blog de tutoriales</h1>
        <p className="text-lg text-[color:var(--muted)] max-w-2xl">
          Tutoriales paso a paso de electrónica, robótica y DIY. Cada proyecto
          incluye lista de materiales con productos linkeados a MechatronicStore
          + código + descargas.
        </p>
      </header>

      {tutorials.length === 0 ? (
        <div className="rounded-lg border border-[color:var(--border)] p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">🚧 Sin tutoriales aún</h2>
          <p className="text-[color:var(--muted)]">
            Estamos preparando los primeros tutoriales. Volvé pronto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorials.map((t) => (
            <Link
              key={t.id}
              href={`/blog/${t.slug}`}
              className="group rounded-lg border border-[color:var(--border)] overflow-hidden hover:border-[color:var(--primary)] transition-colors"
            >
              {t.hero_image_url && (
                <img
                  src={t.hero_image_url}
                  alt={t.title_es}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-2 text-xs">
                  {t.category && (
                    <span className="px-2 py-0.5 rounded bg-[color:var(--primary)] text-black font-semibold">
                      {categoryLabel(t.category)}
                    </span>
                  )}
                  {t.difficulty && (
                    <span className="px-2 py-0.5 rounded text-[color:var(--muted)] border border-[color:var(--border)]">
                      {difficultyLabel(t.difficulty)}
                    </span>
                  )}
                  {t.estimated_time_minutes && (
                    <span className="text-[color:var(--muted)]">
                      ⏱ {t.estimated_time_minutes} min
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-lg mb-2 leading-tight group-hover:text-[color:var(--primary)]">
                  {t.title_es}
                </h2>
                <p className="text-sm text-[color:var(--muted)] line-clamp-2">
                  {t.subtitle_es}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
