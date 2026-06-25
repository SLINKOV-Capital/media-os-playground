"use client";

import {
  publishDocument,
  toggleDocumentFeatured,
  unpublishDocument,
  updateDocumentContentMd,
  updateDocumentPreview,
} from "@/app/documents/actions";
import { formatActionError } from "@/lib/actionResult";
import { publicDocumentPath, siteStatusLabel } from "@/lib/site";
import type { Document } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type DocumentSiteBlockProps = {
  document: Document;
};

export function DocumentSiteBlock({ document }: DocumentSiteBlockProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(document.preview ?? "");
  const [contentMd, setContentMd] = useState(document.content_md ?? "");
  const [featured, setFeatured] = useState(document.site_featured);
  const lastSavedPreview = useRef(document.preview ?? "");
  const lastSavedContent = useRef(document.content_md ?? "");

  const isPublished = document.site_status === "published";
  const publicUrl =
    isPublished && document.site_slug
      ? publicDocumentPath(document.site_slug)
      : null;

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);

    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        router.refresh();
        return;
      }

      setError(
        formatActionError(result as Extract<typeof result, { ok: false }>)
      );
      router.refresh();
    });
  }

  function savePreview() {
    if (preview === lastSavedPreview.current) {
      return;
    }

    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      formData.set("preview", preview);
      const result = await updateDocumentPreview(formData);

      if (result.ok) {
        lastSavedPreview.current = preview;
      }

      return result;
    });
  }

  function saveContent() {
    if (contentMd === lastSavedContent.current) {
      return;
    }

    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      formData.set("content_md", contentMd);
      const result = await updateDocumentContentMd(formData);

      if (result.ok) {
        lastSavedContent.current = contentMd;
      }

      return result;
    });
  }

  function handlePublish() {
    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      return publishDocument(formData);
    });
  }

  function handleUnpublish() {
    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      return unpublishDocument(formData);
    });
  }

  function handleFeaturedChange(checked: boolean) {
    setFeatured(checked);

    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      formData.set("site_featured", checked ? "true" : "false");
      const result = await toggleDocumentFeatured(formData);

      if (!result.ok) {
        setFeatured(document.site_featured);
      }

      return result;
    });
  }

  return (
    <section className="doc-section doc-site-section">
      <div className="section-header">
        <h2 className="section-label">Публикация на сайте</h2>
        <span
          className={`doc-site-status${isPublished ? " is-published" : ""}`}
        >
          {siteStatusLabel(document.site_status)}
        </span>
      </div>

      {publicUrl && (
        <p className="doc-site-url">
          Публичный URL:{" "}
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            {publicUrl}
          </a>
        </p>
      )}

      <label className="doc-site-field-label" htmlFor={`doc-preview-${document.id}`}>
        Краткое описание (preview)
      </label>
      <textarea
        id={`doc-preview-${document.id}`}
        className="doc-site-preview-input"
        rows={3}
        value={preview}
        disabled={isPending}
        placeholder="Лид для карточки и публичной страницы"
        onChange={(event) => setPreview(event.target.value)}
        onBlur={savePreview}
      />

      <label className="doc-site-field-label" htmlFor={`doc-content-${document.id}`}>
        Текст (Markdown)
      </label>
      <textarea
        id={`doc-content-${document.id}`}
        className="doc-site-content-input"
        rows={18}
        value={contentMd}
        disabled={isPending}
        placeholder="Вставьте Markdown из Google Docs"
        onChange={(event) => setContentMd(event.target.value)}
      />
      <div className="doc-site-actions-row">
        <button
          type="button"
          className="ghost-button"
          disabled={isPending}
          onClick={saveContent}
        >
          {isPending ? "Сохранение…" : "Сохранить текст"}
        </button>
      </div>

      <label className="doc-site-featured">
        <input
          type="checkbox"
          checked={featured}
          disabled={isPending}
          onChange={(event) => handleFeaturedChange(event.target.checked)}
        />
        Избранное на главной
      </label>

      <div className="doc-site-actions-row">
        {isPublished ? (
          <button
            type="button"
            className="ghost-button"
            disabled={isPending}
            onClick={handleUnpublish}
          >
            Снять с публикации
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            disabled={isPending}
            onClick={handlePublish}
          >
            Опубликовать
          </button>
        )}
      </div>

      {error && <p className="doc-site-error">{error}</p>}
    </section>
  );
}
