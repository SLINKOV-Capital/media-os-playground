"use client";

import type { ActionResult } from "@/lib/actionResult";
import { ACTION_ERROR_MESSAGES } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type PageTitleProps = {
  value: string;
  onSave?: (value: string) => Promise<ActionResult>;
  onDraftChange?: (value: string) => void;
  placeholder?: string;
  leading?: ReactNode;
};

function normalizeTitle(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function PageTitle({
  value,
  onSave,
  onDraftChange,
  placeholder = "Без названия",
  leading,
}: PageTitleProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef(value);
  const [isPending, startTransition] = useTransition();
  const readOnly = !onSave;

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    setDraft(value);
    lastSaved.current = value;
    onDraftChange?.(value);
  }, [value, onDraftChange]);

  useEffect(() => {
    if (!readOnly) {
      resizeTextarea();
    }
  }, [draft, readOnly, resizeTextarea]);

  function updateDraft(next: string) {
    setDraft(next);
    onDraftChange?.(next);
  }

  function commit() {
    const trimmed = normalizeTitle(draft);

    if (trimmed === lastSaved.current) {
      return;
    }

    if (!trimmed) {
      updateDraft(lastSaved.current);
      setError(ACTION_ERROR_MESSAGES.empty);
      return;
    }

    if (!onSave) {
      return;
    }

    startTransition(async () => {
      const result = await onSave(trimmed);

      if (result.ok) {
        lastSaved.current = trimmed;
        updateDraft(trimmed);
        setError(null);
        router.refresh();
        return;
      }

      setError(ACTION_ERROR_MESSAGES[result.error]);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      updateDraft(lastSaved.current);
      setError(null);
      return;
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  }

  const titleNode = readOnly ? (
    <h1 className="page-title page-title-static">{value}</h1>
  ) : (
    <textarea
      ref={textareaRef}
      className="page-title page-title-field"
      value={draft}
      rows={1}
      onChange={(event) => {
        updateDraft(event.target.value);
        setError(null);
        resizeTextarea();
      }}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={isPending}
      aria-label="Заголовок страницы"
      aria-invalid={error ? true : undefined}
    />
  );

  return (
    <div
      className={`page-title-block${leading ? " page-title-block-with-leading" : ""}`}
      data-page-title
    >
      {leading}
      <div className="page-title-wrap">
        {titleNode}
        {error && <p className="page-title-error">{error}</p>}
      </div>
    </div>
  );
}
