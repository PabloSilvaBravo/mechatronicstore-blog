import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getTutorialBySlug } from "@/lib/db/queries";
import { renderMarkdown } from "@/lib/markdown";
import MaterialsList from "../components/MaterialsList";
import BuyAllButton from "../components/BuyAllButton";
import StepCard from "../components/StepCard";
import CodeBlock from "../components/CodeBlock";
import DownloadLinks from "../components/DownloadLinks";
import AttributionFooter from "../components/AttributionFooter";
import Comments from "../components/Comments";
import MarkdownEnhancer from "../components/MarkdownEnhancer";
import ReadingProgress from "../components/ReadingProgress";
import ShareButtons from "../components/ShareButtons";
import RelatedTutorials from "../components/RelatedTutorials";

interface Props {
  params: Promise<{ slug: string }>;
}

const BASE_URL = "https://www.mechatronicstore.cl";

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tutorial = await getTutorialBySlug(slug);
  if (!tutorial) {
    return { title: "Tutorial no encontrado" };
  }
  const canonical = `${BASE_URL}/blog/${tutorial.slug}`;
  return {
    title: tutorial.title_es,
    description: tutorial.subtitle_es,
    alternates: {
      canonical,
      languages: {
        "es-CL": canonical,
        "es-419": canonical,
        es: canonical,
        "x-default": canonical,
      },
    },
    openGraph: {
      title: tutorial.title_es,
      description: tutorial.subtitle_es,
      url: canonical,
      type: "article",
      siteName: "MechatronicStore Blog",
      locale: "es_CL",
      images: tutorial.hero_image_url
        ? [{ url: tutorial.hero_image_url, width: 1200, height: 630 }]
        : undefined,
      publishedTime: tutorial.published_at,
      tags: tutorial.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: tutorial.title_es,
      description: tutorial.subtitle_es,
      images: tutorial.hero_image_url ? [tutorial.hero_image_url] : undefined,
    },
  };
}

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

function formatPublishedDate(iso: string): string {
  // 'YYYY-MM-DD HH:MM:SS' → '18 de mayo de 2026'
  const dateStr = iso.slice(0, 10);
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d} de ${months[m - 1]} de ${y}`;
}

export default async function TutorialPage({ params }: Props) {
  const { slug } = await params;
  const tutorial = await getTutorialBySlug(slug);
  if (!tutorial) notFound();

  const bodyHtml = renderMarkdown(tutorial.body_es);
  const canonical = `${BASE_URL}/blog/${tutorial.slug}`;

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": ["HowTo", "LearningResource"],
    name: tutorial.title_es,
    description: tutorial.subtitle_es,
    image: tutorial.hero_image_url || undefined,
    totalTime: tutorial.estimated_time_minutes
      ? `PT${tutorial.estimated_time_minutes}M`
      : undefined,
    estimatedCost: tutorial.estimated_cost_clp
      ? {
          "@type": "MonetaryAmount",
          currency: "CLP",
          value: tutorial.estimated_cost_clp,
        }
      : undefined,
    supply: tutorial.materials_list.map((m) => ({
      "@type": "HowToSupply",
      name: m.name,
      requiredQuantity: m.qty || 1,
    })),
    step: tutorial.steps.map((s) => ({
      "@type": "HowToStep",
      position: s.position,
      name: s.name,
      text: s.text,
      image: s.image_url,
    })),
    datePublished: tutorial.published_at,
    publisher: {
      "@type": "Organization",
      name: "MechatronicStore",
      url: "https://www.mechatronicstore.cl",
    },
    isBasedOn: {
      "@type": "CreativeWork",
      url: tutorial.source_url,
      publisher: { "@type": "Organization", name: tutorial.source_name || tutorial.source_id },
    },
    educationalLevel: tutorial.difficulty,
    teaches: tutorial.tags,
    inLanguage: "es-CL",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: BASE_URL + "/blog" },
      ...(tutorial.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: categoryLabel(tutorial.category),
              item: `${BASE_URL}/blog/categoria/${tutorial.category}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: tutorial.title_es,
              item: canonical,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 3,
              name: tutorial.title_es,
              item: canonical,
            },
          ]),
    ],
  };

  return (
    <article className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <ReadingProgress />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs uppercase tracking-[0.12em]"
        style={{ color: "var(--text-dim)" }}
      >
        <Link href="/" className="hover:text-[color:var(--text-muted)]">
          Inicio
        </Link>
        <span className="mx-2" aria-hidden>›</span>
        <Link href="/blog" className="hover:text-[color:var(--text-muted)]">
          Blog
        </Link>
        {tutorial.category && (
          <>
            <span className="mx-2" aria-hidden>›</span>
            <Link
              href={`/blog/categoria/${tutorial.category}`}
              className="hover:text-[color:var(--text-muted)]"
            >
              {categoryLabel(tutorial.category)}
            </Link>
          </>
        )}
      </nav>

      {/* Hero header — estilo editorial */}
      <header className="mb-10">
        {/* Category badge + difficulty tag */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {tutorial.category && (
            <Link
              href={`/blog/categoria/${tutorial.category}`}
              className="inline-flex items-center px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] rounded-sm"
              style={{
                backgroundColor: "var(--brand-purple)",
                color: "var(--text-on-purple)",
              }}
            >
              {categoryLabel(tutorial.category)}
            </Link>
          )}
          {tutorial.difficulty && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: difficultyColor(tutorial.difficulty) }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
              {difficultyLabel(tutorial.difficulty)}
            </span>
          )}
        </div>

        {/* Title serif */}
        <h1
          className="font-headline mb-4 tracking-tight"
          style={{
            fontSize: "clamp(2rem, 1.5rem + 3vw, 3.25rem)",
            lineHeight: "1.1",
            color: "var(--text)",
            letterSpacing: "-0.02em",
          }}
        >
          {tutorial.title_es}
        </h1>

        {/* Subtitle */}
        <p
          className="text-lg sm:text-xl mb-6 leading-relaxed"
          style={{ color: "var(--text-muted)", maxWidth: "60ch" }}
        >
          {tutorial.subtitle_es}
        </p>

        {/* Meta row: fecha + tiempo + costo */}
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 mt-2 border-y text-sm"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-muted)",
          }}
        >
          {tutorial.published_at && (
            <span className="inline-flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V12a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 12v6.75"
                />
              </svg>
              {formatPublishedDate(tutorial.published_at)}
            </span>
          )}
          {tutorial.estimated_time_minutes && (
            <span className="inline-flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {tutorial.estimated_time_minutes} min de armado
            </span>
          )}
          {tutorial.estimated_cost_clp && (
            <span className="inline-flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                />
              </svg>
              ~CLP ${tutorial.estimated_cost_clp.toLocaleString("es-CL")}
            </span>
          )}
        </div>
      </header>

      {/* Hero image — full width con overlay decorativo */}
      {tutorial.hero_image_url && (
        <div className="relative w-full mb-10 overflow-hidden rounded-xl border" style={{ borderColor: "var(--border-subtle)" }}>
          <img
            src={tutorial.hero_image_url}
            alt={tutorial.title_es}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Materials list — sticky-able en desktop si se quiere */}
      <MaterialsList
        materials={tutorial.materials_list}
        linkedProducts={tutorial.linked_products}
        slug={tutorial.slug}
      />
      <BuyAllButton linkedProducts={tutorial.linked_products} slug={tutorial.slug} />

      {/* Body markdown rico */}
      {tutorial.body_es && (
        <MarkdownEnhancer>
          <div
            className="article-body mx-auto my-10"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </MarkdownEnhancer>
      )}

      {/* Steps con cards numerados */}
      {tutorial.steps.length > 0 && (
        <section className="my-12">
          <div className="mb-6">
            <div
              className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{ color: "var(--brand-yellow)" }}
            >
              Paso a paso
            </div>
            <h2
              className="font-headline"
              style={{
                fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)",
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              Cómo armarlo
            </h2>
          </div>
          <ol className="space-y-6">
            {tutorial.steps.map((s) => (
              <StepCard
                key={s.position}
                position={s.position}
                name={s.name}
                text={s.text}
                imageUrl={s.image_url}
              />
            ))}
          </ol>
        </section>
      )}

      {/* Code blocks extraídos por LLM */}
      {tutorial.code_blocks.length > 0 && (
        <section className="my-12">
          <div className="mb-6">
            <div
              className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2"
              style={{ color: "var(--brand-yellow)" }}
            >
              Código fuente
            </div>
            <h2
              className="font-headline"
              style={{
                fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)",
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              Los snippets que necesitás
            </h2>
          </div>
          {tutorial.code_blocks.map((cb, i) => (
            <CodeBlock key={i} lang={cb.lang} caption={cb.caption} code={cb.code} />
          ))}
        </section>
      )}

      <DownloadLinks
        githubUrl={tutorial.github_url}
        downloads={tutorial.download_urls}
      />

      {/* Tags chips */}
      {tutorial.tags.length > 0 && (
        <section className="my-10">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-dim)" }}
          >
            Etiquetas
          </div>
          <div className="flex flex-wrap gap-2">
            {tutorial.tags.map((t) => (
              <Link
                key={t}
                href={`/blog/tag/${encodeURIComponent(t)}`}
                className="pill inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                <span style={{ color: "var(--text-dim)" }}>#</span>
                <span className="font-medium">{t}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Share buttons */}
      <ShareButtons url={canonical} title={tutorial.title_es} />

      <AttributionFooter
        sourceUrl={tutorial.source_url}
        sourceName={tutorial.source_name}
      />

      {/* Related tutorials por categoría */}
      {tutorial.category && (
        <RelatedTutorials
          category={tutorial.category}
          excludeSlug={tutorial.slug}
        />
      )}

      <Comments slug={tutorial.slug} />
    </article>
  );
}
