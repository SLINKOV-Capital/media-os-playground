"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const BOOK = {
  title: "Поговорим без слайдов",
  cover: "/books/pogovorim-bez-slaidov.png",
  coverAlt: "Обложка книги «Поговорим без слайдов»",
  bookUrl: "https://ridero.ru/books/pogovorim_bez_slaidov/",
  lead: "Сборник художественных рассказов плюс два романа о банкирах, чиновниках, киберпреступниках, ИТ-консультантах и человеческих судьбах.",
};

export type BookPreviewFragment = { id: string; title: string; text: string; cardText: string | null };

function excerptEnding(text: string) {
  const trimmed = text.trimEnd();
  return /(?:\.{2,}|…+|\u22ef+|\u2026)$/.test(trimmed) ? trimmed : `${trimmed}\n\n……………`;
}

function downloadCard(fragment: BookPreviewFragment) {
  const text = fragment.cardText?.trim();
  if (!text) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#f4efe5";
  context.fillRect(0, 0, 1080, 1350);
  context.fillStyle = "#1b1a18";
  context.fillRect(70, 70, 940, 1210);
  context.fillStyle = "#f4efe5";
  context.textBaseline = "top";
  context.font = "600 28px Arial, sans-serif";
  context.fillText("ДМИТРИЙ СЛИНЬКОВ", 130, 130);
  context.font = "600 34px Arial, sans-serif";
  context.fillText("ПОГОВОРИМ БЕЗ СЛАЙДОВ", 130, 190);
  context.fillStyle = "#ffffff";
  const maxWidth = 820;
  let fontSize = 42;
  let lines: string[] = [];
  const maxHeight = 850;
  while (fontSize >= 12) {
    context.font = `${fontSize}px Georgia, serif`;
    lines = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    if (lines.length * Math.round(fontSize * 1.4) <= maxHeight) break;
    fontSize -= 2;
  }
  if (lines.length * Math.round(fontSize * 1.4) > maxHeight) {
    context.font = "12px Georgia, serif";
    lines = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
  }
  const lineHeight = Math.round(fontSize * 1.4);
  const top = Math.max(310, Math.round((1100 - lines.length * lineHeight) / 2));
  lines.forEach((value, index) => context.fillText(value, 130, top + index * lineHeight));
  context.fillStyle = "#c9c0b2";
  context.font = "26px Arial, sans-serif";
  context.fillText(fragment.title, 130, 1160);
  context.fillText("soloten.com/ru/books", 130, 1210);
  const anchor = document.createElement("a");
  anchor.download = `pogovorim-${fragment.id}.png`;
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}

export function BooksShowcase({ fragments, isAuthor }: { fragments: BookPreviewFragment[]; isAuthor: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [hasTurned, setHasTurned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const pageCount = Math.ceil(fragments.length / 2);
  const totalStops = isMobile ? fragments.length : pageCount;
  const isOrderPage = totalStops > 0 && index >= totalStops;
  const firstFragmentIndex = isMobile ? index : index * 2;
  const activeFragment = fragments[firstFragmentIndex] ?? null;
  const nextFragment = isMobile ? null : fragments[firstFragmentIndex + 1] ?? null;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function move(delta: number) {
    const next = Math.max(0, Math.min(totalStops, index + delta));
    if (next === index) return;
    setIndex(next);
    setHasTurned(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") { event.preventDefault(); move(1); }
      if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); move(-1); }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fragments.length, isMobile, index]);

  return (
    <div className="books-showcase">
      <article className="book-showcase-card">
        {!open ? <button type="button" className="book-showcase-cover book-showcase-cover-button" onClick={() => { setIndex(0); setHasTurned(false); setOpen(true); }} aria-label="Открыть листалку книги"><Image src={BOOK.cover} alt={BOOK.coverAlt} fill sizes="(max-width: 767px) 100vw, 42vw" className="book-showcase-cover-image" /></button> : null}
        <div className="book-showcase-copy">
          <p className="book-showcase-label">Книга</p>
          <h2>{BOOK.title}</h2>
          <div className="book-showcase-lead"><p>{BOOK.lead}</p><p>Байки, наблюдения и человеческие истории с юмором и мыслью.</p></div>
          <div className="book-showcase-actions">
          <button type="button" className="book-showcase-toggle" aria-expanded={open} onClick={() => { setOpen((value) => !value); setIndex(0); setHasTurned(false); }}>{open ? "Закрыть листалку" : "Листать книгу"}</button>
            <a className="book-order-link" href="https://t.me/slinkov" target="_blank" rel="noreferrer">Заказать авторское издание</a>
          </div>
          <p className="book-showcase-secondary">Также доступны варианты на <a href={BOOK.bookUrl} target="_blank" rel="noreferrer">Rideró</a>.</p>
        </div>
        {open ? (
          <section className="book-preview" aria-label="Листалка книги">
            <div className="book-preview-mockup" aria-hidden="true"><Image src={BOOK.cover} alt="" fill sizes="(max-width: 767px) 100vw, 1000px" /></div>
            <div className={`book-preview-spread${activeFragment ? " has-fragment" : ""}`} onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStartX.current == null) return; const delta = event.changedTouches[0]!.clientX - touchStartX.current; if (Math.abs(delta) > 40) move(delta < 0 ? 1 : -1); touchStartX.current = null; }}>
              {isOrderPage ? (
                <div className="book-preview-order-page">
                  <p className="book-preview-story-title">Спасибо, что заглянули</p>
                  <p>Выберите авторское издание книги.</p>
                  <a className="book-order-link" href="https://t.me/slinkov" target="_blank" rel="noreferrer">Заказать авторское издание</a>
                </div>
              ) : fragments.length === 0 ? (
                <div className="book-preview-empty-state">
                  <p className="book-preview-story-title">Поговорим без слайдов</p>
                  <p>Электронное и бумажное авторские издания можно заказать напрямую у автора.</p>
                  <a className="book-order-link" href="https://t.me/slinkov" target="_blank" rel="noreferrer">Заказать авторское издание</a>
                </div>
              ) : (
                <>
                  <article className="book-preview-page book-preview-page-text" key={activeFragment.id}>
                    <p className="book-preview-page-number">{firstFragmentIndex + 1}</p>
                    <p className="book-preview-story-title">{activeFragment.title}</p>
                    <div className="book-preview-excerpt">{excerptEnding(activeFragment.text)}</div>
                    {isAuthor ? <button type="button" className="book-preview-download" disabled={!activeFragment.cardText} title={activeFragment.cardText ? "Скачать карточку PNG 1080×1350" : "Добавьте текст карточки в редактор произведения"} onClick={() => downloadCard(activeFragment)}>{activeFragment.cardText ? "Скачать карточку PNG" : "Нет текста карточки"}</button> : null}
                  </article>
                  {nextFragment ? (
                    <article className="book-preview-page book-preview-page-text" key={nextFragment.id}>
                      <p className="book-preview-page-number">{firstFragmentIndex + 2}</p>
                      <p className="book-preview-story-title">{nextFragment.title}</p>
                      <div className="book-preview-excerpt">{excerptEnding(nextFragment.text)}</div>
                      {isAuthor ? <button type="button" className="book-preview-download" disabled={!nextFragment.cardText} title={nextFragment.cardText ? "Скачать карточку PNG 1080×1350" : "Добавьте текст карточки в редактор произведения"} onClick={() => downloadCard(nextFragment)}>{nextFragment.cardText ? "Скачать карточку PNG" : "Нет текста карточки"}</button> : null}
                    </article>
                  ) : (
                    <div className="book-preview-page book-preview-page-blank" aria-hidden="true" />
                  )}
                </>
              )}
            </div>
            <div className="book-preview-actions">
              <div className="book-preview-controls"><button type="button" aria-label={isMobile ? "Предыдущая страница" : "Предыдущий разворот"} onClick={() => move(-1)} disabled={index <= 0}>←</button><span>{totalStops === 0 ? "" : isOrderPage ? "Конец" : `${index + 1} / ${totalStops}`}</span><button type="button" aria-label={isMobile ? "Следующая страница" : "Следующий разворот"} onClick={() => move(1)} disabled={totalStops === 0 || index >= totalStops}>→</button></div>
              {totalStops > 0 && !hasTurned ? <p className="book-preview-hint"><span className="book-preview-hint-desktop">Листайте рассказы →</span><span className="book-preview-hint-mobile">Листайте свайпом →</span></p> : null}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
