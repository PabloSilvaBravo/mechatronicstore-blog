import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedTutorials } from "@/lib/db/queries";
import HeroDecor from "./components/HeroDecor";
import RevealOnScroll from "./components/RevealOnScroll";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Tutoriales de electrónica con componentes en stock en Chile. Despacho 24-48h, precios en CLP, sin importaciones. Arduino, ESP32, Raspberry Pi y más.",
  alternates: { canonical: "https://www.mechatronicstore.cl/blog" },
};

export const revalidate = 600;

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

export default async function BlogHomePage() {
  const tutorials = await getPublishedTutorials(24);

  if (tutorials.length === 0) {
    return (
      <div>
        <header className="relative mb-12 fade-in-up py-12">
          <HeroDecor />
          <div
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--brand-yellow)" }}
          >
            Tutoriales · Stock local · Chile
          </div>
          <h1
            className="font-headline mb-4 tracking-tight"
            style={{
              fontSize: "clamp(2.25rem, 1.75rem + 3.5vw, 4rem)",
              lineHeight: 1.05,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Construye electrónica sin esperar a que lleguen las piezas.
          </h1>
          <p
            className="text-lg sm:text-xl"
            style={{ color: "var(--text-muted)", maxWidth: "62ch" }}
          >
            Cada tutorial usa componentes que ya están en stock en MechatronicStore.
            Despacho a todo Chile en 24-48 horas, precios en CLP.
          </p>
        </header>
        <div
          className="card-luis p-8 text-center"
        >
          <div className="text-4xl mb-3" aria-hidden>🚧</div>
          <h2
            className="font-headline text-2xl mb-2"
            style={{ color: "var(--text)" }}
          >
            Sin tutoriales aún
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            Estamos preparando los primeros tutoriales. Vuelve pronto.
          </p>
        </div>
      </div>
    );
  }

  const [hero, ...rest] = tutorials;
  const featured = rest.slice(0, 2);
  const remaining = rest.slice(2);

  return (
    <div className="fade-in-up">
      {/* Masthead con decoración SVG de fondo.
          Pablo 18-may-2026: propuesta de valor reenfocada al pain point
          real del maker chileno — esperar 25-40 días por componentes
          desde AliExpress/Amazon. El blog existe para resolver ESO,
          no para "adaptar tutoriales al maker chileno" (vago). */}
      <header className="relative mb-10 sm:mb-14 py-8 sm:py-12">
        <HeroDecor />
        <div className="relative">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--brand-yellow)" }}
          >
            <span className="live-dot" aria-hidden />
            <span>Tutoriales · Stock local · Chile</span>
          </div>
          <h1
            className="font-headline mb-4 tracking-tight"
            style={{
              fontSize: "clamp(2.25rem, 1.75rem + 3.5vw, 4rem)",
              lineHeight: 1.05,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Construye electrónica sin esperar a que lleguen las piezas.{" "}
            <span className="wave" aria-hidden>👋</span>
          </h1>
          <p
            className="text-lg sm:text-xl leading-relaxed"
            style={{ color: "var(--text-muted)", maxWidth: "62ch" }}
          >
            Cada tutorial usa componentes que ya están en stock en{" "}
            <a
              href="https://www.mechatronicstore.cl"
              className="underlink font-semibold"
              style={{ color: "var(--text)" }}
            >
              MechatronicStore
            </a>
            . Despacho a todo Chile en 24-48 horas, precios en CLP, sin
            importaciones ni reemplazos.
          </p>
        </div>
      </header>

      {/* HERO tutorial — destacado */}
      <RevealOnScroll>
        <section className="mb-12 sm:mb-16">
          <Link
            href={`/blog/${hero.slug}`}
            className="card-luis group block p-5 sm:p-6"
          >
            <article
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center"
            >
              {hero.hero_image_url && (
                <div
                  className="relative aspect-[16/10] overflow-hidden rounded-xl border order-2 lg:order-1"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <img
                    src={hero.hero_image_url}
                    alt={hero.title_es}
                    className="card-img w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] rounded-sm"
                    style={{
                      backgroundColor: "var(--brand-yellow)",
                      color: "var(--text-on-yellow)",
                    }}
                  >
                    Destacado
                  </span>
                  {hero.category && (
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--text-accent)" }}
                    >
                      {CATEGORY_LABELS[hero.category] || hero.category}
                    </span>
                  )}
                </div>
                <h2
                  className="font-headline tracking-tight mb-3 group-hover:text-[color:var(--text-accent)] transition-colors"
                  style={{
                    fontSize: "clamp(1.75rem, 1.4rem + 2vw, 2.75rem)",
                    lineHeight: 1.1,
                    color: "var(--text)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {hero.title_es}
                </h2>
                <p
                  className="text-base sm:text-lg leading-relaxed mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  {hero.subtitle_es}
                </p>
                <div
                  className="flex items-center gap-4 text-xs"
                  style={{ color: "var(--text-dim)" }}
                >
                  {hero.published_at && <span>{formatPublishedDate(hero.published_at)}</span>}
                  {hero.estimated_time_minutes && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{hero.estimated_time_minutes} min</span>
                    </>
                  )}
                  {hero.difficulty && (
                    <>
                      <span aria-hidden>·</span>
                      <span style={{ color: difficultyColor(hero.difficulty) }}>
                        {difficultyLabel(hero.difficulty)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </article>
          </Link>
        </section>
      </RevealOnScroll>

      {/* Featured (2 next) */}
      {featured.length > 0 && (
        <section
          className="mb-12 sm:mb-16 pt-10 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <RevealOnScroll>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featured.map((t) => (
                <TutorialCard key={t.slug} t={t} variant="feature" />
              ))}
            </div>
          </RevealOnScroll>
        </section>
      )}

      {/* Resto */}
      {remaining.length > 0 && (
        <section
          className="pt-10 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-6"
            style={{ color: "var(--text-dim)" }}
          >
            Más tutoriales
          </h2>
          <RevealOnScroll>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remaining.map((t) => (
                <TutorialCard key={t.slug} t={t} variant="compact" />
              ))}
            </div>
          </RevealOnScroll>
        </section>
      )}
    </div>
  );
}

function TutorialCard({
  t,
  variant,
}: {
  t: Awaited<ReturnType<typeof getPublishedTutorials>>[number];
  variant: "feature" | "compact";
}) {
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
            <img
              src={t.hero_image_url}
              alt={t.title_es}
              className="card-img w-full h-full object-cover"
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
