"use client";

import { reorderActions } from "@/app/documents/actions";
import { SortableActionChecklistItem } from "@/components/ActionChecklistItem";
import type { Action, Material } from "@/lib/types";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type SortableActionsListProps = {
  documentId: string;
  actions: Action[];
  materials: Material[];
};

export function SortableActionsList({
  documentId,
  actions,
  materials,
}: SortableActionsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(actions);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setItems(actions);
  }, [actions]);

  const activeAction = activeId
    ? items.find((action) => action.id === activeId)
    : null;

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
      await reorderActions(
        documentId,
        nextItems.map((item) => item.id)
      );
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setItems(actions);
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
      id="document-actions-dnd"
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
        <ul className={`checklist${isPending ? " is-pending" : ""}`}>
          {items.map((action) => (
            <SortableActionChecklistItem
              key={action.id}
              action={action}
              documentId={documentId}
              materials={materials}
            />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeAction ? (
          <ul className="checklist">
            <SortableActionChecklistItem
              action={activeAction}
              documentId={documentId}
              materials={materials}
              isDragOverlay
            />
          </ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
