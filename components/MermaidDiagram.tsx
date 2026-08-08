"use client";

import { useEffect, useId, useState } from "react";

let mermaidInitialized = false;
let renderSequence = 0;

type MermaidDiagramProps = {
  chart: string;
};

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const reactId = useId();
  const diagramId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          setSvg(rendered.svg);
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
    <figure
      className="markdown-mermaid"
      aria-label="Диаграмма"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
