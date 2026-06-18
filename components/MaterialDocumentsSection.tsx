"use client";

import {
  linkMaterialToDocument,
  unlinkMaterialFromDocument,
} from "@/app/documents/actions";
import { ACTION_ERROR_MESSAGES } from "@/lib/actionResult";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type DocumentOption = {
  id: string;
  title: string;
};

type MaterialDocumentsSectionProps = {
  materialId: string;
  linkedDocuments: DocumentOption[];
  availableDocuments: DocumentOption[];
};

function matchesDocumentQuery(title: string, query: string) {
  return title.toLowerCase().includes(query.trim().toLowerCase());
}

export function MaterialDocumentsSection({
  materialId,
  linkedDocuments,
  availableDocuments,
}: MaterialDocumentsSectionProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLastDocument = linkedDocuments.length <= 1;

  const filteredDocuments = useMemo(() => {
    const sorted = [...availableDocuments].sort((a, b) =>
      a.title.localeCompare(b.title, "ru")
    );

    if (!query.trim()) {
      return sorted;
    }

    return sorted.filter((document) =>
      matchesDocumentQuery(document.title, query)
    );
  }, [availableDocuments, query]);

  function closeDropdown() {
    setOpen(false);
    setQuery("");
    setSelectedDocumentId("");
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    searchRef.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (
      selectedDocumentId &&
      !filteredDocuments.some((document) => document.id === selectedDocumentId)
    ) {
      setSelectedDocumentId("");
    }
  }, [filteredDocuments, selectedDocumentId]);

  function handleLink() {
    if (!selectedDocumentId) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("document_id", selectedDocumentId);
      formData.set("material_id", materialId);
      await linkMaterialToDocument(formData);
      closeDropdown();
      setError(null);
      router.refresh();
    });
  }

  function handleUnlink(documentId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("document_id", documentId);
      formData.set("material_id", materialId);
      const result = await unlinkMaterialFromDocument(formData);

      if (!result.ok) {
        setError(ACTION_ERROR_MESSAGES[result.error]);
        return;
      }

      setError(null);
      router.refresh();
    });
  }

  return (
    <section className="doc-section">
      <div className="section-header">
        <h2 className="section-label">Документы</h2>
      </div>

      {linkedDocuments.length === 0 ? (
        <p className="section-empty">
          Материал не привязан ни к одному документу
        </p>
      ) : (
        <ul className="material-documents-list">
          {linkedDocuments.map((document) => (
            <li key={document.id} className="material-document-row">
              <span className="material-document-title">{document.title}</span>
              <div className="material-document-actions">
                <Link
                  href={`/documents/${document.id}`}
                  className="text-button material-document-open"
                >
                  Открыть
                </Link>
                <button
                  type="button"
                  className="text-button material-document-unlink"
                  disabled={isPending || isLastDocument}
                  title={
                    isLastDocument
                      ? "Материал должен принадлежать хотя бы одному документу"
                      : undefined
                  }
                  onClick={() => handleUnlink(document.id)}
                >
                  Отвязать
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isLastDocument && linkedDocuments.length > 0 && (
        <p className="material-documents-hint">
          Материал должен принадлежать хотя бы одному документу
        </p>
      )}

      {availableDocuments.length > 0 && (
        <div className="material-link-dropdown" ref={panelRef}>
          {!open ? (
            <button
              type="button"
              className="ghost-button material-link-dropdown-trigger"
              disabled={isPending}
              onClick={() => setOpen(true)}
            >
              Привязать к документу
            </button>
          ) : (
            <div className="material-link-dropdown-panel">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="material-link-dropdown-search"
                aria-label="Поиск документа"
                disabled={isPending}
              />

              <ul className="material-link-dropdown-list" role="listbox">
                {filteredDocuments.map((document) => (
                  <li key={document.id} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedDocumentId === document.id}
                      className={`material-link-dropdown-item${
                        selectedDocumentId === document.id ? " is-selected" : ""
                      }`}
                      onClick={() => setSelectedDocumentId(document.id)}
                    >
                      {document.title}
                    </button>
                  </li>
                ))}
              </ul>

              {filteredDocuments.length === 0 && (
                <p className="material-link-dropdown-empty">Ничего не найдено</p>
              )}

              <div className="material-link-dropdown-footer">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={isPending || !selectedDocumentId}
                  onClick={handleLink}
                >
                  Привязать
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={isPending}
                  onClick={closeDropdown}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="inline-editable-title-error">{error}</p>}
    </section>
  );
}
