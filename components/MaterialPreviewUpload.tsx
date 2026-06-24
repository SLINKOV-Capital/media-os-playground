"use client";

import { setMaterialPreviewUrl } from "@/app/documents/actions";
import { MaterialImagePreview } from "@/components/MaterialImagePreview";
import { resizeImageToWebp } from "@/lib/materialPreviewResize";
import {
  getMaterialPreviewPublicUrl,
  MATERIAL_PREVIEWS_BUCKET,
  materialPreviewStoragePath,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type MaterialPreviewUploadProps = {
  materialId: string;
  materialType: string;
  previewUrl: string | null;
  title: string;
};

export function MaterialPreviewUpload({
  materialId,
  materialType,
  previewUrl: initialPreviewUrl,
  title,
}: MaterialPreviewUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPreviewUrl(initialPreviewUrl);
  }, [initialPreviewUrl]);

  if (materialType !== "image") {
    return null;
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Выберите файл изображения");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Нужна авторизация");
        return;
      }

      const blob = await resizeImageToWebp(file);
      const path = materialPreviewStoragePath(user.id, materialId);

      const { error: uploadError } = await supabase.storage
        .from(MATERIAL_PREVIEWS_BUCKET)
        .upload(path, blob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        console.error("Failed to upload material preview:", uploadError.message);
        setError("Не удалось загрузить превью");
        return;
      }

      startTransition(async () => {
        const result = await setMaterialPreviewUrl(materialId);

        if (result.ok) {
          const publicUrl = getMaterialPreviewPublicUrl(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            user.id,
            materialId
          );
          setPreviewUrl(`${publicUrl}?t=${Date.now()}`);
          router.refresh();
          return;
        }

        setError("Не удалось сохранить превью");
      });
    } catch (uploadFailure) {
      console.error("Failed to process material preview:", uploadFailure);
      setError("Не удалось обработать изображение");
    } finally {
      setIsUploading(false);
    }
  }

  const busy = isUploading || isPending;

  return (
    <div className="material-preview-section">
      {previewUrl && (
        <div className="material-image-preview-wrap">
          <MaterialImagePreview src={previewUrl} alt={title} variant="card" />
        </div>
      )}

      <div className="material-preview-upload">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="material-preview-file-input"
          onChange={handleFileChange}
          disabled={busy}
        />
        <button
          type="button"
          className="ghost-button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Загрузка…" : "Загрузить превью"}
        </button>
        {error && <p className="material-preview-error">{error}</p>}
      </div>
    </div>
  );
}
