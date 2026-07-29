"use client";

import { reorderDocuments } from "@/app/documents/actions";
import { formatDate } from "@/lib/format";
import { useClientDragHandleProps } from "@/lib/useClientDragHandleProps";
import type { Document } from "@/lib/types";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type CSSProperties } from "react";

type SortableDocumentsListProps = {
  documents: Document[];
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

type DocumentRowProps = {
  document: Document;
  focusRank: number;
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

function DocumentRow({
  document,
  focusRank,
  showDragHandle = false,
  isDragOverlay = false,
  isDragging = false,
  style,
  setNodeRef,
  dragHandleProps,
}: DocumentRowProps) {
  const clientDragHandleProps = useClientDragHandleProps(dragHandleProps);
  const isFocusPriority = focusRank >= 0 && focusRank < 3;

  const className = [
    "collection-row",
    "collection-row-documents",
    isFocusPriority ? "is-focus-priority" : "",
    isDragging ? "is-dragging" : "",
    isDragOverlay ? "is-drag-overlay" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li ref={setNodeRef} style={style} className={className}>
      {showDragHandle ? (
        <button
          type="button"
          className="documents-drag-handle"
          aria-label="Изменить приоритет документа"
          {...clientDragHandleProps?.attributes}
          {...clientDragHandleProps?.listeners}
        >
          <GripIcon />
        </button>
      ) : (
        <span className="documents-drag-handle-spacer" aria-hidden="true" />
      )}

      <Link
        href={`/documents/${document.id}`}
        className="collection-primary documents-row-link"
      >
        {document.title}
      </Link>
      <span className="collection-meta">{document.document_type}</span>
      <span className="collection-meta">{formatDate(document.updated_at)}</span>
    </li>
  );
}

function SortableDocumentRow({
  document,
  focusRank,
}: {
  document: Document;
  focusRank: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <DocumentRow
      document={document}
      focusRank={focusRank}
      showDragHandle
      isDragging={isDragging}
      style={style}
      setNodeRef={setNodeRef}
      dragHandleProps={{ attributes, listeners }}
    />
  );
}

export function SortableDocumentsList({
  documents,
}: SortableDocumentsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(documents);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setItems(documents);
  }, [documents]);

  const activeDocument = activeId
    ? items.find((document) => document.id === activeId)
    : null;
  const activeFocusRank = activeDocument
    ? items.findIndex((document) => document.id === activeDocument.id)
    : -1;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextItems = arrayMove(items, oldIndex, newIndex);
    setItems(nextItems);

    try {
      await reorderDocuments(nextItems.map((item) => item.id));
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setItems(documents);
      startTransition(() => {
        router.refresh();
      });
    }
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <DndContext
      id="documents-list-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          className={`collection-list documents-sortable-list${
            isPending ? " is-pending" : ""
          }`}
        >
          <li
            className="collection-header collection-header-documents"
            aria-hidden="true"
          >
            <span />
            <span>Название</span>
            <span>Тип</span>
            <span>Обновлён</span>
          </li>
          {items.map((document, index) => (
            <SortableDocumentRow
              key={document.id}
              document={document}
              focusRank={index}
            />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeDocument ? (
          <ul className="collection-list documents-sortable-list">
            <DocumentRow
              document={activeDocument}
              focusRank={activeFocusRank}
              showDragHandle
              isDragOverlay
            />
          </ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
