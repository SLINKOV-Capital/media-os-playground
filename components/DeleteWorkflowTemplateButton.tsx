"use client";

import { deleteWorkflowTemplate } from "@/app/templates/actions";
import { formatActionError } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteWorkflowTemplateButtonProps = {
  id: string;
};

export function DeleteWorkflowTemplateButton({
  id,
}: DeleteWorkflowTemplateButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Удалить шаблон?")) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      const result = await deleteWorkflowTemplate(formData);

      if (!result.ok) {
        setError(formatActionError(result));
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="template-delete-wrap">
      <button
        type="button"
        className="collection-delete-button"
        disabled={isPending}
        onClick={handleDelete}
      >
        {isPending ? "…" : "Удалить"}
      </button>
      {error && <p className="template-delete-error">{error}</p>}
    </div>
  );
}
