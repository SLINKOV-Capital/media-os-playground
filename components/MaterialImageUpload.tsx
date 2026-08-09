"use client";

import { saveMaterialImageUpload } from "@/app/materials/image-actions";
import { MaterialImagePreview } from "@/components/MaterialImagePreview";
import {
  MATERIAL_IMAGE_ACCEPT,
  uploadMaterialImageFiles,
  validateMaterialImage,
} from "@/lib/materialImageUploadClient";
import {
  getMaterialPreviewPublicUrl,
  MATERIAL_IMAGES_BUCKET,
  materialImageStoragePaths,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type Props = {
  materialId: string;
  title: string;
  previewUrl: string | null;
};

export function MaterialImageUpload({ materialId, title, previewUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(previewUrl);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function upload(file: File) {
    try {
      validateMaterialImage(file);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Некорректный файл");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("auth_required");

      const { extension, sourcePath } = await uploadMaterialImageFiles({
        supabase,
        userId: user.id,
        materialId,
        file,
      });

      startTransition(async () => {
        const result = await saveMaterialImageUpload(materialId, extension);
        if (!result.ok) {
          setError(result.error);
          return;
        }

        const obsoletePaths = materialImageStoragePaths(user.id, materialId).filter(
          (path) => path !== sourcePath
        );
        await supabase.storage.from(MATERIAL_IMAGES_BUCKET).remove(obsoletePaths);
        const publicPreview = getMaterialPreviewPublicUrl(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          user.id,
          materialId
        );
        setPreview(`${publicPreview}?t=${Date.now()}`);
        router.refresh();
      });
    } catch (failure) {
      console.error("Failed to upload Material image:", failure);
      setError("Не удалось загрузить изображение");
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || isPending;

  return (
    <section className="material-image-source-section">
      {preview && (
        <div className="material-image-preview-wrap">
          <MaterialImagePreview src={preview} alt={title} variant="card" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={MATERIAL_IMAGE_ACCEPT}
        hidden
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="material-preview-upload">
        <button
          type="button"
          className="ghost-button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Загрузка…" : "Загрузить изображение"}
        </button>
        <span className="notion-property-optional-tag">до 20 МБ</span>
      </div>
      {error && <p className="material-preview-error" role="alert">{error}</p>}
    </section>
  );
}
