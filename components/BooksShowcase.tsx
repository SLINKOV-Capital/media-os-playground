"use client";

import Image from "next/image";
import { useState } from "react";

const BOOKS = [
  {
    id: "pogovorim-bez-slaidov",
    title: "Поговорим без слайдов",
    cover: "/books/pogovorim-bez-slaidov.png",
    coverAlt: "Мокап книги «Поговорим без слайдов»",
    widgetUrl: "https://ridero.ru/books/widget/pogovorim_bez_slaidov/",
    bookUrl: "https://ridero.ru/books/pogovorim_bez_slaidov/",
    lead: [
      "Сборник художественных рассказов плюс два романа о банкирах, чиновниках, киберпреступниках, ИТ-консультантах и человеческих судьбах.",
      "Белые воротнички тоже плачут. Клетчатые воротнички их иногда спасают. Как возглавить банк и не превратиться в тень. Чтобы девушка тебя полюбила, полюби её город.",
      "«Сашенька, если б вы знали, как я люблю сажать людей. Из них потом такие зайки вырастают!»",
      "Байки, горькая правда и шокирующие наблюдения под тонким слоем юмора и мысли.",
    ],
  },
  {
    id: "ohota-na-dannye",
    title: "Охота на данные",
    cover: "/books/ohota-na-dannye.png",
    coverAlt: "Мокап книги «Охота на данные»",
    widgetUrl: "https://ridero.ru/books/widget/okhota_na_dannye/",
    bookUrl: "https://ridero.ru/books/okhota_na_dannye/",
    lead: [
      "Управленческий консультант и предприниматель со стажем рассказывает о том, как грамотный анализ данных меняет бизнес и мир. Успех любого бизнеса сегодня зависит не столько от идеи, сколько от данных.",
      "Автор убеждён в том, что управленческая отчётность — один из базовых навыков, которым должен владеть каждый уважающий себя бизнесмен. Наравне с умением выступать публично и писать внятные тексты.",
      "В доказательство приводятся конкретные рецепты и ярко описанные истории из практики.",
    ],
  },
] as const;

export function BooksShowcase() {
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  return (
    <div className="books-showcase">
      {BOOKS.map((book) => {
        const isOpen = openBookId === book.id;
        const readerId = `${book.id}-reader`;

        return (
          <article key={book.id} className="book-showcase-card">
            <div className="book-showcase-cover">
              <Image
                src={book.cover}
                alt={book.coverAlt}
                fill
                sizes="(max-width: 767px) 100vw, 42vw"
                className="book-showcase-cover-image"
              />
            </div>

            <div className="book-showcase-copy">
              <p className="book-showcase-label">Книга</p>
              <h2>{book.title}</h2>
              <div className="book-showcase-lead">
                {book.lead.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <button
                type="button"
                className="book-showcase-toggle"
                aria-expanded={isOpen}
                aria-controls={readerId}
                onClick={() => setOpenBookId(isOpen ? null : book.id)}
              >
                {isOpen ? "Закрыть листалку" : "Листать книгу"}
              </button>
            </div>

            {isOpen ? (
              <div id={readerId} className="book-showcase-reader">
                <div className="book-showcase-frame-shell">
                  <iframe
                    className="book-showcase-frame"
                    src={book.widgetUrl}
                    title={`3D-листалка книги «${book.title}»`}
                    allowFullScreen
                  />
                </div>
                <p className="book-showcase-fallback">
                  Если листалка не открылась, книгу можно{" "}
                  <a href={book.bookUrl} target="_blank" rel="noreferrer">
                    посмотреть на Rideró
                  </a>
                  .
                </p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
