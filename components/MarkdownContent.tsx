import { MermaidDiagram } from "@/components/MermaidDiagram";
import { isValidElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
  className?: string;
  components?: Components;
};

const baseComponents: Components = {
  code: ({ className, children, ...props }) => {
    const language = /language-([^\s]+)/.exec(className ?? "")?.[1];
    const source = String(children).replace(/\n$/, "");

    if (language === "mermaid") {
      return <MermaidDiagram chart={source} />;
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    if (
      isValidElement(children) &&
      children.type === MermaidDiagram
    ) {
      return children;
    }

    return <pre>{children}</pre>;
  },
  table: ({ children }) => (
    <div
      className="markdown-table-scroll"
      role="region"
      aria-label="Таблица"
      tabIndex={0}
    >
      <table>{children as ReactNode}</table>
    </div>
  ),
};

export function MarkdownContent({
  content,
  className,
  components,
}: MarkdownContentProps) {
  if (!content.trim()) {
    return null;
  }

  return (
    <div className={className ?? "markdown-content"}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{ ...baseComponents, ...components }}
      >
        {content}
      </Markdown>
    </div>
  );
}
