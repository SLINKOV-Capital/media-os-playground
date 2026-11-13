"use client";

import { deleteMaterial, restoreMaterial } from "@/app/documents/actions";
import { formatActionError } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteMaterialButton({ materialId, archived = false }: { materialId: string; archived?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(archived ? "Восстановить материал?" : "Переместить материал в архив? Связи и файлы сохранятся.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", materialId);
      const result = archived ? await restoreMaterial(formData) : await deleteMaterial(formData);

      if (!result.ok) {
        setError(formatActionError(result));
        return;
      }

      router.push(archived ? "/materials" : "/materials?archived=true");
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
        {isPending ? (archived ? "Восстанавливаю…" : "Перемещаю…") : (archived ? "Восстановить материал" : "В архив")}
      </button>
      {error && <p className="material-preview-error">{error}</p>}
    </div>
  );
}
