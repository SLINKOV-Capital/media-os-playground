"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useEffect, useState } from "react";

type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

/**
 * dnd-kit injects aria-describedby IDs (DndDescribedBy-N) during render.
 * The counter differs between SSR and client hydration, causing mismatches.
 * Apply drag handle props only after mount so server HTML matches the client.
 */
export function useClientDragHandleProps(
  props: DragHandleProps | undefined
): DragHandleProps | undefined {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!props || !mounted) {
    return undefined;
  }

  return props;
}
