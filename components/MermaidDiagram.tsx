"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";

let mermaidInitialized = false;
let renderSequence = 0;

type MermaidDiagramProps = {
  chart: string;
};

type Point = { x: number; y: number };

const MIN_SCALE = 0.75;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function liftHorizontalEdgeLabels(svg: string) {
  const container = document.createElement("div");
  container.innerHTML = svg;
  const root = container.querySelector("svg");
  if (!root) return svg;

  root.querySelectorAll<SVGGElement>(".edgeLabel").forEach((edgeLabel) => {
    const label = edgeLabel.querySelector<SVGGElement>(".label[data-id]");
    const dataId = label?.dataset.id;
    if (!dataId || !edgeLabel.textContent?.trim()) return;

    const path = Array.from(root.querySelectorAll<SVGPathElement>("path.flowchart-link"))
      .find((item) => item.id.endsWith(dataId));
    const coordinates = path?.getAttribute("d")?.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number);
    if (!coordinates || coordinates.length < 4) return;

    const start = { x: coordinates[0], y: coordinates[1] };
    const end = {
      x: coordinates[coordinates.length - 2],
      y: coordinates[coordinates.length - 1],
    };
    if (Math.abs(end.x - start.x) <= Math.abs(end.y - start.y)) return;

    const transform = edgeLabel.getAttribute("transform");
    const position = transform?.match(/translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)\s*\)/);
    if (!position) return;

    edgeLabel.setAttribute(
      "transform",
      `translate(${position[1]}, ${Number(position[2]) - 16})`
    );
  });

  return root.outerHTML;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const reactId = useId();
  const diagramId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const dragOrigin = useRef<Point | null>(null);
  const pinchDistance = useRef<number | null>(null);
  const pinchScale = useRef(1);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setSvg(null);
      setError(null);

      try {
        const { default: mermaid } = await import("mermaid");

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "base",
            fontFamily: "PT Root UI, Arial, sans-serif",
            flowchart: { htmlLabels: false },
          });
          mermaidInitialized = true;
        }

        renderSequence += 1;
        const rendered = await mermaid.render(
          `${diagramId}-${renderSequence}`,
          chart
        );

        if (!cancelled) {
          setSvg(liftHorizontalEdgeLabels(rendered.svg));
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось построить диаграмму");
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId]);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded]);

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function openViewer() {
    pointers.current.clear();
    dragOrigin.current = null;
    pinchDistance.current = null;
    resetView();
    setExpanded(true);
  }

  function updateScale(nextScale: number) {
    setScale(clampScale(nextScale));
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 1) {
      dragOrigin.current = {
        x: event.clientX - offset.x,
        y: event.clientY - offset.y,
      };
    } else if (pointers.current.size === 2) {
      const [first, second] = Array.from(pointers.current.values());
      pinchDistance.current = Math.hypot(second.x - first.x, second.y - first.y);
      pinchScale.current = scale;
    }
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinchDistance.current) {
      const [first, second] = Array.from(pointers.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      updateScale(pinchScale.current * (distance / pinchDistance.current));
      return;
    }

    if (pointers.current.size === 1 && dragOrigin.current) {
      setOffset({
        x: event.clientX - dragOrigin.current.x,
        y: event.clientY - dragOrigin.current.y,
      });
    }
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
    if (pointers.current.size === 0) dragOrigin.current = null;
  }

  if (error) {
    return (
      <figure className="markdown-mermaid is-error">
        <figcaption>{error}</figcaption>
        <pre>
          <code>{chart}</code>
        </pre>
      </figure>
    );
  }

  if (!svg) {
    return (
      <div className="markdown-mermaid is-loading" aria-live="polite">
        Строим диаграмму…
      </div>
    );
  }

  return (
    <>
      <figure className="markdown-mermaid" aria-label="Диаграмма">
        <button
          type="button"
          className="markdown-mermaid-expand"
          onClick={openViewer}
          aria-label="Увеличить диаграмму"
          title="Увеличить диаграмму"
        >
          ↗
        </button>
        <div
          className="markdown-mermaid-preview"
          onClick={openViewer}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </figure>

      {expanded ? (
        <div
          className="mermaid-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Увеличенная диаграмма"
        >
          <div className="mermaid-viewer-controls" aria-label="Масштаб диаграммы">
            <button type="button" onClick={() => updateScale(scale - SCALE_STEP)} aria-label="Уменьшить">
              −
            </button>
            <button type="button" onClick={resetView} aria-label="Вернуть исходный масштаб">
              {Math.round(scale * 100)}%
            </button>
            <button type="button" onClick={() => updateScale(scale + SCALE_STEP)} aria-label="Увеличить">
              +
            </button>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Закрыть">
              ×
            </button>
          </div>
          <div
            className="mermaid-viewer-canvas"
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onDoubleClick={resetView}
          >
            <div
              className="mermaid-viewer-diagram"
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
