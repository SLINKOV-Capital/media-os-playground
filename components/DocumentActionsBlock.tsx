import { createAction } from "@/app/documents/actions";
import {
  ActionChecklistItem,
  ExpandedActionProvider,
} from "@/components/ActionChecklistItem";
import { SortableActionsList } from "@/components/SortableActionsList";
import type { Action, Material } from "@/lib/types";
import Link from "next/link";

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
  const visibleActions = activeOnly
    ? actions.filter((action) => !action.done)
    : actions;

  const filterHref = activeOnly
    ? `/documents/${documentId}`
    : `/documents/${documentId}?active=1`;

  return (
    <section className="doc-section">
      <div className="section-header">
        <h2 className="section-label">Действия</h2>
        {actions.length > 0 && (
          <Link href={filterHref} className="section-toggle">
            {activeOnly ? "Показать все" : "Только активные"}
          </Link>
        )}
      </div>

      {actions.length === 0 ? (
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

      <form action={createAction} className="checklist-add">
        <input type="hidden" name="document_id" value={documentId} />
        <span className="checklist-checkbox checklist-checkbox-placeholder" />
        <input
          name="title"
          type="text"
          required
          placeholder="Добавить действие"
          className="checklist-add-input"
        />
      </form>
    </section>
  );
}
