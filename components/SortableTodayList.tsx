"use client";

import { reorderTodayActions } from "@/app/documents/actions";
import {
  SortableTodayItem,
  type FocusAction,
} from "@/components/TodayItem";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
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

type SortableTodayListProps = {
  actions: FocusAction[];
};

export function SortableTodayList({ actions }: SortableTodayListProps) {
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
      await reorderTodayActions(nextItems.map((item) => item.id));
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
        <ul className={`today-list${isPending ? " is-pending" : ""}`}>
          {items.map((action) => (
            <SortableTodayItem key={action.id} action={action} />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeAction ? (
          <ul className="today-list">
            <SortableTodayItem action={activeAction} isDragOverlay />
          </ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
