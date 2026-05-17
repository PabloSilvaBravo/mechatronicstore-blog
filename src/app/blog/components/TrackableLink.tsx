"use client";

import { ReactNode } from "react";

interface Props {
  href: string;
  slug: string;
  source: "material_list" | "buy_all" | "inline";
  productId?: string | null;
  productName?: string | null;
  className?: string;
  children: ReactNode;
}

/**
 * Link que dispara navigator.sendBeacon antes de navegar.
 *
 * Fire-and-forget: si el beacon falla (browser sin soporte, network down,
 * endpoint caído) seguimos navegando igual — la UX no debe romperse por
 * un fallo de tracking. El response del endpoint es 204 No Content, no
 * esperamos nada.
 *
 * No usamos preventDefault: dejamos que el browser navegue normalmente y
 * paralelo dispara el beacon. sendBeacon está diseñado exactamente para
 * este caso (unload events).
 */
export default function TrackableLink({
  href,
  slug,
  source,
  productId,
  productName,
  className,
  children,
}: Props) {
  const handleClick = () => {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
    const payload = JSON.stringify({
      slug,
      source,
      product_id: productId ?? null,
      product_name: productName ?? null,
      ref_url: href,
    });
    const blob = new Blob([payload], { type: "application/json" });
    try {
      navigator.sendBeacon("/api/blog/track/click", blob);
    } catch {
      // ignore — tracking nunca debe romper UX
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
