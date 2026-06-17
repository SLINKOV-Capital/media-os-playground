"use client";

import { createMaterial } from "@/app/documents/actions";
import { useState } from "react";

type MaterialAddControlProps = {
  documentId: string;
};

export function MaterialAddControl({ documentId }: MaterialAddControlProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="notion-new-button material-add-trigger"
        onClick={() => setOpen(true)}
      >
        + Добавить материал
      </button>
    );
  }

  return (
    <form action={createMaterial} className="material-add-form">
      <input type="hidden" name="document_id" value={documentId} />

      <div className="notion-property">
        <label
          htmlFor={`material-title-${documentId}`}
          className="notion-property-label"
        >
          Название
        </label>
        <div className="notion-property-value">
          <input
            id={`material-title-${documentId}`}
            name="title"
            type="text"
            required
            autoFocus
            placeholder="Текст, файл, ссылка…"
          />
        </div>
      </div>

      <div className="notion-property">
        <label
          htmlFor={`material-type-${documentId}`}
          className="notion-property-label"
        >
          Тип
          <span className="notion-property-label-hint">article, pdf…</span>
        </label>
        <div className="notion-property-value">
          <input
            id={`material-type-${documentId}`}
            name="material_type"
            type="text"
            required
            placeholder="article"
          />
        </div>
      </div>

      <div className="notion-property notion-property-optional">
        <label
          htmlFor={`material-url-${documentId}`}
          className="notion-property-label"
        >
          URL / путь
          <span className="notion-property-optional-tag">необязательно</span>
        </label>
        <div className="notion-property-value">
          <input
            id={`material-url-${documentId}`}
            name="file_url_or_path"
            type="text"
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="notion-property notion-property-optional notion-property-textarea">
        <label
          htmlFor={`material-notes-${documentId}`}
          className="notion-property-label"
        >
          Заметки
          <span className="notion-property-optional-tag">необязательно</span>
        </label>
        <div className="notion-property-value">
          <textarea
            id={`material-notes-${documentId}`}
            name="notes"
            rows={2}
            placeholder="Комментарий"
          />
        </div>
      </div>

      <div className="material-add-actions">
        <button type="submit" className="ghost-button">
          Добавить
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => setOpen(false)}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
