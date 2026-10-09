"use client";

import { useState, type ReactNode } from "react";

type Tab = "text" | "publication" | "media";

const tabs: { id: Tab; label: string }[] = [
  { id: "text", label: "Текст" },
  { id: "publication", label: "Публикация" },
  { id: "media", label: "Медиа" },
];

export function DocumentEditorTabs({
  text,
  publication,
  media,
}: {
  text: ReactNode;
  publication: ReactNode;
  media: ReactNode;
}) {
  const [active, setActive] = useState<Tab>("text");
  const panels: Record<Tab, ReactNode> = { text, publication, media };

  return (
    <div className="document-editor-tabs">
      <div className="document-editor-tab-list" role="tablist" aria-label="Поля документа">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`document-tab-${id}`}
            aria-selected={active === id}
            aria-controls={`document-panel-${id}`}
            className="document-editor-tab"
            onClick={() => setActive(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tabs.map(({ id }) => (
        <section
          key={id}
          role="tabpanel"
          id={`document-panel-${id}`}
          aria-labelledby={`document-tab-${id}`}
          className="document-editor-panel doc-page-stack"
          hidden={active !== id}
        >
          {panels[id]}
        </section>
      ))}
    </div>
  );
}
