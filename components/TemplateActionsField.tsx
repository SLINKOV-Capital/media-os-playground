"use client";

import { useState } from "react";

type TemplateActionsFieldProps = {
  defaultValue?: string;
};

export function TemplateActionsField({
  defaultValue = "",
}: TemplateActionsFieldProps) {
  const initialLines = defaultValue
    ? defaultValue.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];

  const [lines, setLines] = useState<string[]>(
    initialLines.length > 0 ? initialLines : [""]
  );

  const serialized = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  function updateLine(index: number, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? value : line))
    );
  }

  function addLine() {
    setLines((current) => [...current, ""]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.length <= 1 ? [""] : current.filter((_, lineIndex) => lineIndex !== index)
    );
  }

  return (
    <div className="form-field template-actions-field">
      <span className="form-field-label">Действия</span>
      <p className="form-field-hint">Шаги workflow — по одному на строку</p>

      <ul className="template-action-list">
        {lines.map((line, index) => (
          <li key={index} className="template-action-item">
            <span className="template-action-marker" aria-hidden="true" />
            <input
              type="text"
              value={line}
              onChange={(event) => updateLine(index, event.target.value)}
              placeholder="Название шага"
              className="template-action-input"
            />
            {lines.length > 1 && (
              <button
                type="button"
                className="template-action-remove"
                aria-label="Удалить шаг"
                onClick={() => removeLine(index)}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      <button type="button" className="template-action-add" onClick={addLine}>
        + Добавить шаг
      </button>

      <textarea
        name="action_titles"
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        className="template-actions-serialized"
        value={serialized}
      />
    </div>
  );
}
