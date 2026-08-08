"use client";

import { createNihuyasiEntry } from "@/app/nihuyasi/actions";
import { formatLocalIsoDate } from "@/lib/format";
import { NIHUYASI_ERROR_MESSAGES } from "@/lib/nihuyasi";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export function QuickNihuyasiModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = textareaRef.current?.value.trim() ?? "";

    if (!text) {
      setError("Введите текст");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createNihuyasiEntry(text, formatLocalIsoDate());

      if (!result.ok) {
        setError(NIHUYASI_ERROR_MESSAGES[result.error]);
        return;
      }

      window.dispatchEvent(new CustomEvent("nihuyasi:created", { detail: result.entry }));
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="quick-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="quick-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-nihuyasi-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="quick-nihuyasi-title">Добавить Нихуяси</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            rows={5}
            placeholder="Что произошло?"
            disabled={isPending}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          {error && <p className="quick-modal-error" role="alert">{error}</p>}
          <div className="quick-modal-actions">
            <button type="button" className="text-button" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="primary-button" disabled={isPending}>
              {isPending ? "Сохранение…" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
