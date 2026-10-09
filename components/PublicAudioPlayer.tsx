"use client";

import { useEffect, useRef, useState } from "react";

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PublicAudioPlayer({ src, title }: { src: string; title: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = `mediaos-audio:${src}`;

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let saved = 0;
    try { saved = Number(localStorage.getItem(key)); } catch { /* Persistence is optional. */ }
    const restore = () => {
      if (saved > 0 && saved < element.duration) element.currentTime = saved;
    };
    const persistPosition = () => {
      try { localStorage.setItem(key, String(element.currentTime)); } catch { /* Persistence is optional. */ }
    };
    const tick = () => {
      setPosition(element.currentTime);
      persistPosition();
    };
    const metadata = () => { setDuration(element.duration); restore(); };
    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); persistPosition(); };
    const onEnded = () => setPlaying(false);
    const onError = () => { setPlaying(false); setError("Не удалось загрузить аудио"); };
    element.addEventListener("loadedmetadata", metadata);
    element.addEventListener("timeupdate", tick);
    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title, artist: "Дмитрий Слиньков" });
        navigator.mediaSession.setActionHandler("play", () => void element.play().catch(() => setError("Не удалось запустить аудио")));
        navigator.mediaSession.setActionHandler("pause", () => element.pause());
        navigator.mediaSession.setActionHandler("seekbackward", (details) => { element.currentTime -= details.seekOffset ?? 10; });
        navigator.mediaSession.setActionHandler("seekforward", (details) => { element.currentTime += details.seekOffset ?? 10; });
        navigator.mediaSession.setActionHandler("seekto", (details) => { if (details.seekTime != null) element.currentTime = details.seekTime; });
      } catch { /* Media Session actions are optional and vary by browser. */ }
    }
    return () => {
      element.removeEventListener("loadedmetadata", metadata);
      element.removeEventListener("timeupdate", tick);
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setActionHandler("play", null);
          navigator.mediaSession.setActionHandler("pause", null);
          navigator.mediaSession.setActionHandler("seekbackward", null);
          navigator.mediaSession.setActionHandler("seekforward", null);
          navigator.mediaSession.setActionHandler("seekto", null);
        } catch { /* Media Session actions are optional. */ }
      }
    };
  }, [key, title]);

  return (
    <section className="public-media-audio">
      <p className="public-media-kicker">Послушать в авторском исполнении</p>
      <audio ref={audio} src={src} preload="metadata" />
      <div className="public-audio-controls">
        <button type="button" className="public-audio-play" onClick={() => { if (audio.current?.paused) void audio.current.play().then(() => setError(null)).catch(() => setError("Не удалось запустить аудио")); else audio.current?.pause(); }} aria-label={playing ? "Пауза" : "Воспроизвести"}>{playing ? "Ⅱ" : "▶"}</button>
        <span className="public-audio-time">{formatTime(position)}</span>
        <input aria-label="Позиция воспроизведения" type="range" min="0" max={duration || 0} step="1" value={Math.min(position, duration || 0)} onChange={(event) => { if (audio.current) audio.current.currentTime = Number(event.target.value); }} />
        <span className="public-audio-time">{formatTime(duration)}</span>
        <select aria-label="Скорость воспроизведения" value={rate} onChange={(event) => { const next = Number(event.target.value); setRate(next); if (audio.current) audio.current.playbackRate = next; }}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>
      </div>
      {error ? <p role="status">{error}</p> : null}
    </section>
  );
}
