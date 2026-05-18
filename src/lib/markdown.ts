import { marked } from "marked";
import { highlightCode } from "./syntax-highlight";

/**
 * Render markdown a HTML con syntax highlighting via Shiki.
 *
 * Pablo 18-may-2026: "el código cuando hay no tiene colores como tiene en
 * un editor de código, arregla para que sea más amigable de leer".
 *
 * Cambio respecto al renderer anterior: ahora es ASYNC. Marked sigue
 * generando el HTML inicial, después detectamos cada `<pre><code class=
 * "language-X">` y lo reemplazamos por el output de shiki + header con
 * lang label + botón copiar (hidratado por MarkdownEnhancer cliente).
 *
 * Server-side: el HTML highlighted llega al cliente como string, cero
 * runtime JS de highlighting. Shiki carga grammars una sola vez via
 * singleton (ver lib/syntax-highlight.ts).
 */

marked.setOptions({ gfm: true, breaks: false });

const LANGUAGE_LABELS: Record<string, string> = {
  py: "Python",
  python: "Python",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TypeScript (JSX)",
  jsx: "JavaScript (JSX)",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  yaml: "YAML",
  yml: "YAML",
  json: "JSON",
  toml: "TOML",
  c: "C",
  cpp: "C++",
  "c++": "C++",
  arduino: "Arduino",
  ino: "Arduino",
  rust: "Rust",
  go: "Go",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  md: "Markdown",
  markdown: "Markdown",
  dockerfile: "Dockerfile",
  micropython: "MicroPython",
  circuitpython: "CircuitPython",
};

function prettyLang(raw: string): string {
  const k = raw.trim().toLowerCase();
  if (LANGUAGE_LABELS[k]) return LANGUAGE_LABELS[k];
  if (!raw) return "Código";
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CODE_BLOCK_HEAD_TPL = (label: string) => `
<div class="mbc-codeblock my-4 overflow-hidden rounded-lg border" style="border-color:var(--border-subtle)">
  <div class="flex items-center justify-between border-b px-3 py-1.5" style="border-color:var(--border-subtle);background-color:var(--bg-elevated)">
    <span class="text-[11px] font-semibold uppercase tracking-wider" style="color:var(--text-dim)">${escapeHtml(label)}</span>
    <button type="button" class="mbc-copy inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[color:var(--bg-hover)]" style="color:var(--text-muted)" aria-label="Copiar código">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      <span>Copiar</span>
    </button>
  </div>`;

const CODE_BLOCK_TAIL = `</div>`;

const CODE_BLOCK_RE = /<pre><code(\s+class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g;

/**
 * Async post-process: cada <pre><code> es reemplazado por
 * <header + shiki rendered + button copiar>.
 */
async function enhanceCodeBlocks(html: string): Promise<string> {
  // Recolectar todos los matches primero, después hacer las async calls en paralelo
  const matches: Array<{ match: string; lang: string; body: string; decoded: string }> = [];
  let m: RegExpExecArray | null;
  CODE_BLOCK_RE.lastIndex = 0;
  while ((m = CODE_BLOCK_RE.exec(html)) !== null) {
    const lang = m[2] || "";
    const body = m[3] || "";
    const decoded = body
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    matches.push({ match: m[0], lang, body, decoded });
  }

  if (matches.length === 0) return html;

  // Highlight todos en paralelo
  const highlighted = await Promise.all(
    matches.map((x) => highlightCode(x.decoded, x.lang, false)),
  );

  // Reemplazar
  let out = html;
  for (let i = 0; i < matches.length; i++) {
    const { match, lang, decoded } = matches[i];
    const label = prettyLang(lang);
    const dataAttr = `data-code="${escapeHtml(decoded)}"`;
    // shiki HTML viene como `<pre class="shiki ..."><code>...</code></pre>`
    // Lo envolvemos con nuestro div + header.
    const shikiHtml = highlighted[i].replace(
      "<pre ",
      `<pre ${dataAttr} `,
    );
    const replacement =
      CODE_BLOCK_HEAD_TPL(label) + shikiHtml + CODE_BLOCK_TAIL;
    out = out.replace(match, replacement);
  }
  return out;
}

export async function renderMarkdown(md: string): Promise<string> {
  if (!md) return "";
  const raw = marked.parse(md, { async: false }) as string;
  return enhanceCodeBlocks(raw);
}
