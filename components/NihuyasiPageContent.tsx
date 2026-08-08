"use client";

import {
  createNihuyasiEntry,
  deleteNihuyasiEntry,
  updateNihuyasiDate,
  updateNihuyasiText,
} from "@/app/nihuyasi/actions";
import { LinkifiedText } from "@/components/LinkifiedText";
import { NihuyasiStrip } from "@/components/NihuyasiStrip";
import {
  formatLocalIsoDate,
  formatNihuyasiDateHeader,
  groupNihuyasiByDate,
  sortNihuyasiEntries,
} from "@/lib/format";
import type { NihuyasiEntry } from "@/lib/types";
import type { NihuyasiErrorCode } from "@/lib/nihuyasi";
import { useNihuyasiActionError } from "@/lib/useNihuyasiActionError";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

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
  onError,
}: {
  entry: NihuyasiEntry;
  onUpdate: (entry: NihuyasiEntry) => void;
  onDelete: (id: string) => void;
  onError: (error: NihuyasiErrorCode) => void;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedText = useRef(entry.text);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    lastSavedText.current = entry.text;
  }, [entry.text]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const textarea = textRef.current;

    if (!textarea) {
      return;
    }

    textarea.value = entry.text;
    resizeTextarea(textarea);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [isEditing, entry.text]);

  function saveText() {
    const text = textRef.current?.value.trim() ?? "";

    if (!text) {
      if (textRef.current) {
        textRef.current.value = lastSavedText.current;
      }

      setIsEditing(false);
      return;
    }

    if (text === lastSavedText.current) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateNihuyasiText(entry.id, text);

        if (!result.ok) {
          onError(result.error);

          if (textRef.current) {
            textRef.current.value = lastSavedText.current;
          }

          setIsEditing(false);
          return;
        }

        lastSavedText.current = text;
        onUpdate({ ...entry, text });
        setIsEditing(false);
      } catch (caught) {
        console.error("Failed to update nihuyasi text:", caught);
        onError("save_failed");

        if (textRef.current) {
          textRef.current.value = lastSavedText.current;
        }

        setIsEditing(false);
      }
    });
  }

  function saveDate(nextDate: string) {
    if (!nextDate || nextDate === entry.date) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateNihuyasiDate(entry.id, nextDate);

        if (!result.ok) {
          onError(result.error);

          if (dateInputRef.current) {
            dateInputRef.current.value = entry.date;
          }

          return;
        }

        onUpdate({ ...entry, date: nextDate });
      } catch (caught) {
        console.error("Failed to update nihuyasi date:", caught);
        onError("save_failed");

        if (dateInputRef.current) {
          dateInputRef.current.value = entry.date;
        }
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteNihuyasiEntry(entry.id);

        if (!result.ok) {
          onError(result.error);
          return;
        }

        onDelete(entry.id);
      } catch (caught) {
        console.error("Failed to delete nihuyasi entry:", caught);
        onError("save_failed");
      }
    });
  }

  function openDatePicker() {
    dateInputRef.current?.showPicker?.();
    dateInputRef.current?.click();
  }

  return (
    <li className={`nihuyasi-entry${isPending ? " is-pending" : ""}`}>
      {isEditing ? (
        <textarea
          ref={textRef}
          className="nihuyasi-entry-text"
          defaultValue={entry.text}
          rows={1}
          onBlur={saveText}
          onInput={() => resizeTextarea(textRef.current)}
          disabled={isPending}
        />
      ) : (
        <button
          type="button"
          className="nihuyasi-entry-text-view"
          onClick={() => setIsEditing(true)}
          disabled={isPending}
        >
          <LinkifiedText text={entry.text} />
        </button>
      )}

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

function filterNihuyasiEntries(
  entries: NihuyasiEntry[],
  query: string
): NihuyasiEntry[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return entries;
  }

  return entries.filter((entry) => {
    const dateLabel = formatNihuyasiDateHeader(entry.date).toLowerCase();

    return (
      entry.text.toLowerCase().includes(normalized) ||
      entry.date.includes(normalized) ||
      dateLabel.includes(normalized)
    );
  });
}

export function NihuyasiPageContent({
  initialEntries,
}: NihuyasiPageContentProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState(initialEntries);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [todayDate, setTodayDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const handleActionError = useNihuyasiActionError(setError);

  useEffect(() => {
    setTodayDate(formatLocalIsoDate());
  }, []);

  useEffect(() => {
    function handleQuickCreate(event: Event) {
      const entry = (event as CustomEvent<NihuyasiEntry>).detail;
      setEntries((current) => sortNihuyasiEntries([entry, ...current]));
    }

    window.addEventListener("nihuyasi:created", handleQuickCreate);
    return () => window.removeEventListener("nihuyasi:created", handleQuickCreate);
  }, []);

  const handleTextareaResize = useCallback(() => {
    resizeTextarea(textRef.current);
  }, []);

  const filteredEntries = useMemo(
    () => filterNihuyasiEntries(entries, searchQuery),
    [entries, searchQuery]
  );

  const groupedEntries = useMemo(
    () => groupNihuyasiByDate(filteredEntries),
    [filteredEntries]
  );

  const hasEntries = entries.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = textRef.current?.value ?? "";
    const date = dateRef.current?.value ?? todayDate ?? "";
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await createNihuyasiEntry(trimmed, date);

        if (!result.ok) {
          handleActionError(result.error);
          return;
        }

        setEntries((current) =>
          sortNihuyasiEntries([result.entry, ...current])
        );

        if (textRef.current) {
          textRef.current.value = "";
          resizeTextarea(textRef.current);
          textRef.current.focus();
        }
      } catch (caught) {
        console.error("Failed to create nihuyasi entry:", caught);
        setError("Не удалось сохранить запись");
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
                key={todayDate ?? "pending"}
                defaultValue={todayDate ?? undefined}
                disabled={isPending || !todayDate}
              />
            </div>
          </div>

          <button type="submit" className="ghost-button" disabled={isPending}>
            Добавить
          </button>
        </form>

        {error && (
          <p className="nihuyasi-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <NihuyasiStrip entries={entries} days={30} />

      {hasEntries && (
        <div className="nihuyasi-toolbar">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по тексту или дате…"
            className="nihuyasi-search-input"
            aria-label="Поиск по записям"
          />
        </div>
      )}

      {!hasEntries ? (
        <div className="empty-state">
          <p>Пока нет записей</p>
        </div>
      ) : groupedEntries.length === 0 ? (
        <div className="empty-state">
          <p>Ничего не найдено</p>
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
                    onError={handleActionError}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {hasSearchQuery && groupedEntries.length > 0 && (
        <p className="nihuyasi-search-meta">
          Найдено: {filteredEntries.length}
        </p>
      )}
    </div>
  );
}
