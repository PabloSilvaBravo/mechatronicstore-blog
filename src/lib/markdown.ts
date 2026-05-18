import { marked } from "marked";

/**
 * Render markdown a HTML con `<pre><code class="language-X">` mejorado.
 *
 * Pablo 17-may-2026 audit-blog B6-B8: el body_es de tutoriales contiene
 * code blocks (```cpp\nvoid setup()...\n```) que marked renderea como
 * <pre><code class="language-cpp">...</code></pre> plain — sin label,
 * sin copy button, sin font-mono ni colors theme-aware.
 *
 * Esta función post-procesa el HTML para que los <pre> tengan:
 * - Header con label del lenguaje (Python, Arduino, JSON, etc)
 * - Botón "Copiar" (data-copy attribute, hidratado por <MarkdownEnhancer>)
 * - Container con border + bg theme-aware
 *
 * No usamos React aquí porque marked-rendered body se inserta vía
 * dangerouslySetInnerHTML (SSR string). El componente cliente
 * <MarkdownEnhancer> se encarga de wirear los copy buttons después.
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

/**
 * Post-process HTML para envolver cada <pre><code class="language-X"> con
 * el header de language + copy. Atributo data-code guarda el texto plano
 * para que el botón pueda copiarlo (decoded de entities).
 */
function enhanceCodeBlocks(html: string): string {
  // Regex para detectar <pre><code class="language-X">...contenido...</code></pre>
  // Como el HTML viene de marked, el orden y atributos son estables.
  return html.replace(
    /<pre><code(\s+class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_match, _classAttr, lang, body) => {
      const label = prettyLang(lang || "");
      const head = CODE_BLOCK_HEAD_TPL(label);

      // body viene HTML-escaped por marked. Lo dejamos así para el <pre>
      // visible, pero también lo necesitamos en data-code para clipboard
      // (decoded a texto plano).
      const decoded = body
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      const dataAttr = `data-code="${escapeHtml(decoded)}"`;

      const pre = `<pre class="m-0 overflow-x-auto p-3 sm:p-4" style="background-color:var(--bg)" ${dataAttr}><code class="block whitespace-pre font-mono text-[12.5px] leading-[1.55] sm:text-[13px]" style="color:var(--text);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace">${body}</code></pre>`;

      return head + pre + CODE_BLOCK_TAIL;
    },
  );
}

export function renderMarkdown(md: string): string {
  if (!md) return "";
  const raw = marked.parse(md, { async: false }) as string;
  return enhanceCodeBlocks(raw);
}
