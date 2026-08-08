"use client";

import { createAction } from "@/app/documents/actions";
import {
  ActionChecklistItem,
  ExpandedActionProvider,
} from "@/components/ActionChecklistItem";
import { SortableActionsList } from "@/components/SortableActionsList";
import type { Action, Material } from "@/lib/types";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

type DocumentActionsBlockProps = {
  documentId: string;
  actions: Action[];
  materials: Material[];
  activeOnly: boolean;
};

export function DocumentActionsBlock({
  documentId,
  actions,
  materials,
  activeOnly,
}: DocumentActionsBlockProps) {
  const [items, setItems] = useState(actions);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(actions);
  }, [actions]);

  const visibleActions = activeOnly
    ? items.filter((action) => !action.done)
    : items;

  const filterHref = activeOnly
    ? `/documents/${documentId}`
    : `/documents/${documentId}?active=1`;

  return (
    <section className="doc-section">
      <div className="section-header">
        <h2 className="section-label">Действия</h2>
        {items.length > 0 && (
          <Link href={filterHref} className="section-toggle">
            {activeOnly ? "Показать все" : "Только активные"}
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="section-empty">Пока нет действий</p>
      ) : visibleActions.length === 0 ? (
        <p className="section-empty">Нет активных действий</p>
      ) : activeOnly ? (
        <ExpandedActionProvider>
          <ul className="checklist">
            {visibleActions.map((action) => (
              <ActionChecklistItem
                key={action.id}
                action={action}
                documentId={documentId}
                materials={materials}
              />
            ))}
          </ul>
        </ExpandedActionProvider>
      ) : (
        <ExpandedActionProvider>
          <SortableActionsList
            documentId={documentId}
            actions={visibleActions}
            materials={materials}
          />
        </ExpandedActionProvider>
      )}

      <form
        ref={formRef}
        className="checklist-add"
        onSubmit={(event) => {
          event.preventDefault();

          if (isCreating) {
            return;
          }

          const formData = new FormData(event.currentTarget);
          const title = String(formData.get("title") ?? "").trim();

          if (!title) {
            return;
          }

          setCreateError(null);
          startCreateTransition(async () => {
            const result = await createAction(formData);

            if (!result.ok) {
              setCreateError(result.error);
              return;
            }

            setItems((current) => [...current, result.action]);

            if (inputRef.current) {
              inputRef.current.value = "";
            }
          });
        }}
      >
        <input type="hidden" name="document_id" value={documentId} />
        <span className="checklist-checkbox checklist-checkbox-placeholder" />
        <input
          ref={inputRef}
          name="title"
          type="text"
          required
          placeholder="Добавить действие"
          className="checklist-add-input"
          disabled={isCreating}
          onBlur={(event) => {
            if (event.currentTarget.value.trim()) {
              formRef.current?.requestSubmit();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.value = "";
              event.currentTarget.blur();
            }
          }}
        />
      </form>
      {createError && (
        <p className="checklist-create-error" role="alert">
          {createError}
        </p>
      )}
    </section>
  );
}
