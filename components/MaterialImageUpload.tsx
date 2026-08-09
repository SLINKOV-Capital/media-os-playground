"use client";

import { saveMaterialImageUpload } from "@/app/materials/image-actions";
import { MaterialImagePreview } from "@/components/MaterialImagePreview";
import {
  MAX_PREVIEW_INPUT_BYTES,
  resizeImageToWebp,
} from "@/lib/materialPreviewResize";
import {
  getMaterialPreviewPublicUrl,
  MATERIAL_IMAGES_BUCKET,
  MATERIAL_PREVIEWS_BUCKET,
  type MaterialImageExtension,
  materialImageStoragePath,
  materialImageStoragePaths,
  materialPreviewStoragePath,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

const MIME_EXTENSIONS: Record<string, MaterialImageExtension> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
    const extension = MIME_EXTENSIONS[file.type];
    if (!extension) {
      setError("Поддерживаются AVIF, GIF, JPEG, PNG и WebP");
      return;
    }
    if (file.size === 0 || file.size > MAX_PREVIEW_INPUT_BYTES) {
      setError("Размер изображения должен быть не больше 20 МБ");
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

      const sourcePath = materialImageStoragePath(user.id, materialId, extension);
      const previewPath = materialPreviewStoragePath(user.id, materialId);
      const previewBlob = await resizeImageToWebp(file);
      const [{ error: sourceError }, { error: previewError }] = await Promise.all([
        supabase.storage.from(MATERIAL_IMAGES_BUCKET).upload(sourcePath, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: true,
        }),
        supabase.storage.from(MATERIAL_PREVIEWS_BUCKET).upload(previewPath, previewBlob, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: true,
        }),
      ]);
      if (sourceError || previewError) {
        throw new Error(sourceError?.message ?? previewError?.message);
      }

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
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
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
