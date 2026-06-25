import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content.trim()) {
    return null;
  }

  return (
    <div className={className ?? "markdown-content"}>
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
