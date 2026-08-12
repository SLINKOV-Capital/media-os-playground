"use client";

import { createUploadedImageMaterial } from "@/app/materials/image-actions";
import {
  MATERIAL_IMAGE_ACCEPT,
  removeUploadedMaterialImageFiles,
  uploadMaterialImageFiles,
  validateMaterialImage,
} from "@/lib/materialImageUploadClient";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || "Изображение";
}

export function NewMaterialImageUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    try {
      validateMaterialImage(file);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Некорректный файл");
      return;
    }

    const form = inputRef.current?.closest("form");
    const titleInput = form?.elements.namedItem("title");
    const documentInput = form?.elements.namedItem("document_id");
    const actionInput = form?.elements.namedItem("action_id");
    if (!(titleInput instanceof HTMLInputElement)) return;

    const documentId =
      documentInput instanceof HTMLSelectElement ? documentInput.value : "";
    if (!documentId) {
      setError("Сначала выберите документ");
      return;
    }

    const title = titleInput.value.trim() || titleFromFileName(file.name);
    if (!titleInput.value.trim()) {
      titleInput.value = title;
    }

    setUploading(true);
    setError(null);
    const submitButton = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const materialId = crypto.randomUUID();
    const supabase = createClient();
    let uploadedPaths: { sourcePath: string; previewPath: string } | null = null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("auth_required");

      const uploaded = await uploadMaterialImageFiles({
        supabase,
        userId: user.id,
        materialId,
        file,
      });
      uploadedPaths = uploaded;

      const result = await createUploadedImageMaterial({
        materialId,
        documentId,
        actionId:
          actionInput instanceof HTMLInputElement ? actionInput.value : "",
        title,
        extension: uploaded.extension,
      });
      if (!result.ok) throw new Error(result.error);

      router.push(`/materials/${materialId}`);
      router.refresh();
    } catch (failure) {
      if (uploadedPaths) {
        await removeUploadedMaterialImageFiles({ supabase, ...uploadedPaths });
      }
      console.error("Failed to create image Material:", failure);
      setError(
        failure instanceof Error && failure.message !== "auth_required"
          ? failure.message
          : "Не удалось загрузить изображение"
      );
    } finally {
      if (submitButton) submitButton.disabled = false;
      setUploading(false);
    }
  }

  return (
    <div className="notion-property notion-property-optional">
      <label className="notion-property-label" htmlFor="new-material-image">
        <span className="notion-property-label-primary">Файл изображения</span>
      </label>
      <div className="notion-property-value">
        <input
          ref={inputRef}
          id="new-material-image"
          type="file"
          accept={MATERIAL_IMAGE_ACCEPT}
          className="material-preview-file-input"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        <div className="material-preview-upload material-new-image-upload">
          <button
            type="button"
            className="ghost-button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Загрузка и сохранение…" : "Загрузить изображение"}
          </button>
          <span className="notion-property-optional-tag">
            до 20 МБ · после загрузки Material сохранится автоматически
          </span>
        </div>
        {error && (
          <p className="material-preview-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
