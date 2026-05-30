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
        // Pablo 30-may-2026: si la imagen falla, dejamos el bloque de marca
        // (no transparente) como fondo para que nunca se vea un recuadro
        // gris vacío. El bloque de marca se dibuja debajo del <img>.
        background: loaded ? "transparent" : "var(--bg-elevated)",
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
      {/* Pablo 30-may-2026: fallback de marca cuando la imagen falla en
          cargar (hotlink-block residual, 404, red). En vez de un hueco
          transparente, mostramos un degradado sutil con los tokens de marca
          y el texto alternativo centrado, para que la card degrade con
          gracia. Reemplaza la antigua caja gris vacía. */}
      {errored && (
        <div
          className="absolute inset-0 flex items-center justify-center p-3"
          style={{
            background:
              "linear-gradient(135deg, var(--bg-elevated) 0%, color-mix(in srgb, var(--brand-purple) 14%, var(--bg-elevated)) 100%)",
          }}
        >
          <span
            aria-hidden
            className="absolute"
            style={{
              top: "0.55rem",
              left: "0.6rem",
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "9999px",
              background: "var(--brand-purple)",
              opacity: 0.7,
            }}
          />
          <span
            className="text-center text-[11px] font-semibold leading-snug line-clamp-3"
            style={{ color: "var(--text-muted)" }}
          >
            {alt || "MechatronicStore"}
          </span>
        </div>
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
