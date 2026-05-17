"use client";
import { useState } from "react";

interface Props {
  lang: string;
  caption?: string;
  code: string;
}

export default function CodeBlock({ lang, caption, code }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="my-6 rounded-lg border border-[color:var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[color:var(--border)] text-xs">
        <span className="font-mono text-[color:var(--muted)]">
          {lang}{caption ? ` · ${caption}` : ""}
        </span>
        <button
          onClick={copy}
          className="px-2 py-1 text-xs rounded bg-[color:var(--background)] hover:bg-[color:var(--primary)] hover:text-black transition-colors"
        >
          {copied ? "✓ Copiado" : "📋 Copiar"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm bg-[color:var(--background)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
