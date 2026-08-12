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
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react";

type ListMode = "working" | "published" | "all";
type SortField = "date" | "title";
type SortDirection = "asc" | "desc";

type SortableDocumentsListProps = {
  documents: Document[];
};

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
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
  focusRank?: number;
  showDragHandle?: boolean;
  showPublishedIndicator?: boolean;
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
  focusRank = -1,
  showDragHandle = false,
  showPublishedIndicator = false,
  isDragOverlay = false,
  isDragging = false,
  style,
  setNodeRef,
  dragHandleProps,
}: DocumentRowProps) {
  const clientDragHandleProps = useClientDragHandleProps(dragHandleProps);
  const isFocusPriority = showDragHandle && focusRank >= 0 && focusRank < 3;

  const className = [
    "collection-row",
    "collection-row-documents",
    isFocusPriority ? "is-focus-priority" : "",
    isDragging ? "is-dragging" : "",
    isDragOverlay ? "is-drag-overlay" : "",
  ].filter(Boolean).join(" ");

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
        <span
          className="documents-row-status"
          aria-label={showPublishedIndicator && document.site_status === "published" ? "Опубликован" : undefined}
          aria-hidden={showPublishedIndicator && document.site_status === "published" ? undefined : true}
          title={showPublishedIndicator && document.site_status === "published" ? "Опубликован" : undefined}
        >
          {showPublishedIndicator && document.site_status === "published" ? "✓" : ""}
        </span>
      )}

      <Link href={`/documents/${document.id}`} className="collection-primary documents-row-link">
        {document.title}
      </Link>
      <span className="collection-meta">{document.document_type}</span>
      <span className="collection-meta">{formatDate(document.updated_at)}</span>
    </li>
  );
}

function SortableDocumentRow({ document, focusRank }: { document: Document; focusRank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: document.id });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };

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

export function SortableDocumentsList({ documents }: SortableDocumentsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(documents);
  const [mode, setMode] = useState<ListMode>("working");
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => setItems(documents), [documents]);

  const normalizedQuery = query.trim().toLocaleLowerCase("ru");
  const canDrag = mode === "working" && normalizedQuery === "";

  const visibleItems = useMemo(() => {
    const filtered = items.filter((document) => {
      const matchesMode = mode === "all"
        || (mode === "published" ? document.site_status === "published" : document.site_status !== "published");
      return matchesMode && document.title.toLocaleLowerCase("ru").includes(normalizedQuery);
    });

    if (canDrag) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      const comparison = sortField === "date"
        ? a.updated_at.localeCompare(b.updated_at)
        : a.title.localeCompare(b.title, "ru", { sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [canDrag, items, mode, normalizedQuery, sortDirection, sortField]);

  const activeDocument = activeId ? visibleItems.find((document) => document.id === activeId) : null;
  const activeFocusRank = activeDocument ? visibleItems.findIndex((document) => document.id === activeDocument.id) : -1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function changeSortField(nextField: SortField) {
    setSortField(nextField);
    setSortDirection(nextField === "date" ? "desc" : "asc");
  }

  function handleDragStart(event: DragStartEvent) {
    if (canDrag) setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!canDrag || !event.over || event.active.id === event.over.id) return;

    const oldIndex = visibleItems.findIndex((item) => item.id === event.active.id);
    const newIndex = visibleItems.findIndex((item) => item.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedWorking = arrayMove(visibleItems, oldIndex, newIndex);
    const published = items.filter((item) => item.site_status === "published");
    setItems([...reorderedWorking, ...published]);

    try {
      await reorderDocuments(reorderedWorking.map((item) => item.id));
      startTransition(() => router.refresh());
    } catch {
      setItems(documents);
      startTransition(() => router.refresh());
    }
  }

  const list = (
    <ul className={`collection-list documents-sortable-list${isPending ? " is-pending" : ""}`}>
      <li className="collection-header collection-header-documents" aria-hidden="true">
        <span />
        <span>Название</span>
        <span>Тип</span>
        <span>Обновлён</span>
      </li>
      {visibleItems.map((document, index) => canDrag ? (
        <SortableDocumentRow key={document.id} document={document} focusRank={index} />
      ) : (
        <DocumentRow key={document.id} document={document} showPublishedIndicator={mode === "all"} />
      ))}
    </ul>
  );

  return (
    <>
      <div className="documents-toolbar">
        <div className="documents-modes" aria-label="Режим списка">
          {([
            ["working", "В работе"],
            ["published", "Опубликованные"],
            ["all", "Все"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`documents-mode${mode === value ? " is-active" : ""}`}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="documents-list-controls">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию…"
            aria-label="Поиск по названию документа"
            className="documents-search-input"
          />

          {!canDrag ? (
            <div className="documents-sort-controls">
              <div className="documents-sort-fields" aria-label="Сортировка">
                <button type="button" className={sortField === "date" ? "is-active" : ""} onClick={() => changeSortField("date")}>По дате</button>
                <button type="button" className={sortField === "title" ? "is-active" : ""} onClick={() => changeSortField("title")}>По алфавиту</button>
              </div>
              <button
                type="button"
                className="documents-sort-direction"
                onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")}
                aria-label="Изменить направление сортировки"
              >
                {sortField === "date"
                  ? (sortDirection === "desc" ? "Новые → старые" : "Старые → новые")
                  : (sortDirection === "asc" ? "А → Я" : "Я → А")}
              </button>
            </div>
          ) : null}
        </div>

        {canDrag ? <p className="documents-focus-hint">Перетащи, чтобы выставить приоритет. Первые 3 — в фокусе.</p> : null}
      </div>

      {visibleItems.length === 0 ? (
        <div className="empty-state"><p>{normalizedQuery ? "Ничего не найдено" : "В этом разделе пока нет документов"}</p></div>
      ) : canDrag ? (
        <DndContext
          id="documents-list-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={visibleItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeDocument ? (
              <ul className="collection-list documents-sortable-list">
                <DocumentRow document={activeDocument} focusRank={activeFocusRank} showDragHandle isDragOverlay />
              </ul>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : list}
    </>
  );
}
