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
      languages: { "es-CL": canonical, "es-419": canonical, es: canonical, "x-default": canonical },
    },
    openGraph: {
      title: tutorial.title_es,
      description: tutorial.subtitle_es,
      url: canonical,
      type: "article",
      siteName: "MechatronicStore Blog",
      locale: "es_CL",
      images: tutorial.hero_image_url ? [{ url: tutorial.hero_image_url, width: 1200, height: 630 }] : undefined,
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
    totalTime: tutorial.estimated_time_minutes ? `PT${tutorial.estimated_time_minutes}M` : undefined,
    estimatedCost: tutorial.estimated_cost_clp
      ? { "@type": "MonetaryAmount", currency: "CLP", value: tutorial.estimated_cost_clp }
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
      { "@type": "ListItem", position: 3, name: tutorial.title_es, item: canonical },
    ],
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav className="text-sm text-[color:var(--muted)] mb-6">
        <Link href="/blog" className="hover:underline">← Blog</Link>
        {tutorial.category && (
          <>
            {" / "}
            <Link href={`/blog/categoria/${tutorial.category}`} className="hover:underline">
              {categoryLabel(tutorial.category)}
            </Link>
          </>
        )}
      </nav>

      <header>
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {tutorial.category && (
            <span className="px-2 py-1 rounded bg-[color:var(--primary)] text-black font-semibold">
              {categoryLabel(tutorial.category)}
            </span>
          )}
          {tutorial.difficulty && (
            <span className="px-2 py-1 rounded border border-[color:var(--border)]">
              {difficultyLabel(tutorial.difficulty)}
            </span>
          )}
          {tutorial.estimated_time_minutes && (
            <span className="px-2 py-1 rounded border border-[color:var(--border)]">
              ⏱ {tutorial.estimated_time_minutes} min
            </span>
          )}
          {tutorial.estimated_cost_clp && (
            <span className="px-2 py-1 rounded border border-[color:var(--border)]">
              💰 ~CLP ${tutorial.estimated_cost_clp.toLocaleString("es-CL")}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
          {tutorial.title_es}
        </h1>
        <p className="text-lg text-[color:var(--muted)] mb-6">
          {tutorial.subtitle_es}
        </p>

        {tutorial.hero_image_url && (
          <img
            src={tutorial.hero_image_url}
            alt={tutorial.title_es}
            className="w-full h-auto rounded-lg mb-8 border border-[color:var(--border)]"
          />
        )}
      </header>

      <MaterialsList
        materials={tutorial.materials_list}
        linkedProducts={tutorial.linked_products}
        slug={tutorial.slug}
      />
      <BuyAllButton linkedProducts={tutorial.linked_products} slug={tutorial.slug} />

      {tutorial.body_es && (
        <div
          className="prose dark:prose-invert max-w-none my-8"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}

      {tutorial.steps.length > 0 && (
        <div className="my-8">
          <h2 className="text-2xl font-bold mb-4">📝 Pasos</h2>
          {tutorial.steps.map((s) => (
            <StepCard
              key={s.position}
              position={s.position}
              name={s.name}
              text={s.text}
              imageUrl={s.image_url}
            />
          ))}
        </div>
      )}

      {tutorial.code_blocks.length > 0 && (
        <div className="my-8">
          <h2 className="text-2xl font-bold mb-4">💻 Código</h2>
          {tutorial.code_blocks.map((cb, i) => (
            <CodeBlock key={i} lang={cb.lang} caption={cb.caption} code={cb.code} />
          ))}
        </div>
      )}

      <DownloadLinks
        githubUrl={tutorial.github_url}
        downloads={tutorial.download_urls}
      />

      {tutorial.tags.length > 0 && (
        <div className="my-8 flex flex-wrap gap-2">
          {tutorial.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-1 text-xs rounded bg-[color:var(--border)] text-[color:var(--muted)]"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <AttributionFooter
        sourceUrl={tutorial.source_url}
        sourceName={tutorial.source_name}
      />

      <Comments slug={tutorial.slug} />
    </article>
  );
}
