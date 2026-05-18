/**
 * Syntax highlighting server-side con Shiki.
 *
 * Pablo 18-may-2026: "el código cuando hay no tiene colores como tiene en
 * un editor de código, arregla para que sea más amigable de leer".
 *
 * Decisión técnica: Shiki en lugar de Prism/highlight.js — usa los grammars
 * de TextMate (mismos que VSCode) → colores idénticos a un editor real. Y
 * server-side rendering: el HTML highlighted llega al cliente como string,
 * cero JS extra en runtime.
 *
 * Dual theme: github-dark (matches blog dark mode) + github-light (matches
 * blog light mode). Shiki inyecta CSS vars `--shiki-light` y `--shiki-dark`
 * y un `<span class="shiki">` wrapper, así el CSS del blog alterna entre
 * temas basado en `[data-theme]`.
 *
 * Lenguajes pre-cargados: los más comunes en tutoriales electrónica/DIY.
 * Si llega un lang desconocido, fallback a `plaintext` (sin colores pero
 * sin error).
 */
import { createHighlighter, type Highlighter } from "shiki";

// Lenguajes pre-bundled. Arduino/MicroPython/CircuitPython no tienen
// grammar propio en shiki — usamos cpp y python como aliases.
const LANGUAGES = [
  "javascript",
  "typescript",
  "tsx",
  "jsx",
  "python",
  "cpp",
  "c",
  "json",
  "yaml",
  "bash",
  "shell",
  "html",
  "css",
  "markdown",
  "sql",
  "rust",
  "go",
  "toml",
  "dockerfile",
] as const;

// Aliases: lenguajes que NO existen en shiki pero usuarios escriben.
const LANG_ALIASES: Record<string, string> = {
  arduino: "cpp",
  ino: "cpp",
  "c++": "cpp",
  micropython: "python",
  circuitpython: "python",
  py: "python",
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  rs: "rust",
};

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [...LANGUAGES],
    });
  }
  return highlighterPromise;
}

function normalizeLang(raw: string | null | undefined): string {
  if (!raw) return "plaintext";
  const k = raw.trim().toLowerCase();
  if (LANG_ALIASES[k]) return LANG_ALIASES[k];
  if ((LANGUAGES as readonly string[]).includes(k)) return k;
  return "plaintext";
}

/**
 * Decodifica HTML entities — el body markdown viene con `&amp;` `&lt;` etc.
 * Shiki necesita el texto plano original.
 */
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Highlight código y retorna HTML con tokens coloreados.
 * El HTML incluye `<pre class="shiki shiki-themes ...">` con CSS vars
 * para que el blog alterne dark↔light según `[data-theme]`.
 */
export async function highlightCode(
  code: string,
  lang: string | null | undefined,
  decodeFromHtml = false,
): Promise<string> {
  const highlighter = await getHighlighter();
  const normalizedLang = normalizeLang(lang);
  const source = decodeFromHtml ? decodeHtml(code) : code;

  try {
    return highlighter.codeToHtml(source, {
      lang: normalizedLang,
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false, // emite both CSS vars, sin "primary"
    });
  } catch {
    // Fallback: si el lang fallaba sigilosamente, devolver pre/code básico
    const escaped = source
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="shiki"><code>${escaped}</code></pre>`;
  }
}
