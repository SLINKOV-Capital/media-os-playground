"use client";

import {
  getDocumentImageImportUserId,
  processStagedDocumentImage,
} from "@/app/documents/markdown-image-actions";
import {
  addDocumentIllustrationFromMaterial,
  makeDocumentCoverFromMaterial,
  removeDocumentPublicationImage,
  reorderDocumentIllustrations,
  updateDocumentPublicationImage,
} from "@/app/documents/publication-image-actions";
import { MATERIAL_IMAGE_ACCEPT, validateMaterialImage } from "@/lib/materialImageUploadClient";
import {
  DOCUMENT_IMAGE_IMPORTS_BUCKET,
  documentImageImportStoragePath,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/client";
import type { DocumentPublicationImage, Material } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type Props = {
  documentId: string;
  assets: DocumentPublicationImage[];
  materials: Material[];
};

function markdownFor(asset: DocumentPublicationImage) {
  const alt = asset.alt.replace(/\]/g, "\\]");
  const title = asset.title?.replace(/"/g, '\\"');
  return `![${alt}](${asset.image_url}${title ? ` "${title}"` : ""})`;
}

export function DocumentPublicationImagesBlock({
  documentId,
  assets: initialAssets,
  materials,
}: Props) {
  const router = useRouter();
  const [assets, setAssets] = useState(initialAssets);
  const [coverMaterialId, setCoverMaterialId] = useState("");
  const [illustrationMaterialId, setIllustrationMaterialId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setAssets(initialAssets), [initialAssets]);

  const cover = assets.find((asset) => asset.role === "cover") ?? null;
  const illustrations = useMemo(
    () =>
      assets
        .filter((asset) => asset.role === "illustration")
        .sort((a, b) => a.sort_order - b.sort_order),
    [assets]
  );
  const imageMaterials = materials.filter(
    (material) => material.material_type === "image"
  );

  function refreshAfter(result: { ok: boolean; error?: string }) {
    if (!result.ok) {
      setMessage(result.error ?? "Не удалось выполнить действие");
      return;
    }
    setMessage(null);
    router.refresh();
  }

  function saveFields(asset: DocumentPublicationImage, form: HTMLFormElement) {
    const formData = new FormData(form);
    formData.set("id", asset.id);
    formData.set("document_id", documentId);
    startTransition(async () => refreshAfter(await updateDocumentPublicationImage(formData)));
  }

  function moveIllustration(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= illustrations.length) return;
    const next = [...illustrations];
    [next[index], next[target]] = [next[target], next[index]];
    const nextIds = next.map((asset) => asset.id);
    setAssets((current) => [
      ...current.filter((asset) => asset.role === "cover"),
      ...next.map((asset, sortOrder) => ({ ...asset, sort_order: sortOrder })),
    ]);
    startTransition(async () => refreshAfter(await reorderDocumentIllustrations(documentId, nextIds)));
  }

  async function copyMarkdown(asset: DocumentPublicationImage) {
    await navigator.clipboard.writeText(markdownFor(asset));
    setMessage("Markdown скопирован");
  }

  async function uploadCover(file: File) {
    try {
      const extension = validateMaterialImage(file);
      const auth = await getDocumentImageImportUserId();
      if (!auth.ok) throw new Error(auth.error);
      const assetId = crypto.randomUUID();
      const stagingPath = documentImageImportStoragePath(
        auth.userId,
        documentId,
        assetId,
        extension
      );
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(DOCUMENT_IMAGE_IMPORTS_BUCKET)
        .upload(stagingPath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw error;
      const result = await processStagedDocumentImage({
        documentId,
        assetId,
        imageNumber: 1,
        alt: file.name.replace(/\.[^.]+$/, ""),
        title: null,
        stagingPath,
      });
      refreshAfter(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить обложку");
    }
  }

  return (
    <section className="doc-section publication-images-section">
      <div className="section-header">
        <h2 className="section-label">Изображения для публикации</h2>
      </div>

      <div className="publication-image-group">
        <h3 className="publication-image-heading">Обложка</h3>
        {cover ? (
          <article className="publication-image-card publication-cover-card">
            <img src={cover.image_url} alt={cover.alt} className="publication-image-preview" />
            <form
              className="publication-image-fields"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  saveFields(cover, event.currentTarget);
                }
              }}
            >
              <label>
                <span>Alt</span>
                <input name="alt" defaultValue={cover.alt} placeholder="Описание изображения" />
              </label>
              {cover.source_material && (
                <p className="publication-image-source">
                  Источник: <Link href={`/materials/${cover.source_material.id}`}>{cover.source_material.title}</Link>
                </p>
              )}
            </form>
            <button
              type="button"
              className="destructive-link"
              disabled={isPending}
              onClick={() =>
                startTransition(async () =>
                  refreshAfter(await removeDocumentPublicationImage(documentId, cover.id))
                )
              }
            >
              Удалить обложку
            </button>
          </article>
        ) : (
          <p className="empty-text">Обложка обязательна для публикации.</p>
        )}

        <div className="publication-image-add-row">
          <label className="ghost-button">
            Загрузить обложку
            <input
              className="visually-hidden"
              type="file"
              accept={MATERIAL_IMAGE_ACCEPT}
              disabled={isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) startTransition(() => uploadCover(file));
              }}
            />
          </label>
          <select
            value={coverMaterialId}
            onChange={(event) => setCoverMaterialId(event.target.value)}
            disabled={isPending || imageMaterials.length === 0}
          >
            <option value="">Выбрать связанный image Material…</option>
            {imageMaterials.map((material) => (
              <option key={material.id} value={material.id}>{material.title}</option>
            ))}
          </select>
          <button
            type="button"
            className="ghost-button"
            disabled={isPending || !coverMaterialId}
            onClick={() =>
              startTransition(async () => {
                const result = await makeDocumentCoverFromMaterial(documentId, coverMaterialId);
                if (result.ok) setCoverMaterialId("");
                refreshAfter(result);
              })
            }
          >
            Сделать обложку
          </button>
        </div>
      </div>

      <div className="publication-image-group">
        <h3 className="publication-image-heading">Иллюстрации</h3>
        {illustrations.length === 0 ? (
          <p className="empty-text">Иллюстрации не выбраны.</p>
        ) : (
          <ol className="publication-images-list">
            {illustrations.map((asset, index) => (
              <li key={asset.id} className="publication-image-card">
                <img src={asset.image_url} alt={asset.alt} className="publication-image-preview" />
                <form
                  className="publication-image-fields"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      saveFields(asset, event.currentTarget);
                    }
                  }}
                >
                  <label>
                    <span>Подпись</span>
                    <input name="title" defaultValue={asset.title ?? ""} />
                  </label>
                  <label>
                    <span>Alt</span>
                    <input name="alt" defaultValue={asset.alt} />
                  </label>
                  {asset.source_material && (
                    <p className="publication-image-source">
                      Источник: <Link href={`/materials/${asset.source_material.id}`}>{asset.source_material.title}</Link>
                    </p>
                  )}
                </form>
                <div className="publication-markdown-row">
                  <code>{markdownFor(asset)}</code>
                  <button type="button" className="ghost-button" onClick={() => copyMarkdown(asset)}>
                    Копировать
                  </button>
                </div>
                <div className="publication-image-actions">
                  <span>Порядок: {index + 1}</span>
                  <button type="button" className="ghost-button" disabled={isPending || index === 0} onClick={() => moveIllustration(index, -1)} aria-label="Поднять иллюстрацию">↑</button>
                  <button type="button" className="ghost-button" disabled={isPending || index === illustrations.length - 1} onClick={() => moveIllustration(index, 1)} aria-label="Опустить иллюстрацию">↓</button>
                  <button
                    type="button"
                    className="destructive-link"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () =>
                        refreshAfter(await removeDocumentPublicationImage(documentId, asset.id))
                      )
                    }
                  >
                    Удалить из иллюстраций
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="publication-image-add-row">
          <select
            value={illustrationMaterialId}
            onChange={(event) => setIllustrationMaterialId(event.target.value)}
            disabled={isPending || imageMaterials.length === 0}
          >
            <option value="">Выбрать связанный image Material…</option>
            {imageMaterials.map((material) => (
              <option key={material.id} value={material.id}>{material.title}</option>
            ))}
          </select>
          <button
            type="button"
            className="ghost-button"
            disabled={isPending || !illustrationMaterialId}
            onClick={() =>
              startTransition(async () => {
                const result = await addDocumentIllustrationFromMaterial(documentId, illustrationMaterialId);
                if (result.ok) setIllustrationMaterialId("");
                refreshAfter(result);
              })
            }
          >
            Добавить иллюстрацию
          </button>
        </div>
      </div>

      {isPending && <p className="publication-image-message">Подготавливаю изображение…</p>}
      {message && <p className="publication-image-message" role="status">{message}</p>}
    </section>
  );
}
