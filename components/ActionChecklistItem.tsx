"use client";

import {
  deleteAction,
  toggleActionDone,
  toggleActionToday,
  updateAction,
} from "@/app/documents/actions";
import type { Action, Material } from "@/lib/types";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useRef, useTransition, type CSSProperties } from "react";

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
  const titleRef = useRef<HTMLInputElement>(null);
  const lastSavedTitle = useRef(action.title);

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
    formData.set("material_id", action.material_id ?? "");

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

  async function handleMaterialSelect(materialId: string) {
    const formData = new FormData();
    formData.set("id", action.id);
    formData.set("document_id", documentId);
    formData.set("title", titleRef.current?.value.trim() || action.title);
    formData.set("material_id", materialId);

    await updateAction(formData);
    refresh();
  }

  async function handleDelete() {
    const formData = new FormData();
    formData.set("id", action.id);
    formData.set("document_id", documentId);
    await deleteAction(formData);
    refresh();
  }

  const itemClassName = [
    "checklist-item",
    action.done ? "is-done" : "",
    isPending ? "is-pending" : "",
    isDragging ? "is-dragging" : "",
    isDragOverlay ? "is-drag-overlay" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li ref={setNodeRef} style={style} className={itemClassName}>
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
        onClick={handleToggleDone}
      />

      <div className="checklist-body">
        <div className="checklist-main">
          <input
            ref={titleRef}
            type="text"
            defaultValue={action.title}
            className="checklist-title"
            onBlur={saveFields}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />

          <button
            type="button"
            className={`focus-pill${action.today ? " is-active" : ""}`}
            onClick={handleToggleFocus}
          >
            {action.today ? "В фокусе" : "В фокус"}
          </button>

          <button
            type="button"
            className="destructive-link"
            onClick={handleDelete}
          >
            Удалить
          </button>
        </div>

        {materials.length > 0 && (
          <div className="checklist-materials">
            <button
              type="button"
              className={`material-pill${
                !action.material_id ? " is-active" : ""
              }`}
              onClick={() => handleMaterialSelect("")}
            >
              Без материала
            </button>
            {materials.map((material) => (
              <button
                key={material.id}
                type="button"
                className={`material-pill${
                  action.material_id === material.id ? " is-active" : ""
                }`}
                onClick={() => handleMaterialSelect(material.id)}
              >
                {material.title}
              </button>
            ))}
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
      dragHandleProps={
        isDragOverlay
          ? undefined
          : {
              attributes,
              listeners,
            }
      }
    />
  );
}
