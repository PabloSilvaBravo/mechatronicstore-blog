"use client";

import { useState, useCallback } from "react";

interface Props {
  url: string;
  title: string;
}

/**
 * Botones de compartir social — WhatsApp, X (Twitter), Email + copy link.
 * Sin librerías externas, links de share-intent estándar.
 */
export default function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const text = `${title} — `;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  }, [url]);

  const links = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(text + url)}`,
      color: "#25D366",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.6 6.32A7.85 7.85 0 0012.05 4a7.94 7.94 0 00-6.88 11.91L4 20l4.18-1.1A7.94 7.94 0 0020 12.05a7.85 7.85 0 00-2.4-5.73zm-5.55 12.21h-.01a6.59 6.59 0 01-3.36-.92l-.24-.14-2.49.65.67-2.43-.16-.25a6.6 6.6 0 1112.27-4.39 6.6 6.6 0 01-6.68 6.48zm3.62-4.94c-.2-.1-1.18-.58-1.36-.64-.18-.07-.31-.1-.44.1-.13.2-.51.64-.62.77-.12.13-.23.15-.43.05-.2-.1-.84-.31-1.6-.99-.59-.53-.99-1.18-1.1-1.38-.12-.2-.01-.31.09-.41.09-.09.2-.23.3-.35.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.44-1.07-.6-1.46-.16-.39-.32-.34-.44-.34h-.38c-.13 0-.34.05-.52.25-.18.2-.69.67-.69 1.64 0 .97.7 1.91.8 2.04.1.13 1.39 2.12 3.36 2.97.47.2.83.32 1.12.41.47.15.9.13 1.24.08.38-.06 1.18-.48 1.34-.94.16-.46.16-.86.12-.94-.05-.08-.18-.13-.38-.23z"/>
        </svg>
      ),
    },
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      color: "var(--text)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      key: "email",
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + url)}`,
      color: "var(--brand-purple-light)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
  ];

  return (
    <section
      className="my-10 py-6 border-y"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3"
        style={{ color: "var(--text-dim)" }}
      >
        Compartir este tutorial
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((l) => (
          <a
            key={l.key}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pill inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium hover:bg-[color:var(--bg-hover)]"
            style={{
              borderColor: "var(--border)",
              color: l.color,
            }}
            aria-label={`Compartir en ${l.label}`}
          >
            <span aria-hidden style={{ color: l.color }}>{l.icon}</span>
            <span style={{ color: "var(--text)" }}>{l.label}</span>
          </a>
        ))}
        <button
          type="button"
          onClick={handleCopy}
          className="pill inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium hover:bg-[color:var(--bg-hover)]"
          style={{
            borderColor: "var(--border)",
            color: copied ? "var(--brand-yellow)" : "var(--text)",
          }}
          aria-label="Copiar link al portapapeles"
        >
          {copied ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              ¡Copiado!
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              Copiar link
            </>
          )}
        </button>
      </div>
    </section>
  );
}
