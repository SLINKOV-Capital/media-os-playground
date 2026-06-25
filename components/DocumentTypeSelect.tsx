"use client";

import { updateDocumentType } from "@/app/documents/actions";
import { formatActionError } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type DocumentTypeSelectProps = {
  documentId: string;
  value: string;
  templateTypes: string[];
  disabled?: boolean;
};

export function DocumentTypeSelect({
  documentId,
  value,
  templateTypes,
  disabled = false,
}: DocumentTypeSelectProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const options = useMemo(() => {
    const unique = new Set(templateTypes);

    if (value.trim()) {
      unique.add(value.trim());
    }

    return [...unique].sort((a, b) => a.localeCompare(b, "ru"));
  }, [templateTypes, value]);

  const isOrphanType = value.trim() && !templateTypes.includes(value.trim());

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    if (disabled) {
      return;
    }

    const nextType = event.target.value;

    if (nextType === value) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", documentId);
      formData.set("document_type", nextType);
      const result = await updateDocumentType(formData);

      if (result.ok) {
        router.refresh();
        return;
      }

      setError(formatActionError(result));
      router.refresh();
    });
  }

  return (
    <div className="doc-page-type-row">
      <label htmlFor={`doc-type-${documentId}`} className="doc-page-type-label">
        Тип документа
      </label>
      <select
        id={`doc-type-${documentId}`}
        className="doc-page-type-select"
        value={value}
        disabled={isPending || disabled}
        onChange={handleChange}
      >
        {options.map((type) => (
          <option key={type} value={type}>
            {type}
            {isOrphanType && type === value ? " (устаревший)" : ""}
          </option>
        ))}
      </select>
      {disabled && (
        <p className="doc-page-type-hint">
          Тип нельзя менять после публикации на сайте
        </p>
      )}
      {isOrphanType && !disabled && (
        <p className="doc-page-type-hint">
          Тип не найден среди шаблонов — выберите актуальный
        </p>
      )}
      {error && <p className="doc-page-type-error">{error}</p>}
    </div>
  );
}
