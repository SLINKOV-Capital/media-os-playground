"use client";

import {
  createNihuyasiEntry,
  deleteNihuyasiEntry,
  updateNihuyasiDate,
  updateNihuyasiText,
} from "@/app/nihuyasi/actions";
import {
  formatLocalIsoDate,
  formatNihuyasiDateHeader,
  groupNihuyasiByDate,
  sortNihuyasiEntries,
} from "@/lib/format";
import type { NihuyasiEntry } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

type NihuyasiPageContentProps = {
  initialEntries: NihuyasiEntry[];
};

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function NihuyasiEntryRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: NihuyasiEntry;
  onUpdate: (entry: NihuyasiEntry) => void;
  onDelete: (id: string) => void;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedText = useRef(entry.text);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    resizeTextarea(textRef.current);
  }, [entry.text]);

  function saveText() {
    const text = textRef.current?.value.trim() ?? "";

    if (!text || text === lastSavedText.current) {
      return;
    }

    startTransition(async () => {
      const ok = await updateNihuyasiText(entry.id, text);

      if (ok) {
        lastSavedText.current = text;
        onUpdate({ ...entry, text });
      } else if (textRef.current) {
        textRef.current.value = lastSavedText.current;
      }
    });
  }

  function saveDate(nextDate: string) {
    if (!nextDate || nextDate === entry.date) {
      return;
    }

    startTransition(async () => {
      const ok = await updateNihuyasiDate(entry.id, nextDate);

      if (ok) {
        onUpdate({ ...entry, date: nextDate });
      } else if (dateInputRef.current) {
        dateInputRef.current.value = entry.date;
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const ok = await deleteNihuyasiEntry(entry.id);

      if (ok) {
        onDelete(entry.id);
      }
    });
  }

  function openDatePicker() {
    dateInputRef.current?.showPicker?.();
    dateInputRef.current?.click();
  }

  return (
    <li className={`nihuyasi-entry${isPending ? " is-pending" : ""}`}>
      <textarea
        ref={textRef}
        className="nihuyasi-entry-text"
        defaultValue={entry.text}
        rows={1}
        onBlur={saveText}
        onInput={() => resizeTextarea(textRef.current)}
        disabled={isPending}
      />

      <div className="nihuyasi-entry-meta">
        <button
          type="button"
          className="nihuyasi-entry-date-btn"
          onClick={openDatePicker}
          disabled={isPending}
        >
          {formatNihuyasiDateHeader(entry.date)}
        </button>
        <input
          ref={dateInputRef}
          type="date"
          className="nihuyasi-date-input-hidden"
          defaultValue={entry.date}
          onChange={(event) => saveDate(event.target.value)}
          tabIndex={-1}
          aria-hidden="true"
        />
        <button
          type="button"
          className="text-button nihuyasi-entry-delete"
          onClick={handleDelete}
          disabled={isPending}
        >
          Удалить
        </button>
      </div>
    </li>
  );
}

export function NihuyasiPageContent({
  initialEntries,
}: NihuyasiPageContentProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState(initialEntries);
  const [isPending, startTransition] = useTransition();
  const todayDate = formatLocalIsoDate();

  const handleTextareaResize = useCallback(() => {
    resizeTextarea(textRef.current);
  }, []);

  const groupedEntries = useMemo(
    () => groupNihuyasiByDate(entries),
    [entries]
  );

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = textRef.current?.value ?? "";
    const date = dateRef.current?.value ?? todayDate;
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    startTransition(async () => {
      const created = await createNihuyasiEntry(trimmed, date);

      if (!created) {
        return;
      }

      setEntries((current) => sortNihuyasiEntries([created, ...current]));

      if (textRef.current) {
        textRef.current.value = "";
        resizeTextarea(textRef.current);
        textRef.current.focus();
      }
    });
  }

  function handleUpdate(updated: NihuyasiEntry) {
    setEntries((current) =>
      sortNihuyasiEntries(
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      )
    );
  }

  function handleDelete(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <div className="nihuyasi-page-content">
      {groupedEntries.length === 0 ? (
        <div className="empty-state">
          <p>Пока нет записей</p>
        </div>
      ) : (
        <div className="nihuyasi-feed">
          {groupedEntries.map(([date, groupEntries]) => (
            <section key={date} className="nihuyasi-date-group">
              <h2 className="nihuyasi-date-heading">
                {formatNihuyasiDateHeader(date)}
              </h2>
              <ul className="nihuyasi-entry-list">
                {groupEntries.map((entry) => (
                  <NihuyasiEntryRow
                    key={entry.id}
                    entry={entry}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="doc-section nihuyasi-create-section">
        <div className="section-header">
          <h2 className="section-label">Новая запись</h2>
        </div>

        <form className="nihuyasi-create-form" onSubmit={handleCreate}>
          <div className="notion-property">
            <label htmlFor="nihuyasi-text" className="notion-property-label">
              Текст
            </label>
            <div className="notion-property-value">
              <textarea
                ref={textRef}
                id="nihuyasi-text"
                rows={3}
                placeholder="Новая Нихуяся…"
                disabled={isPending}
                onInput={handleTextareaResize}
              />
            </div>
          </div>

          <div className="notion-property">
            <label htmlFor="nihuyasi-date" className="notion-property-label">
              Дата
            </label>
            <div className="notion-property-value">
              <input
                ref={dateRef}
                id="nihuyasi-date"
                type="date"
                defaultValue={todayDate}
                disabled={isPending}
              />
            </div>
          </div>

          <button type="submit" className="ghost-button" disabled={isPending}>
            Добавить
          </button>
        </form>
      </section>
    </div>
  );
}
