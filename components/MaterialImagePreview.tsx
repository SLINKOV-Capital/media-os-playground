"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type MaterialImagePreviewProps = {
  src: string;
  alt?: string;
  variant?: "card" | "thumb" | "list";
  className?: string;
  fallback?: ReactNode;
};

export function MaterialImagePreview({
  src,
  alt = "",
  variant = "card",
  className = "",
  fallback = null,
}: MaterialImagePreviewProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [src]);

  if (!src.trim() || hidden) {
    return fallback;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`material-image-preview material-image-preview--${variant}${className ? ` ${className}` : ""}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHidden(true)}
    />
  );
}
