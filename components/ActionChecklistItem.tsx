"use client";

import {
  deleteAction,
  linkActionMaterial,
  toggleActionDone,
  toggleActionToday,
  unlinkActionMaterial,
  updateAction,
} from "@/app/documents/actions";
import type { Action, Material } from "@/lib/types";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useClientDragHandleProps } from "@/lib/useClientDragHandleProps";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type CSSProperties,
} from "react";

type LinkedMaterial = Pick<Material, "id" | "title">;

type ActionChecklistItemProps = {
  action: Action;
  documentId: string;
  materials: Material[];
  showDragHandle?: boolean;
  isDragOverlay?: boolean;
  style?: CSSProperties;
  setNodeRef?: (element: HTMLElement | null) => void;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
  isDragging?: boolean;
};

const INTERACTIVE_SELECTOR =
  "button, input, a, .checklist-drag-handle, .checklist-checkbox, .checklist-title, .focus-pill, .destructive-link, .material-pill, .checklist-unlink-material, .checklist-link-material";

function GripIcon() {
  return (
    <svg
      width="10"
      height="14"
      viewBox="0 0 10 14"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2" cy="2" r="1.25" />
      <circle cx="8" cy="2" r="1.25" />
      <circle cx="2" cy="7" r="1.25" />
      <circle cx="8" cy="7" r="1.25" />
      <circle cx="2" cy="12" r="1.25" />
      <circle cx="8" cy="12" r="1.25" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`checklist-chevron${expanded ? " is-expanded" : ""}`}
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function stopRowToggle(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function getCollapsedMaterialsSummary(linkedMaterials: LinkedMaterial[]) {
  const count = linkedMaterials.length;

  if (count === 0) {
    return { kind: "empty" as const };
  }

  if (count === 1) {
    return { kind: "names" as const, materials: linkedMaterials };
  }

  if (count <= 3) {
    return { kind: "names" as const, materials: linkedMaterials };
  }

  return { kind: "count" as const, count };
}

export function ActionChecklistItem({
  action,
  documentId,
  materials,
  showDragHandle = false,
  isDragOverlay = false,
  style,
  setNodeRef,
  dragHandleProps,
  isDragging = false,
}: ActionChecklistItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const lastSavedTitle = useRef(action.title);

  const linkedMaterials = action.materials ?? [];
  const linkedMaterialIds = new Set(linkedMaterials.map((material) => material.id));
  const availableMaterials = materials.filter(
    (material) => !linkedMaterialIds.has(material.id)
  );
  const collapsedSummary = getCollapsedMaterialsSummary(linkedMaterials);
  const hasDocumentMaterials = materials.length > 0;

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function saveFields() {
    const title = titleRef.current?.value.trim() ?? "";

    if (!title) {
      return;
    }

    if (title === lastSavedTitle.current) {
      return;
    }

    const formData = new FormData();
    formData.set("id", action.id);
    formData.set("document_id", documentId);
    formData.set("title", title);

    await updateAction(formData);
    lastSavedTitle.current = title;
    refresh();
  }

  async function handleToggleDone() {
    const formData = new FormData();
    formData.set("id", action.id);
    formData.set("document_id", documentId);
    formData.set("done", action.done ? "false" : "true");
    await toggleActionDone(formData);
    refresh();
  }

  async function handleToggleFocus() {
    const formData = new FormData();
    formData.set("id", action.id);
    formData.set("document_id", documentId);
    formData.set("today", action.today ? "false" : "true");
    await toggleActionToday(formData);
    refresh();
  }

  async function handleLinkMaterial(materialId: string) {
    const formData = new FormData();
    formData.set("action_id", action.id);
    formData.set("material_id", materialId);
    formData.set("document_id", documentId);

    await linkActionMaterial(formData);
    refresh();
  }

  async function handleUnlinkMaterial(materialId: string) {
    const formData = new FormData();
    formData.set("action_id", action.id);
    formData.set("material_id", materialId);
    formData.set("document_id", documentId);

    await unlinkActionMaterial(formData);
    refresh();
  }

  async function handleDelete() {
    const formData = new FormData();
    formData.set("id", action.id);
    formData.set("document_id", documentId);
    await deleteAction(formData);
    refresh();
  }

  function toggleExpanded() {
    if (isDragOverlay) {
      return;
    }

    setIsExpanded((value) => !value);
  }

  function handleRowClick(event: MouseEvent<HTMLElement>) {
    if (isDragOverlay) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest(INTERACTIVE_SELECTOR)) {
      return;
    }

    toggleExpanded();
  }

  const itemClassName = [
    "checklist-item",
    action.done ? "is-done" : "",
    isPending ? "is-pending" : "",
    isDragging ? "is-dragging" : "",
    isDragOverlay ? "is-drag-overlay" : "",
    isExpanded ? "is-expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={itemClassName}
      onClick={handleRowClick}
    >
      {showDragHandle && (
        <button
          type="button"
          className="checklist-drag-handle"
          aria-label="Переместить действие"
          {...dragHandleProps?.attributes}
          {...dragHandleProps?.listeners}
        >
          <GripIcon />
        </button>
      )}

      <button
        type="button"
        className={`checklist-checkbox${action.done ? " is-checked" : ""}`}
        aria-label={action.done ? "Отметить неготовым" : "Отметить готовым"}
        onClick={(event) => {
          stopRowToggle(event);
          void handleToggleDone();
        }}
      />

      <div className="checklist-body" aria-expanded={isExpanded}>
        <div className="checklist-main">
          <button
            type="button"
            className="checklist-expand"
            aria-label={isExpanded ? "Свернуть материалы" : "Развернуть материалы"}
            aria-expanded={isExpanded}
            onClick={(event) => {
              stopRowToggle(event);
              toggleExpanded();
            }}
          >
            <ChevronIcon expanded={isExpanded} />
          </button>

          <input
            ref={titleRef}
            type="text"
            defaultValue={action.title}
            className="checklist-title"
            onClick={stopRowToggle}
            onFocus={stopRowToggle}
            onBlur={saveFields}
            onKeyDown={(event) => {
              stopRowToggle(event);

              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />

          <button
            type="button"
            className={`focus-pill${action.today ? " is-active" : ""}`}
            onClick={(event) => {
              stopRowToggle(event);
              void handleToggleFocus();
            }}
          >
            {action.today ? "В фокусе" : "В фокус"}
          </button>

          <button
            type="button"
            className="destructive-link"
            onClick={(event) => {
              stopRowToggle(event);
              void handleDelete();
            }}
          >
            Удалить
          </button>
        </div>

        {!isExpanded && (
          <div className="checklist-materials-row">
            <span className="checklist-materials-label">Материалы</span>
            <div className="checklist-materials-summary">
              {collapsedSummary.kind === "empty" && (
                <span className="checklist-materials-add-hint">+ материал</span>
              )}

              {collapsedSummary.kind === "names" &&
                collapsedSummary.materials.map((material, index) => (
                  <span key={material.id} className="checklist-materials-name-group">
                    {index > 0 && (
                      <span className="checklist-materials-sep" aria-hidden="true">
                        ,
                      </span>
                    )}
                    <Link
                      href={`/materials/${material.id}`}
                      className="material-pill is-active"
                      onClick={stopRowToggle}
                    >
                      {material.title}
                    </Link>
                  </span>
                ))}

              {collapsedSummary.kind === "count" && (
                <span className="checklist-materials-count">
                  {collapsedSummary.count} материалов
                </span>
              )}
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="checklist-materials-panel">
            <p className="checklist-panel-heading">Связанные материалы</p>

            {linkedMaterials.length > 0 ? (
              <ul className="checklist-linked-materials">
                {linkedMaterials.map((material) => (
                  <li key={material.id} className="checklist-linked-material">
                    <Link
                      href={`/materials/${material.id}`}
                      className="checklist-linked-material-title"
                      onClick={stopRowToggle}
                    >
                      {material.title}
                    </Link>
                    <button
                      type="button"
                      className="checklist-unlink-material"
                      onClick={(event) => {
                        stopRowToggle(event);
                        void handleUnlinkMaterial(material.id);
                      }}
                    >
                      Убрать
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="checklist-materials-empty">
                Нет связанных материалов
              </p>
            )}

            {!hasDocumentMaterials ? (
              <p className="checklist-materials-doc-empty">
                В документе пока нет материалов. Добавьте материал ниже.
              </p>
            ) : availableMaterials.length > 0 ? (
              <div className="checklist-attach-materials">
                <p className="checklist-panel-heading">+ Привязать материал</p>
                <div className="checklist-add-materials">
                  {availableMaterials.map((material) => (
                    <button
                      key={material.id}
                      type="button"
                      className="material-pill checklist-link-material"
                      onClick={(event) => {
                        stopRowToggle(event);
                        void handleLinkMaterial(material.id);
                      }}
                    >
                      {material.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}

type SortableActionChecklistItemProps = {
  action: Action;
  documentId: string;
  materials: Material[];
  isDragOverlay?: boolean;
};

export function SortableActionChecklistItem({
  action,
  documentId,
  materials,
  isDragOverlay = false,
}: SortableActionChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: action.id,
    disabled: isDragOverlay,
  });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const dragHandleProps = useClientDragHandleProps(
    isDragOverlay
      ? undefined
      : {
          attributes,
          listeners,
        }
  );

  return (
    <ActionChecklistItem
      action={action}
      documentId={documentId}
      materials={materials}
      showDragHandle
      isDragOverlay={isDragOverlay}
      isDragging={isDragging}
      setNodeRef={isDragOverlay ? undefined : setNodeRef}
      style={style}
      dragHandleProps={dragHandleProps}
    />
  );
}
