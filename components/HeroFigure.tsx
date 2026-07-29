"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/** Relative lag vs scroll — higher = more obvious */
const PARALLAX_FACTOR = 0.28;

export function HeroFigure() {
  const figureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const readScrollY = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const apply = () => {
      frame = 0;
      if (motionQuery.matches) {
        figure.style.setProperty("--hero-parallax-y", "0px");
        return;
      }
      const y = readScrollY() * PARALLAX_FACTOR;
      figure.style.setProperty("--hero-parallax-y", `${y}px`);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    motionQuery.addEventListener("change", apply);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      motionQuery.removeEventListener("change", apply);
      if (frame) window.cancelAnimationFrame(frame);
      figure.style.setProperty("--hero-parallax-y", "0px");
    };
  }, []);

  return (
    <div ref={figureRef} className="public-hero-figure">
      <Image
        src="/brand/hero.png"
        alt="Дмитрий Слиньков"
        fill
        className="public-hero-image"
        sizes="100vw"
        priority
      />
    </div>
  );
}
