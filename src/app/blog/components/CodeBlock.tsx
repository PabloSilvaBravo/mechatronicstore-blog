import { highlightCode } from "@/lib/syntax-highlight";
import CodeBlockCopyButton from "./CodeBlockCopyButton";

interface Props {
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

function prettyLanguageLabel(raw?: string): string {
  if (!raw) return "Código";
  const k = raw.trim().toLowerCase();
  if (LANGUAGE_LABELS[k]) return LANGUAGE_LABELS[k];
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
}

/**
 * Server component que renderea el code block CON syntax highlighting
 * de shiki (server-side, tokens coloreados como VSCode github-dark /
 * github-light según data-theme).
 *
 * El botón de copiar está en `CodeBlockCopyButton.tsx` (client component
 * separado) para no marcar todo el bloque como cliente.
 */
export default async function CodeBlock({ language, lang, caption, code }: Props) {
  const langHint = language ?? lang;
  const label = prettyLanguageLabel(langHint);
  const shikiHtml = await highlightCode(code, langHint, false);

  return (
    <div
      className="my-4 overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {/* Header */}
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
        <CodeBlockCopyButton code={code} />
      </div>

      {/* Body — shiki HTML rendered server-side */}
      <div
        className="overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: shikiHtml }}
      />
    </div>
  );
}
