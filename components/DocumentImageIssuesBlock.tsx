"use client";

import {
  getDocumentImageImportUserId,
  resolveDocumentImageIssueFromMaterial,
  resolveDocumentImageIssueFromUpload,
} from "@/app/documents/markdown-image-actions";
import { MATERIAL_IMAGE_ACCEPT, validateMaterialImage } from "@/lib/materialImageUploadClient";
import {
  DOCUMENT_IMAGE_IMPORTS_BUCKET,
  documentImageImportStoragePath,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/client";
import type { DocumentImageIssue, Material } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  documentId: string;
  issues: DocumentImageIssue[];
  materials: Material[];
};

export function DocumentImageIssuesBlock({ documentId, issues, materials }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const imageMaterials = materials.filter((material) => material.material_type === "image");

  function finish(result: { ok: boolean; error?: string }) {
    if (!result.ok) setMessage(result.error ?? "Не удалось исправить изображение");
    else setMessage(null);
    router.refresh();
  }

  async function upload(issue: DocumentImageIssue, file: File) {
    try {
      const extension = validateMaterialImage(file);
      const auth = await getDocumentImageImportUserId();
      if (!auth.ok) throw new Error(auth.error);
      const assetId = crypto.randomUUID();
      const stagingPath = documentImageImportStoragePath(auth.userId, documentId, assetId, extension);
      const supabase = createClient();
      const { error } = await supabase.storage.from(DOCUMENT_IMAGE_IMPORTS_BUCKET).upload(stagingPath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      finish(await resolveDocumentImageIssueFromUpload({
        documentId,
        assetId,
        imageNumber: issue.image_number,
        expectedSrc: issue.original_src,
        alt: issue.alt,
        title: issue.title,
        stagingPath,
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить изображение");
    }
  }

  return (
    <section className="doc-section publication-images-section">
      <div className="section-header"><h2 className="section-label">Проблемные иллюстрации</h2></div>
      <ol className="document-image-issues">
        {issues.map((issue) => (
          <li key={issue.id} className="document-image-issue">
            <h3>Изображение №{issue.image_number}</h3>
            <dl>
              <div><dt>Alt</dt><dd>{issue.alt || "—"}</dd></div>
              <div><dt>Title</dt><dd>{issue.title || "—"}</dd></div>
              <div><dt>Исходный src</dt><dd><code>{issue.original_src}</code></dd></div>
              <div><dt>Причина</dt><dd>{issue.reason}</dd></div>
            </dl>
            <div className="document-image-issue-actions">
              <label className="ghost-button">
                Загрузить напрямую
                <input
                  className="visually-hidden"
                  type="file"
                  accept={MATERIAL_IMAGE_ACCEPT}
                  disabled={isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) startTransition(() => upload(issue, file));
                  }}
                />
              </label>
              <form onSubmit={(event) => {
                event.preventDefault();
                const materialId = new FormData(event.currentTarget).get("material_id");
                if (typeof materialId !== "string" || !materialId) return;
                startTransition(async () => finish(await resolveDocumentImageIssueFromMaterial({
                  documentId,
                  materialId,
                  imageNumber: issue.image_number,
                  expectedSrc: issue.original_src,
                  alt: issue.alt,
                  title: issue.title,
                })));
              }}>
                <select name="material_id" defaultValue="" disabled={isPending} required>
                  <option value="">Выбрать связанный image Material…</option>
                  {imageMaterials.map((material) => <option key={material.id} value={material.id}>{material.title}</option>)}
                </select>
                <button type="submit" className="ghost-button" disabled={isPending}>Использовать</button>
              </form>
            </div>
          </li>
        ))}
      </ol>
      {message ? <p className="publication-image-message" role="status">{message}</p> : null}
    </section>
  );
}
