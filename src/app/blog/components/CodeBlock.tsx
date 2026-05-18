"use client";

/**
 * Bloque de código estilo Claude.ai/GitHub — espejo de mechanews.
 *
 * - Header con label del lenguaje (`Python`, `Arduino`, `JSON`, etc) +
 *   botón copiar con feedback "¡Copiado!" 2s.
 * - Body con whitespace-pre, font-mono ui-monospace, scroll horizontal mobile.
 * - Colores via CSS vars theme-aware:
 *   - dark: bg #0a0a0a / text #fafafa / border #27272a
 *   - light: bg #fff / text #0a0a0a / border #e5e7eb
 * - Margin reducido my-4 vs my-6 del antiguo.
 *
 * NO usa syntax highlighting real (Shiki/Prism pesan ~100KB). El estilo
 * monoespaciado sobrio funciona bien para snippets cortos. Si Pablo
 * después quiere highlighting, agregar Prism lazy bajo Suspense.
 */
import { useState, useCallback } from "react";

interface Props {
  /**
   * Hint del lenguaje. Soportado tanto el prop legacy `lang` (de los
   * code_blocks_json extraídos por Routine C) como el moderno `language`.
   */
  language?: string;
  lang?: string;
  caption?: string;
  code: string;
}

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

function prettyLanguageLabel(raw?: string): string {
  if (!raw) return "Código";
  const k = raw.trim().toLowerCase();
  if (LANGUAGE_LABELS[k]) return LANGUAGE_LABELS[k];
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

export default function CodeBlock({ language, lang, caption, code }: Props) {
  const [copied, setCopied] = useState(false);
  const langHint = language ?? lang;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // give up silently
      } finally {
        document.body.removeChild(ta);
      }
    }
  }, [code]);

  const label = prettyLanguageLabel(langHint);

  return (
    <div
      className="my-4 overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {/* Header: lenguaje + caption opcional + copiar */}
      <div
        className="flex items-center justify-between border-b px-3 py-1.5"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-dim)" }}
        >
          {label}
          {caption ? (
            <span style={{ color: "var(--text-muted)" }}> · {caption}</span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[color:var(--bg-hover)]"
          style={{
            color: copied ? "var(--brand-yellow)" : "var(--text-muted)",
          }}
          aria-label={copied ? "Código copiado" : "Copiar código"}
        >
          {copied ? (
            <>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>¡Copiado!</span>
            </>
          ) : (
            <>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <pre
        className="m-0 overflow-x-auto p-3 sm:p-4"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <code
          className="block whitespace-pre font-mono text-[12.5px] leading-[1.55] sm:text-[13px]"
          style={{
            color: "var(--text)",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
