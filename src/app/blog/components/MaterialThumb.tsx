"use client";

import { useState } from "react";

/**
 * MaterialThumb — pequeño Client Component que renderiza una imagen de
 * thumb (100×100) con fallback automático al image_url original si la
 * versión cropeada no existe.
 *
 * Pablo 23-may-2026: extraído de MaterialsList.tsx que es Server Component
 * y por lo tanto NO puede pasar event handlers como `onError`. Resultado
 * del bug previo: TODOS los `/blog/[slug]` daban 500 ("Event handlers
 * cannot be passed to Client Component props").
 */
interface Props {
  thumbUrl: string;
  fallbackUrl: string;
}

export default function MaterialThumb({ thumbUrl, fallbackUrl }: Props) {
  const [src, setSrc] = useState(thumbUrl);
  const [fellBack, setFellBack] = useState(false);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!fellBack && fallbackUrl) {
          setFellBack(true);
          setSrc(fallbackUrl);
        }
      }}
    />
  );
}
