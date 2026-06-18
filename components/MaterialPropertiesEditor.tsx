"use client";

import { updateMaterial } from "@/app/documents/actions";
import { MaterialTypeSelect } from "@/components/MaterialTypeSelect";
import type { Material } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

type MaterialPropertiesEditorProps = {
  material: Material;
};

export function MaterialPropertiesEditor({
  material,
}: MaterialPropertiesEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const lastSavedType = useRef(material.material_type);
  const lastSavedUrl = useRef(material.file_url_or_path ?? "");
  const lastSavedNotes = useRef(material.notes ?? "");

  function saveField(
    field: "material_type" | "file_url_or_path" | "notes",
    value: string
  ) {
    if (field === "material_type" && value === lastSavedType.current) {
      return;
    }

    if (field === "file_url_or_path" && value === lastSavedUrl.current) {
      return;
    }

    if (field === "notes" && value === lastSavedNotes.current) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", material.id);
      formData.set(field, value);
      const result = await updateMaterial(formData);

      if (result.ok) {
        if (field === "material_type") {
          lastSavedType.current = value;
        }

        if (field === "file_url_or_path") {
          lastSavedUrl.current = value;
        }

        if (field === "notes") {
          lastSavedNotes.current = value;
        }

        router.refresh();
      }
    });
  }

  return (
    <div className="material-properties-editor">
      <div className="notion-property">
        <label
          htmlFor={`material-type-${material.id}`}
          className="notion-property-label"
        >
          Тип
        </label>
        <div className="notion-property-value">
          <MaterialTypeSelect
            id={`material-type-${material.id}`}
            defaultValue={material.material_type}
            onChange={(event) => saveField("material_type", event.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="notion-property notion-property-optional">
        <label
          htmlFor={`material-url-${material.id}`}
          className="notion-property-label"
        >
          URL / путь
          <span className="notion-property-optional-tag">необязательно</span>
        </label>
        <div className="notion-property-value">
          <input
            id={`material-url-${material.id}`}
            type="text"
            defaultValue={material.file_url_or_path ?? ""}
            placeholder="https://…"
            disabled={isPending}
            onBlur={(event) => saveField("file_url_or_path", event.target.value)}
          />
        </div>
      </div>

      <div className="notion-property notion-property-optional notion-property-textarea">
        <label
          htmlFor={`material-notes-${material.id}`}
          className="notion-property-label"
        >
          Заметки
          <span className="notion-property-optional-tag">необязательно</span>
        </label>
        <div className="notion-property-value">
          <textarea
            id={`material-notes-${material.id}`}
            rows={3}
            defaultValue={material.notes ?? ""}
            placeholder="Комментарий"
            disabled={isPending}
            onBlur={(event) => saveField("notes", event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
