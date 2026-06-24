"use client";

import {
  createMaterial,
  findMaterialByTitle,
  linkMaterialToDocument,
  searchMaterials,
} from "@/app/documents/actions";
import { MaterialTypeSelect } from "@/components/MaterialTypeSelect";
import { getMaterialTypeIcon } from "@/lib/materialTypes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type MaterialSearchResult = {
  id: string;
  title: string;
  material_type: string;
};

type MaterialAddPanelProps = {
  documentId: string;
  linkedMaterialIds: string[];
};

export function MaterialAddPanel({
  documentId,
  linkedMaterialIds,
}: MaterialAddPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [results, setResults] = useState<MaterialSearchResult[]>([]);
  const [exactMatch, setExactMatch] = useState<MaterialSearchResult | null>(
    null
  );
  const [isSearching, startSearchTransition] = useTransition();
  const [isLinking, startLinkTransition] = useTransition();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const linkedMaterialSet = useMemo(
    () => new Set(linkedMaterialIds),
    [linkedMaterialIds]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmed = title.trim();

    if (!trimmed) {
      setResults([]);
      setExactMatch(null);
      return;
    }

    const timer = window.setTimeout(() => {
      startSearchTransition(async () => {
        const [searchResults, existingMaterial] = await Promise.all([
          searchMaterials(trimmed),
          findMaterialByTitle(trimmed),
        ]);

        setResults(searchResults as MaterialSearchResult[]);
        setExactMatch(existingMaterial as MaterialSearchResult | null);
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [open, title]);

  function resizeTitleField() {
    const element = titleRef.current;

    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  function resizeContentField() {
    const element = contentRef.current;

    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  useEffect(() => {
    if (open) {
      resizeTitleField();
    }
  }, [open, title]);

  function closePanel() {
    setOpen(false);
    setTitle("");
    setResults([]);
    setExactMatch(null);
  }

  function handleLink(materialId: string) {
    startLinkTransition(async () => {
      const formData = new FormData();
      formData.set("document_id", documentId);
      formData.set("material_id", materialId);
      await linkMaterialToDocument(formData);
      closePanel();
      router.refresh();
    });
  }

  const showCreateForm = title.trim().length > 0 && !exactMatch;

  useEffect(() => {
    if (open && showCreateForm) {
      resizeContentField();
    }
  }, [open, showCreateForm]);

  if (!open) {
    return (
      <button
        type="button"
        className="notion-new-button material-add-trigger"
        onClick={() => setOpen(true)}
      >
        + Добавить материал
      </button>
    );
  }

  return (
    <div className="material-add-panel">
      <div className="notion-property notion-property-textarea">
        <label
          htmlFor={`material-search-${documentId}`}
          className="notion-property-label"
        >
          <span className="notion-property-label-primary">Название материала</span>
        </label>
        <div className="notion-property-value">
          <textarea
            ref={titleRef}
            id={`material-search-${documentId}`}
            className="material-add-title-field"
            rows={1}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onInput={resizeTitleField}
            autoFocus
            placeholder="Найти или создать материал…"
          />
        </div>
      </div>

      {isSearching && title.trim() && (
        <p className="material-add-hint">Поиск…</p>
      )}

      {exactMatch && (
        <div className="material-add-existing">
          <div className="material-add-existing-main">
            <span className="material-type-icon" aria-hidden="true">
              {getMaterialTypeIcon(exactMatch.material_type)}
            </span>
            <div className="material-add-existing-copy">
              <p className="material-add-existing-title">
                Материал «{exactMatch.title}» уже существует
              </p>
              <Link
                href={`/materials/${exactMatch.id}`}
                className="text-link material-add-existing-link"
              >
                Открыть карточку
              </Link>
            </div>
          </div>
          {linkedMaterialSet.has(exactMatch.id) ? (
            <span className="material-add-linked-label">Уже в документе</span>
          ) : (
            <button
              type="button"
              className="ghost-button"
              disabled={isLinking}
              onClick={() => handleLink(exactMatch.id)}
            >
              Привязать к документу
            </button>
          )}
        </div>
      )}

      {!exactMatch && results.length > 0 && (
        <ul className="material-add-results">
          {results.map((material) => {
            const isLinked = linkedMaterialSet.has(material.id);

            return (
              <li key={material.id} className="material-add-result">
                <Link
                  href={`/materials/${material.id}`}
                  className="material-add-result-link"
                >
                  <span className="material-type-icon" aria-hidden="true">
                    {getMaterialTypeIcon(material.material_type)}
                  </span>
                  <span className="material-add-result-title">
                    {material.title}
                  </span>
                </Link>
                {isLinked ? (
                  <span className="material-add-linked-label">В документе</span>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    disabled={isLinking}
                    onClick={() => handleLink(material.id)}
                  >
                    Привязать
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showCreateForm && (
        <form action={createMaterial} className="material-add-form">
          <input type="hidden" name="document_id" value={documentId} />
          <input type="hidden" name="title" value={title.trim()} />

          <div className="notion-property">
            <label
              htmlFor={`material-type-${documentId}`}
              className="notion-property-label"
            >
              Тип
            </label>
            <div className="notion-property-value">
              <MaterialTypeSelect
                id={`material-type-${documentId}`}
                name="material_type"
                required
              />
            </div>
          </div>

          <div className="notion-property notion-property-optional">
            <label
              htmlFor={`material-url-${documentId}`}
              className="notion-property-label"
            >
              <span className="notion-property-label-primary">URL / путь</span>
              <span className="notion-property-optional-tag">необязательно</span>
            </label>
            <div className="notion-property-value">
              <input
                id={`material-url-${documentId}`}
                name="file_url_or_path"
                type="text"
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="notion-property notion-property-optional notion-property-textarea material-content-block">
            <label
              htmlFor={`material-content-${documentId}`}
              className="notion-property-label"
            >
              <span className="notion-property-label-primary">Содержимое</span>
              <span className="notion-property-optional-tag">необязательно</span>
            </label>
            <div className="notion-property-value">
              <textarea
                ref={contentRef}
                id={`material-content-${documentId}`}
                name="notes"
                className="material-content-field"
                rows={4}
                placeholder="Markdown: текст, списки, ссылки…"
                onInput={resizeContentField}
              />
            </div>
          </div>

          <div className="material-add-actions">
            <button type="submit" className="ghost-button">
              Создать
            </button>
            <button type="button" className="text-button" onClick={closePanel}>
              Отмена
            </button>
          </div>
        </form>
      )}

      {!showCreateForm && !exactMatch && (
        <div className="material-add-actions">
          <button type="button" className="text-button" onClick={closePanel}>
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}
