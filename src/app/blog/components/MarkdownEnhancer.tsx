"use client";

/**
 * Hydrata los botones "Copiar" dentro del body markdown server-rendered.
 *
 * El renderMarkdown() del server inyecta `<button class="mbc-copy">` y
 * adyacente `<pre data-code="...">`. Este componente cliente busca todas
 * esas combinaciones en su subtree y conecta el onClick.
 *
 * Uso:
 *   <MarkdownEnhancer>
 *     <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
 *   </MarkdownEnhancer>
 */

import { useEffect, useRef, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function MarkdownEnhancer({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const root = ref.current;

    // Cada code block está envuelto en .mbc-codeblock con un button.mbc-copy
    // y un sibling <pre data-code="...">.
    const blocks = root.querySelectorAll<HTMLElement>(".mbc-codeblock");
    const cleanups: Array<() => void> = [];

    blocks.forEach((block) => {
      const btn = block.querySelector<HTMLButtonElement>(".mbc-copy");
      const pre = block.querySelector<HTMLPreElement>("pre[data-code]");
      if (!btn || !pre) return;

      const code = pre.getAttribute("data-code") || pre.textContent || "";

      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          // Fallback
          const ta = document.createElement("textarea");
          ta.value = code;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          try {
            document.execCommand("copy");
          } catch {
            // give up silently
          } finally {
            document.body.removeChild(ta);
          }
        }
        // Feedback visual: swap label "Copiar" → "¡Copiado!" 2s
        const span = btn.querySelector("span");
        const originalText = span ? span.textContent : "Copiar";
        if (span) span.textContent = "¡Copiado!";
        btn.style.color = "var(--brand-yellow)";
        setTimeout(() => {
          if (span) span.textContent = originalText || "Copiar";
          btn.style.color = "var(--text-muted)";
        }, 2000);
      };

      btn.addEventListener("click", onClick);
      cleanups.push(() => btn.removeEventListener("click", onClick));
    });

    return () => {
      for (const fn of cleanups) fn();
    };
  }, [children]);

  return <div ref={ref}>{children}</div>;
}
