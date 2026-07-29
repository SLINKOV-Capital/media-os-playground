"use client";

import { useEffect, useState } from "react";

function formatClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

/** Digital HH:MM:SS — fills after mount to avoid SSR/client time mismatch. */
export function SiteClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(formatClock(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time className="public-site-clock" dateTime={time ?? undefined} aria-live="off">
      {time ?? "\u00a0"}
    </time>
  );
}
