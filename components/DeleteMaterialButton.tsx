"use client";

import { deleteMaterial } from "@/app/documents/actions";
import { formatActionError } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteMaterialButton({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Удалить материал? Связи с документами тоже удалятся.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", materialId);
      const result = await deleteMaterial(formData);

      if (!result.ok) {
        setError(formatActionError(result));
        return;
      }

      router.push("/materials");
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
        {isPending ? "Удаление…" : "Удалить материал"}
      </button>
      {error && <p className="material-preview-error">{error}</p>}
    </div>
  );
}
