"use client";

import { updateMaterial } from "@/app/documents/actions";
import { MaterialPreviewUpload } from "@/components/MaterialPreviewUpload";
import { MaterialTypeSelect } from "@/components/MaterialTypeSelect";
import type { Material } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type MaterialPropertiesEditorProps = {
  material: Material;
};

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function MaterialPropertiesEditor({
  material,
}: MaterialPropertiesEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [materialType, setMaterialType] = useState(material.material_type);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedType = useRef(material.material_type);
  const lastSavedUrl = useRef(material.file_url_or_path ?? "");
  const lastSavedNotes = useRef(material.notes ?? "");

  useEffect(() => {
    resizeTextarea(contentRef.current);
  }, [material.notes]);

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
          setMaterialType(value);
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
            onChange={(event) => {
              setMaterialType(event.target.value);
              saveField("material_type", event.target.value);
            }}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="notion-property notion-property-optional">
        <label
          htmlFor={`material-url-${material.id}`}
          className="notion-property-label"
        >
          <span className="notion-property-label-primary">URL / путь</span>
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

      <MaterialPreviewUpload
        materialId={material.id}
        materialType={materialType}
        previewUrl={material.preview_url}
        title={material.title}
      />

      <div className="material-content-block">
        <label
          htmlFor={`material-content-${material.id}`}
          className="material-content-label"
        >
          <span className="notion-property-label-primary">Содержимое</span>
          <span className="notion-property-optional-tag">необязательно</span>
        </label>
        <textarea
          ref={contentRef}
          id={`material-content-${material.id}`}
          className="material-content-field"
          rows={4}
          defaultValue={material.notes ?? ""}
          placeholder="Markdown: текст, списки, ссылки…"
          disabled={isPending}
          onInput={() => resizeTextarea(contentRef.current)}
          onBlur={(event) => saveField("notes", event.target.value)}
        />
      </div>
    </div>
  );
}
