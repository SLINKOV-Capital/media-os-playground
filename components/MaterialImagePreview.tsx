"use client";

import { useState } from "react";

type MaterialImagePreviewProps = {
  src: string;
  alt?: string;
  variant?: "card" | "thumb" | "list";
  className?: string;
};

export function MaterialImagePreview({
  src,
  alt = "",
  variant = "card",
  className = "",
}: MaterialImagePreviewProps) {
  const [hidden, setHidden] = useState(false);

  if (!src.trim() || hidden) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`material-image-preview material-image-preview--${variant}${className ? ` ${className}` : ""}`}
      loading="lazy"
      decoding="async"
      onError={() => setHidden(true)}
    />
  );
}
