"use client";

import { toggleActionDone, toggleActionToday } from "@/app/documents/actions";
import type { Action, Document, Material } from "@/lib/types";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { CSSProperties } from "react";

export type FocusAction = Action & {
  documents: Pick<Document, "id" | "title">;
  materials?: Pick<Material, "id" | "title"> | null;
};

type TodayItemProps = {
  action: FocusAction;
  showDragHandle?: boolean;
  isDragOverlay?: boolean;
  isDragging?: boolean;
  style?: CSSProperties;
  setNodeRef?: (element: HTMLElement | null) => void;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
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

export function TodayItem({
  action,
  showDragHandle = false,
  isDragOverlay = false,
  isDragging = false,
  style,
  setNodeRef,
  dragHandleProps,
}: TodayItemProps) {
  const document = action.documents;
  const material = action.materials;

  const itemClassName = [
    "today-item",
    action.done ? "is-done" : "",
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
          className="today-drag-handle"
          aria-label="Переместить действие"
          {...dragHandleProps?.attributes}
          {...dragHandleProps?.listeners}
        >
          <GripIcon />
        </button>
      )}

      <form action={toggleActionDone} className="today-done-form">
        <input type="hidden" name="id" value={action.id} />
        <input type="hidden" name="document_id" value={action.document_id} />
        <input
          type="hidden"
          name="done"
          value={action.done ? "false" : "true"}
        />
        <button
          type="submit"
          className={`checklist-checkbox${action.done ? " is-checked" : ""}`}
          aria-label={action.done ? "Отметить неготовым" : "Отметить готовым"}
        />
      </form>

      <div className="today-item-body">
        <p className="today-action-title">{action.title}</p>
        {document && (
          <p className="today-action-context">
            <Link href={`/documents/${document.id}`} className="today-doc-link">
              {document.title}
            </Link>
            {material && (
              <>
                <span className="today-context-sep" aria-hidden="true">
                  ·
                </span>
                <Link
                  href={`/materials/${material.id}`}
                  className="today-material-tag"
                >
                  {material.title}
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      <form action={toggleActionToday} className="today-unfocus-form">
        <input type="hidden" name="id" value={action.id} />
        <input type="hidden" name="document_id" value={action.document_id} />
        <input type="hidden" name="today" value="false" />
        <button type="submit" className="today-unfocus-button">
          Убрать из фокуса
        </button>
      </form>
    </li>
  );
}

type SortableTodayItemProps = {
  action: FocusAction;
  isDragOverlay?: boolean;
};

export function SortableTodayItem({
  action,
  isDragOverlay = false,
}: SortableTodayItemProps) {
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
    <TodayItem
      action={action}
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
