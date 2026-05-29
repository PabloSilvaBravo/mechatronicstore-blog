"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

// Pablo 21-may-2026 Tier A: img con skeleton loader gris animado.
// Reemplaza el flash blanco/transparente mientras la img carga. Inspirado
// en MechaNoticias/ImageWithSkeleton.tsx.
//
// Pablo 29-may-2026 fix: cuando la imagen YA esta en el browser cache (caso
// MUY comun en reloads, hard refresh, navegacion interna), el `onLoad` event
// NO se dispara confiablemente porque el browser sirve la imagen sincronicamente.
// Resultado anterior: `loaded` quedaba false para siempre, `opacity: 0`, imagen
// invisible aunque presente en DOM con `naturalWidth > 0`.
//
// Fix: en mount checkear `imgRef.current.complete && naturalWidth > 0`. Si es
// true, settear `loaded = true` inmediato (skip skeleton).
//
// Uso:
//   <ImageWithSkeleton src={hero} alt="..." className="card-img w-full h-44" />

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  aspectRatio?: string;     // "16/9", "3/2"; default sin aspect-ratio (usa className)
  rounded?: boolean;        // round corners on skeleton (default true)
}

export default function ImageWithSkeleton({
  src,
  alt,
  className = "",
  style,
  aspectRatio,
  rounded = true,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Si la imagen ya estaba cacheada cuando el component monto, onLoad no
  // se va a disparar - el browser ya tiene la image data lista. Forzamos
  // loaded=true en este caso para evitar opacity:0 permanente.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        setLoaded(true);
      } else {
        // complete=true + naturalWidth=0 = imagen fallo en cargar
        setErrored(true);
      }
    }
  }, [src]);

  if (!src) return null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        aspectRatio: aspectRatio ?? (style as { aspectRatio?: string })?.aspectRatio,
        background: loaded || errored ? "transparent" : "var(--bg-elevated)",
      }}
    >
      {!loaded && !errored && (
        <div
          aria-hidden
          className={`absolute inset-0 ${rounded ? "" : ""}`}
          style={{
            background:
              "linear-gradient(90deg, var(--bg-elevated) 0%, color-mix(in srgb, var(--brand-purple) 8%, var(--bg-elevated)) 50%, var(--bg-elevated) 100%)",
            backgroundSize: "200% 100%",
            animation: "blog-skel-shimmer 1.4s ease-in-out infinite",
          }}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        loading={rest.loading ?? "lazy"}
        referrerPolicy={rest.referrerPolicy ?? "no-referrer"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 280ms ease-out",
        }}
        {...rest}
      />
    </div>
  );
}
