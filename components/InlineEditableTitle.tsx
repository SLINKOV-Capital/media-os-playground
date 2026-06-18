"use client";

import type { ActionResult } from "@/lib/actionResult";
import { ACTION_ERROR_MESSAGES } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

type InlineEditableTitleProps = {
  value: string;
  onSave: (value: string) => Promise<ActionResult>;
  onDraftChange?: (value: string) => void;
  inputClassName?: string;
  placeholder?: string;
};

export function InlineEditableTitle({
  value,
  onSave,
  onDraftChange,
  inputClassName = "doc-page-title",
  placeholder = "Без названия",
}: InlineEditableTitleProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef(value);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(value);
    lastSaved.current = value;
    onDraftChange?.(value);
  }, [value, onDraftChange]);

  function updateDraft(next: string) {
    setDraft(next);
    onDraftChange?.(next);
  }

  function commit() {
    const trimmed = draft.trim();

    if (trimmed === lastSaved.current) {
      return;
    }

    if (!trimmed) {
      updateDraft(lastSaved.current);
      setError(ACTION_ERROR_MESSAGES.empty);
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

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }

    if (event.key === "Escape") {
      updateDraft(lastSaved.current);
      setError(null);
    }
  }

  return (
    <div className="inline-editable-title">
      <input
        type="text"
        className={`inline-editable-title-input ${inputClassName}`}
        value={draft}
        onChange={(event) => {
          updateDraft(event.target.value);
          setError(null);
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isPending}
        aria-invalid={error ? true : undefined}
      />
      {error && <p className="inline-editable-title-error">{error}</p>}
    </div>
  );
}
