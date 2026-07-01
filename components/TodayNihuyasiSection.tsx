"use client";

import { createNihuyasiEntry } from "@/app/nihuyasi/actions";
import { LinkifiedText } from "@/components/LinkifiedText";
import type { NihuyasiEntry } from "@/lib/types";
import { useCallback, useRef, useState, useTransition } from "react";

type TodayNihuyasiSectionProps = {
  initialEntries: NihuyasiEntry[];
  todayDate: string;
};

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function TodayNihuyasiSection({
  initialEntries,
  todayDate,
}: TodayNihuyasiSectionProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [entries, setEntries] = useState(initialEntries);
  const [isPending, startTransition] = useTransition();

  const handleTextareaResize = useCallback(() => {
    resizeTextarea(textRef.current);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = textRef.current?.value ?? "";
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    startTransition(async () => {
      const created = await createNihuyasiEntry(trimmed, todayDate);

      if (!created) {
        return;
      }

      setEntries((current) => [...current, created]);

      if (textRef.current) {
        textRef.current.value = "";
        resizeTextarea(textRef.current);
        textRef.current.focus();
      }
    });
  }

  return (
    <section className="doc-section nihuyasi-today-section">
      <div className="section-header">
        <h2 className="section-label">Нихуяси</h2>
      </div>

      {entries.length > 0 && (
        <ul className="nihuyasi-today-list">
          {entries.map((entry) => (
            <li key={entry.id} className="nihuyasi-today-item">
              <LinkifiedText text={entry.text} />
            </li>
          ))}
        </ul>
      )}

      <div className="nihuyasi-today-divider" aria-hidden="true" />

      <form className="nihuyasi-today-form" onSubmit={handleSubmit}>
        <textarea
          ref={textRef}
          name="text"
          rows={2}
          placeholder="Новая Нихуяся…"
          className="nihuyasi-today-input"
          disabled={isPending}
          autoComplete="off"
          onInput={handleTextareaResize}
        />
        <button type="submit" className="ghost-button" disabled={isPending}>
          Добавить
        </button>
      </form>
    </section>
  );
}
