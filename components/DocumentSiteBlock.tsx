"use client";

import {
  publishDocument,
  toggleDocumentFeatured,
  unpublishDocument,
  updateDocumentContentMd,
  updateDocumentPreview,
  updateDocumentSiteSlug,
} from "@/app/documents/actions";
import { DocumentMarkdownImport } from "@/components/DocumentMarkdownImport";
import { formatActionError } from "@/lib/actionResult";
import {
  publicDocumentPathForType,
  publicDocumentSection,
  siteStatusLabel,
} from "@/lib/site";
import type { Document } from "@/lib/types";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type DocumentSiteContextValue = {
  document: Document;
  isPending: boolean;
  error: string | null;
  preview: string;
  setPreview: (value: string) => void;
  contentMd: string;
  setContentMd: (value: string) => void;
  siteSlug: string;
  setSiteSlug: (value: string) => void;
  featured: boolean;
  setFeatured: (value: boolean) => void;
  savePreview: () => void;
  saveContent: () => void;
  saveSlug: () => void;
  handlePublish: () => void;
  handleUnpublish: () => void;
  handleFeaturedChange: (checked: boolean) => void;
  onImported: (value: string) => void;
};

const DocumentSiteContext = createContext<DocumentSiteContextValue | null>(null);

export function DocumentSiteProvider({ document, children }: { document: Document; children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(document.preview ?? "");
  const [contentMd, setContentMd] = useState(document.content_md ?? "");
  const [siteSlug, setSiteSlug] = useState(document.site_slug ?? "");
  const [featured, setFeatured] = useState(document.site_featured);
  const lastSavedPreview = useRef(document.preview ?? "");
  const lastSavedContent = useRef(document.content_md ?? "");
  const lastSavedSlug = useRef(document.site_slug ?? "");

  useEffect(() => {
    const nextContent = document.content_md ?? "";
    if (nextContent !== lastSavedContent.current) {
      setContentMd(nextContent);
      lastSavedContent.current = nextContent;
    }
  }, [document.content_md]);

  useEffect(() => {
    const nextSlug = document.site_slug ?? "";
    if (nextSlug !== lastSavedSlug.current) {
      setSiteSlug(nextSlug);
      lastSavedSlug.current = nextSlug;
    }
  }, [document.site_slug]);

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.refresh();
        return;
      }
      setError(formatActionError(result as Extract<typeof result, { ok: false }>));
      router.refresh();
    });
  }

  function savePreview() {
    if (preview === lastSavedPreview.current) return;
    const value = preview;
    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      formData.set("preview", value);
      const result = await updateDocumentPreview(formData);
      if (result.ok) lastSavedPreview.current = value;
      return result;
    });
  }

  function saveContent() {
    if (contentMd === lastSavedContent.current) return;
    const value = contentMd;
    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      formData.set("content_md", value);
      const result = await updateDocumentContentMd(formData);
      if (result.ok) lastSavedContent.current = value;
      return result;
    });
  }

  function saveSlug() {
    const normalized = siteSlug.trim().toLocaleLowerCase("en").replace(/^\/?p\//, "");
    if (normalized === lastSavedSlug.current) return;
    setSiteSlug(normalized);
    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      formData.set("site_slug", normalized);
      const result = await updateDocumentSiteSlug(formData);
      if (result.ok) lastSavedSlug.current = normalized;
      return result;
    });
  }

  function handlePublish() {
    runAction(async () => {
      const formData = new FormData();
      formData.set("id", document.id);
      formData.set("preview", preview);
      formData.set("content_md", contentMd);
      const result = await publishDocument(formData);
      if (result.ok) {
        lastSavedPreview.current = preview;
        lastSavedContent.current = contentMd;
      }
      return result;
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
      if (!result.ok) setFeatured(document.site_featured);
      return result;
    });
  }

  const value: DocumentSiteContextValue = {
    document,
    isPending,
    error,
    preview,
    setPreview,
    contentMd,
    setContentMd,
    siteSlug,
    setSiteSlug,
    featured,
    setFeatured,
    savePreview,
    saveContent,
    saveSlug,
    handlePublish,
    handleUnpublish,
    handleFeaturedChange,
    onImported(nextContent) {
      setContentMd(nextContent);
      lastSavedContent.current = nextContent;
      router.refresh();
    },
  };

  return <DocumentSiteContext.Provider value={value}>{children}</DocumentSiteContext.Provider>;
}

function useDocumentSite() {
  const value = useContext(DocumentSiteContext);
  if (!value) throw new Error("DocumentSiteProvider is missing");
  return value;
}

export function DocumentSiteTextBlock() {
  const { document, isPending, contentMd, setContentMd, saveContent, onImported } = useDocumentSite();
  return (
    <section className="doc-section doc-site-section">
      <label className="doc-site-field-label" htmlFor={`doc-content-${document.id}`}>Текст (Markdown)</label>
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
        <button type="button" className="ghost-button" disabled={isPending} onClick={saveContent}>
          {isPending ? "Сохранение…" : "Сохранить текст"}
        </button>
      </div>
      <DocumentMarkdownImport documentId={document.id} disabled={isPending} onImported={onImported} />
    </section>
  );
}

export function DocumentSitePublicationBlock() {
  const {
    document,
    isPending,
    error,
    preview,
    setPreview,
    siteSlug,
    setSiteSlug,
    featured,
    savePreview,
    saveSlug,
    handlePublish,
    handleUnpublish,
    handleFeaturedChange,
  } = useDocumentSite();
  const isPublished = document.site_status === "published";
  const publicUrl = isPublished && document.site_slug
    ? publicDocumentPathForType(document.site_slug, document.document_type, document.site_locale)
    : null;

  return (
    <section className="doc-section doc-site-section">
      <div className="section-header">
        <h2 className="section-label">Публикация на сайте</h2>
        <span className={`doc-site-status${isPublished ? " is-published" : ""}`}>
          {siteStatusLabel(document.site_status)}
        </span>
      </div>
      {publicUrl ? (
        <p className="doc-site-url">Опубликовано: <a href={publicUrl} target="_blank" rel="noopener noreferrer">Открыть как читатель ↗</a></p>
      ) : null}
      <label className="doc-site-field-label" htmlFor={`doc-slug-${document.id}`}>Адрес страницы</label>
      <div className="doc-site-slug-field">
        <span>/ru/{publicDocumentSection(document.document_type) ?? ""}/</span>
        <input
          id={`doc-slug-${document.id}`}
          value={siteSlug}
          disabled={isPending}
          placeholder="создастся из названия"
          onChange={(event) => setSiteSlug(event.target.value)}
          onBlur={saveSlug}
        />
      </div>
      <label className="doc-site-field-label" htmlFor={`doc-preview-${document.id}`}>Краткое описание (preview)</label>
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
      <label className="doc-site-featured">
        <input type="checkbox" checked={featured} disabled={isPending} onChange={(event) => handleFeaturedChange(event.target.checked)} />
        Избранное на главной
      </label>
      <div className="doc-site-actions-row">
        {isPublished ? (
          <button type="button" className="ghost-button" disabled={isPending} onClick={handleUnpublish}>Снять с публикации</button>
        ) : (
          <button type="button" className="primary-button" disabled={isPending} onClick={handlePublish}>Опубликовать</button>
        )}
      </div>
      {error ? <p className="doc-site-error">{error}</p> : null}
    </section>
  );
}
