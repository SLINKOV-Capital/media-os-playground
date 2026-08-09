"use client";

import { deleteDraftDocument } from "@/app/documents/delete-actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  documentId: string;
  published: boolean;
};

export function DeleteDocumentButton({ documentId, published }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (published) {
    return (
      <p className="publication-image-message">
        Опубликованный документ удалить нельзя.
      </p>
    );
  }

  function handleDelete() {
    if (
      !window.confirm(
        "Удалить документ? Действия, связи и подготовленные изображения документа тоже будут удалены. Сами Materials сохранятся."
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteDraftDocument(documentId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/documents");
      router.refresh();
    });
  }

  return (
    <div className="material-delete-section">
      <button
        type="button"
        className="material-delete-button"
        disabled={isPending}
        onClick={handleDelete}
      >
        {isPending ? "Удаление…" : "Удалить документ"}
      </button>
      {error && <p className="material-preview-error" role="alert">{error}</p>}
    </div>
  );
}
