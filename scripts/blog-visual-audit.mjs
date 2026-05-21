#!/usr/bin/env node
/**
 * Blog visual audit (Playwright headless).
 *
 * Pablo 20-may-2026: tras encontrar 2/25 imgs broken (studiopieters.nl
 * hotlink-blocked → 200 en curl pero 0×0 en browser real), montamos un
 * audit automatizado cada 3 días que detecta exactamente eso.
 *
 * Recorre 5 URLs (home, catálogo, último tutorial, top categoría, top tag),
 * por cada una:
 *   - Lista imgs con naturalWidth/Height tras render → detecta hotlink-block
 *   - Captura JSON-LD + og:* + twitter:* meta tags → detecta SEO gaps
 *   - Captura console errors no-aceptables
 *   - Captura network requests 4xx/5xx
 *
 * Output:
 *   - docs/audits/blog-audit-<YYYY-MM-DD>.md (markdown report)
 *   - data/blog-audit-latest.json (machine-readable, último run)
 *   - exit code 1 si broken_images > 0
 *
 * Uso: node scripts/blog-visual-audit.mjs [--base-url https://...]
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const BASE_URL = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "https://www.mechatronicstore.cl";

// Console errors que sabemos benignos (Pablo 20-may-2026)
const ACCEPTABLE_CONSOLE_PATTERNS = [
  /giscus/i,                  // hasta que Pablo instale Giscus en repo
  /sitemap\.xml\?_rsc/i,      // Next.js prefetch quirk
  /favicon\.ico/i,            // no impacta render
];

function isAcceptable(msg) {
  return ACCEPTABLE_CONSOLE_PATTERNS.some((re) => re.test(msg));
}

/**
 * Discovery: leer las URLs a auditar desde la home.
 * Si Turso no está accesible (workflow CI), hardcodeamos categorías
 * conocidas; si la home se renderiza igual, sacamos slug del primer card.
 */
async function discoverUrls(page) {
  await page.goto(`${BASE_URL}/blog`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("a[href^='/blog/']", { timeout: 10000 }).catch(() => {});
  // Pablo 21-may-2026 audit-fix: la regex anterior matcheaba "tutoriales"
  // (página de catálogo) como slug, generando falsos positivos "missing
  // HowTo" en el audit. Blocklist reservadas conocidas.
  const RESERVED = new Set([
    "tutoriales",
    "tag",
    "categoria",
    "buscar",
    "rss",
    "sitemap",
  ]);
  const slugs = await page.evaluate((reserved) => {
    const set = new Set(reserved);
    const seen = new Set();
    const out = [];
    document.querySelectorAll("a[href^='/blog/']").forEach((a) => {
      const href = a.getAttribute("href");
      // /blog/<slug> sólo (un solo segmento), excluyendo paths reservados
      const m = href.match(/^\/blog\/([a-z0-9-]+)$/);
      if (m && !set.has(m[1]) && !seen.has(m[1])) {
        seen.add(m[1]);
        out.push(m[1]);
      }
    });
    return out.slice(0, 3); // muestreamos 3 tutoriales
  }, Array.from(RESERVED));
  return slugs;
}

async function auditPage(browser, url, pageType) {
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  page.on("console", (m) => {
    if (m.type() === "error") {
      const text = m.text();
      if (!isAcceptable(text)) consoleErrors.push(text);
    }
  });
  page.on("response", (resp) => {
    const status = resp.status();
    const u = resp.url();
    if (status >= 400 && !isAcceptable(u)) {
      networkErrors.push({ status, url: u });
    }
  });

  let loadOk = true;
  let loadError = null;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    // Pablo 21-may-2026 audit-fix: scrollear al fondo + esperar para
    // forzar carga de imgs con loading="lazy". Sin esto el audit reporta
    // falsos positivos (naturalWidth=0) en cards fuera del viewport
    // inicial — pero esas imgs cargarían bien con scroll del usuario.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      const total = document.body.scrollHeight;
      for (let y = 0; y < total; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 200));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  } catch (e) {
    loadOk = false;
    loadError = String(e?.message || e);
  }

  if (!loadOk) {
    await ctx.close();
    return {
      url,
      pageType,
      load_ok: false,
      load_error: loadError,
      images: [],
      seo: {},
      console_errors: consoleErrors,
      network_errors: networkErrors,
    };
  }

  // === Broken images (failure mode crítico) ===
  const images = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return imgs.map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      referrerPolicy: img.referrerPolicy || "",
      loading: img.loading || "",
      visible:
        img.getBoundingClientRect().width > 0 &&
        img.getBoundingClientRect().height > 0,
    }));
  });
  // Pablo 21-may-2026: excluir nuestro propio CDN (images.mechatronicstore.cl
  // → R2) del broken-images check. Cloudflare aplica bot detection a
  // Playwright headless desde GHA runners (AWS IP + webdriver fingerprint)
  // y devuelve challenge en vez de la img, generando falsos positivos.
  // Esos heros sí los verifica scripts/monitor_pipeline.py métrica
  // heros_broken (curl HEAD con UA realista) cada 2h — cobertura redundante.
  const OUR_CDN_HOSTS = ["images.mechatronicstore.cl"];
  const brokenImages = images.filter((i) => {
    if (!i.complete) return false;
    if (i.naturalWidth !== 0 && i.naturalHeight !== 0) return false;
    try {
      const host = new URL(i.src).hostname;
      if (OUR_CDN_HOSTS.includes(host)) return false; // cubierto por monitor
    } catch {}
    return true;
  });

  // === SEO / metadata ===
  const seo = await page.evaluate(() => {
    const getMeta = (sel) =>
      document.querySelector(sel)?.getAttribute("content") || null;
    return {
      title: document.title,
      description: getMeta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.href || null,
      ogTitle: getMeta('meta[property="og:title"]'),
      ogDescription: getMeta('meta[property="og:description"]'),
      ogImage: getMeta('meta[property="og:image"]'),
      ogUrl: getMeta('meta[property="og:url"]'),
      ogType: getMeta('meta[property="og:type"]'),
      twitterCard: getMeta('meta[name="twitter:card"]'),
      twitterImage: getMeta('meta[name="twitter:image"]'),
      robots: getMeta('meta[name="robots"]'),
      jsonLdTypes: Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
      )
        .map((s) => {
          try {
            const j = JSON.parse(s.textContent);
            return j["@type"] || (Array.isArray(j) ? j.map((x) => x["@type"]) : null);
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    };
  });

  // === Validación SEO por tipo de página ===
  // Pablo 21-may-2026: target 70 chars alinea con SERP real de Google
  // (~580px renderizados ≈ 70 chars). 60 era excesivamente restrictivo
  // considerando que el layout agrega sufijo "· Blog MechatronicStore"
  // (24 chars) al document.title automáticamente.
  const seoIssues = [];
  if (!seo.title || seo.title.length > 70) {
    seoIssues.push(`title length ${seo.title?.length || 0} (target ≤70)`);
  }
  if (!seo.description) seoIssues.push("missing description");
  if (!seo.canonical) seoIssues.push("missing canonical");
  if (!seo.ogTitle) seoIssues.push("missing og:title");
  if (!seo.ogImage) seoIssues.push("missing og:image");
  if (!seo.twitterCard) seoIssues.push("missing twitter:card");

  // Pablo 21-may-2026 audit-fix: catalogo (/blog/tutoriales) NO debería
  // esperar HowTo/LearningResource — es una grid de tutoriales, no un
  // tutorial individual. Tampoco BreadcrumbList porque la nav superior ya
  // tiene texto crumb sin schema. Si querés ItemList ahí, agregalo a la
  // página primero y después al expected.
  const expectedSchemas = {
    home: ["Blog"],
    detail: ["HowTo", "LearningResource", "BreadcrumbList"],
    categoria: ["CollectionPage", "BreadcrumbList"],
    tag: ["CollectionPage", "BreadcrumbList"],
    catalogo: [], // intencionalmente vacío — solo meta básica
  };
  const flatTypes = seo.jsonLdTypes.flat();
  for (const s of expectedSchemas[pageType] || []) {
    if (!flatTypes.includes(s)) seoIssues.push(`missing JSON-LD ${s}`);
  }

  await ctx.close();
  return {
    url,
    pageType,
    load_ok: true,
    images,
    broken_images: brokenImages,
    seo,
    seo_issues: seoIssues,
    console_errors: consoleErrors,
    network_errors: networkErrors,
  };
}

function classify(audits) {
  const critical = [];
  const high = [];
  const medium = [];

  for (const a of audits) {
    if (!a.load_ok) {
      critical.push(`${a.url} no carga: ${a.load_error}`);
      continue;
    }
    for (const img of a.broken_images || []) {
      critical.push(`broken image on ${a.url}: ${img.src} (referrerPolicy=${img.referrerPolicy || "default"})`);
    }
    for (const issue of a.seo_issues || []) {
      high.push(`SEO ${a.url}: ${issue}`);
    }
    for (const err of a.console_errors || []) {
      high.push(`console error ${a.url}: ${err.slice(0, 200)}`);
    }
    for (const ne of a.network_errors || []) {
      // 404 en _rsc no es crítico (Next.js); resto sí
      if (!ne.url.includes("_rsc")) {
        medium.push(`network ${ne.status} ${a.url}: ${ne.url}`);
      }
    }
  }
  return { critical, high, medium };
}

function renderMarkdown(audits, classified) {
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  const lines = [];
  lines.push(`# Blog visual audit — ${ts} UTC`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Pages audited: ${audits.length}`);
  lines.push(`- Broken images: **${audits.reduce((n, a) => n + (a.broken_images?.length || 0), 0)}**`);
  lines.push(`- Console errors (non-acceptable): ${classified.high.filter((s) => s.startsWith("console")).length}`);
  lines.push(`- SEO gaps: ${classified.high.filter((s) => s.startsWith("SEO")).length}`);
  lines.push(`- Network 4xx/5xx: ${classified.medium.length}`);
  lines.push("");

  if (classified.critical.length > 0) {
    lines.push("## Critical (fix today)");
    classified.critical.forEach((s) => lines.push(`- [ ] ${s}`));
    lines.push("");
  }
  if (classified.high.length > 0) {
    lines.push("## High (fix this week)");
    classified.high.forEach((s) => lines.push(`- [ ] ${s}`));
    lines.push("");
  }
  if (classified.medium.length > 0) {
    lines.push("## Medium / backlog");
    classified.medium.forEach((s) => lines.push(`- [ ] ${s}`));
    lines.push("");
  }

  lines.push("## Per-page detail");
  for (const a of audits) {
    lines.push(`### ${a.pageType.toUpperCase()} — ${a.url}`);
    lines.push("");
    if (!a.load_ok) {
      lines.push(`**LOAD FAILED:** ${a.load_error}`);
      lines.push("");
      continue;
    }
    lines.push(`- Title: \`${a.seo.title}\` (${a.seo.title?.length || 0} chars)`);
    lines.push(`- Canonical: ${a.seo.canonical || "_missing_"}`);
    lines.push(`- og:image: ${a.seo.ogImage || "_missing_"}`);
    lines.push(`- JSON-LD types: ${a.seo.jsonLdTypes.flat().join(", ") || "_none_"}`);
    lines.push(`- Images: ${a.images.length} total, ${a.broken_images.length} broken`);
    if (a.broken_images.length > 0) {
      a.broken_images.forEach((img) => {
        lines.push(`  - BROKEN: \`${img.src}\` (alt: "${img.alt}", referrerPolicy=${img.referrerPolicy || "default"})`);
      });
    }
    if (a.console_errors.length > 0) {
      lines.push(`- Console errors: ${a.console_errors.length}`);
      a.console_errors.slice(0, 3).forEach((e) => lines.push(`  - ${e.slice(0, 200)}`));
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  console.log(`Auditing ${BASE_URL} ...`);
  const browser = await chromium.launch({ headless: true });
  const discoveryPage = await browser.newPage();
  let slugs = [];
  try {
    slugs = await discoverUrls(discoveryPage);
  } catch (e) {
    console.warn(`Discovery failed: ${e.message}`);
  } finally {
    await discoveryPage.close();
  }
  console.log(`Discovered slugs: ${slugs.join(", ") || "(none)"}`);

  const targets = [
    { url: `${BASE_URL}/blog`, type: "home" },
    { url: `${BASE_URL}/blog/tutoriales`, type: "catalogo" },
    ...slugs.slice(0, 2).map((s) => ({ url: `${BASE_URL}/blog/${s}`, type: "detail" })),
    { url: `${BASE_URL}/blog/categoria/esp32`, type: "categoria" },
    { url: `${BASE_URL}/blog/tag/arduino`, type: "tag" },
  ];

  const audits = [];
  for (const t of targets) {
    console.log(`  → ${t.url} (${t.type})`);
    const a = await auditPage(browser, t.url, t.type);
    audits.push(a);
  }
  await browser.close();

  const classified = classify(audits);
  const md = renderMarkdown(audits, classified);

  const today = new Date().toISOString().slice(0, 10);
  const mdPath = join(REPO_ROOT, "docs", "audits", `blog-audit-${today}.md`);
  const jsonPath = join(REPO_ROOT, "data", "blog-audit-latest.json");
  mkdirSync(dirname(mdPath), { recursive: true });
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(mdPath, md, "utf-8");
  writeFileSync(
    jsonPath,
    JSON.stringify(
      { checked_at: new Date().toISOString(), base_url: BASE_URL, classified, audits },
      null,
      2,
    ),
    "utf-8",
  );

  console.log("");
  console.log(`Report: ${mdPath}`);
  console.log(`Critical: ${classified.critical.length}`);
  console.log(`High: ${classified.high.length}`);
  console.log(`Medium: ${classified.medium.length}`);

  if (classified.critical.length > 0) {
    console.log("");
    console.log("::error::Blog visual audit found CRITICAL issues:");
    classified.critical.forEach((c) => console.log(`::error::  ${c}`));
    process.exit(1);
  }
  if (classified.high.length > 0) {
    classified.high.forEach((h) => console.log(`::warning::${h}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
