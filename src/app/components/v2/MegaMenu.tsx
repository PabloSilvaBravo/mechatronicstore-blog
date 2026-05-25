"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Tag, FeaturedTutorial } from "@/lib/queries/trending-tags";

interface Props {
  label: string;
  href: string;
  topTags: Tag[];
  featured: FeaturedTutorial | null;
  openId?: string;
  itemId: string;
  onOpen?: (id: string | null) => void;
}

export default function MegaMenu({
  label,
  href,
  topTags,
  featured,
  openId,
  itemId,
  onOpen,
}: Props) {
  const open = openId === itemId;
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setOpen(v: boolean) {
    if (onOpen) onOpen(v ? itemId : null);
  }

  function onTriggerEnter() { setOpen(true); }

  useEffect(() => {
    if (!open) return;
    function onMove(e: MouseEvent) {
      const x = e.clientX;
      const y = e.clientY;
      const cRect = containerRef.current?.getBoundingClientRect();
      const pRect = panelRef.current?.getBoundingClientRect();
      const inContainer = !!cRect && x >= cRect.left && x <= cRect.right && y >= cRect.top && y <= cRect.bottom;
      const inPanel = !!pRect && x >= pRect.left && x <= pRect.right && y >= pRect.top && y <= pRect.bottom;
      if (inContainer || inPanel) {
        if (hoverCloseTimer.current) { clearTimeout(hoverCloseTimer.current); hoverCloseTimer.current = null; }
      } else {
        if (!hoverCloseTimer.current) {
          hoverCloseTimer.current = setTimeout(() => {
            setOpen(false);
            hoverCloseTimer.current = null;
          }, 200);
        }
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
      if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <div
        onMouseEnter={onTriggerEnter}
        className="flex items-center rounded-md transition-colors hover:bg-[color:var(--bg-elevated)]"
        style={{ backgroundColor: open ? "var(--bg-elevated)" : undefined }}
      >
        <Link
          href={href}
          className="py-2 pl-3 pr-1 text-[13px] font-semibold uppercase tracking-wider transition-colors"
          style={{ color: open ? "var(--text)" : "var(--text-muted)" }}
        >
          {label}
        </Link>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={(e) => { e.preventDefault(); setOpen(!open); }}
          className="py-2 pl-0.5 pr-2.5 transition-colors"
          style={{ color: open ? "var(--text)" : "var(--text-dim)" }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {open && (
        <div ref={panelRef} className="absolute left-0 top-full z-50 pt-1 w-[min(92vw,560px)]">
          <div
            role="menu"
            className="rounded-lg border shadow-lg"
            style={{
              borderColor: "var(--border-subtle)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr] sm:gap-6 sm:p-5">
              <div>
                <div
                  className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: "var(--brand-yellow)" }}
                >
                  Subtemas
                </div>
                <ul className="space-y-1.5">
                  {topTags.slice(0, 6).map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/blog/tag/${t.slug}`}
                        className="group flex items-baseline justify-between rounded px-2 py-1 text-sm transition-colors hover:bg-[color:var(--bg-hover)]"
                        onClick={() => setOpen(false)}
                      >
                        <span className="font-medium" style={{ color: "var(--text)" }}>
                          {t.name}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                          {t.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider transition-colors hover:underline"
                  style={{ color: "var(--text-accent)" }}
                >
                  Ver todos los tutoriales <span aria-hidden>→</span>
                </Link>
              </div>

              {featured && (
                <Link
                  href={`/blog/${featured.slug}`}
                  onClick={() => setOpen(false)}
                  className="group block"
                >
                  <div
                    className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--brand-yellow)" }}
                  >
                    Más reciente
                  </div>
                  <div
                    className="relative aspect-[16/10] overflow-hidden rounded-md"
                    style={{ backgroundColor: "var(--bg)" }}
                  >
                    {featured.image && (
                      <img
                        src={featured.image}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <h3
                    className="mt-3 line-clamp-3 text-sm font-bold leading-snug"
                    style={{
                      color: "var(--text)",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    <span className="bg-[linear-gradient(transparent_92%,rgba(255,215,0,0.3)_92%)] bg-no-repeat transition-[background-size] duration-300 [background-size:0%_100%] group-hover:[background-size:100%_100%]">
                      {featured.title}
                    </span>
                  </h3>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
