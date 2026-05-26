"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import type { MacroSubmenuItem } from "@/lib/queries/trending-tags";

interface Props {
  label: string;
  href: string;
  items: MacroSubmenuItem[];
  openId?: string;
  itemId: string;
  onOpen?: (id: string | null) => void;
}

/**
 * Submenu — dropdown SIMPLE 1-col del header del blog. Reemplazo del
 * MegaMenu 2-col anterior que mostraba dropdown vacio para macro-cats.
 *
 * Pablo 25-may-2026: el dropdown muestra las sub-categorias o tags reales
 * que cada macro-categoria agrupa, con conteos. Sin imagen featured (era
 * decoracion pesada). Sin label "SUBTEMAS" (innecesario).
 */
export default function Submenu({
  label,
  href,
  items,
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

  function onTriggerEnter() {
    setOpen(true);
  }

  // Hover geometrico (igual que MegaMenu) - el panel es absolute fuera
  // del trigger en DOM, los eventos enter/leave no son confiables.
  useEffect(() => {
    if (!open) return;
    function onMove(e: MouseEvent) {
      const x = e.clientX;
      const y = e.clientY;
      const cRect = containerRef.current?.getBoundingClientRect();
      const pRect = panelRef.current?.getBoundingClientRect();
      const inContainer =
        !!cRect &&
        x >= cRect.left &&
        x <= cRect.right &&
        y >= cRect.top &&
        y <= cRect.bottom;
      const inPanel =
        !!pRect &&
        x >= pRect.left &&
        x <= pRect.right &&
        y >= pRect.top &&
        y <= pRect.bottom;
      if (inContainer || inPanel) {
        if (hoverCloseTimer.current) {
          clearTimeout(hoverCloseTimer.current);
          hoverCloseTimer.current = null;
        }
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

  // Si no hay items, el dropdown no se abre (solo link directo).
  const hasItems = items.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        onMouseEnter={hasItems ? onTriggerEnter : undefined}
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
        {hasItems && (
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={(e) => {
              e.preventDefault();
              setOpen(!open);
            }}
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
        )}
      </div>

      {open && hasItems && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full z-50 pt-1 w-[260px]"
        >
          <div
            role="menu"
            className="rounded-lg border shadow-lg overflow-hidden"
            style={{
              borderColor: "var(--border-subtle)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            <ul className="py-1.5">
              {items.map((it) => (
                <li key={`${it.type}-${it.slug}`}>
                  <Link
                    href={
                      it.type === "category"
                        ? `/blog/categoria/${it.slug}`
                        : `/blog/tag/${it.slug}`
                    }
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline justify-between px-4 py-2 text-sm transition-colors hover:bg-[color:var(--bg-hover)]"
                  >
                    <span
                      className="font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {it.label}
                    </span>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {it.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div
              className="border-t px-4 py-2.5"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider transition-colors hover:underline"
                style={{ color: "var(--text-accent)" }}
              >
                Ver todos los tutoriales <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
