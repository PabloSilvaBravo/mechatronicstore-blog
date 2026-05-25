"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useScrollLock } from "@/lib/use-scroll-lock";

const HISTORY_KEY = "mechablog-search-history";
const MAX_HISTORY = 8;

const POPULAR_TAGS = [
  "esp32",
  "arduino",
  "raspberry-pi",
  "sensores",
  "robotica",
  "iot",
  "impresion-3d",
  "domotica",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setHistory([]);
    }
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit(q: string) {
    const query = q.trim();
    if (!query) return;
    try {
      const next = [query, ...history.filter((h) => h !== query)].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
    onClose();
    router.push(`/blog/buscar?q=${encodeURIComponent(query)}`);
  }

  function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    setHistory([]);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col"
      style={{
        backgroundColor: "var(--bg)",
        paddingTop: "env(safe-area-inset-top, 0)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Buscar tutoriales"
    >
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--brand-purple), var(--brand-yellow), var(--brand-purple), transparent)",
        }}
      />

      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          style={{ color: "var(--text-dim)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(value); }}
          placeholder="Buscar tutoriales, tags, componentes..."
          className="flex-1 bg-transparent text-lg outline-none"
          style={{ color: "var(--text)" }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Borrar búsqueda"
            className="rounded-full p-1.5"
            style={{ color: "var(--text-dim)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-1 px-2 text-sm font-semibold"
          style={{ color: "var(--text-accent)" }}
        >
          Cancelar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {history.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                Búsquedas recientes
              </h3>
              <button
                type="button"
                onClick={clearHistory}
                className="text-[11px] font-semibold underline"
                style={{ color: "var(--text-dim)" }}
              >
                Limpiar
              </button>
            </div>
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h}>
                  <button
                    type="button"
                    onClick={() => submit(h)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-[color:var(--bg-elevated)]"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: "var(--text-dim)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ color: "var(--text)" }}>{h}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            Temas populares
          </h3>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TAGS.map((t) => (
              <Link
                key={t}
                href={`/blog/tag/${t}`}
                onClick={onClose}
                className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-[color:var(--text-muted)]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ color: "var(--text-dim)" }}>#</span>
                <span className="font-medium">{t}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
