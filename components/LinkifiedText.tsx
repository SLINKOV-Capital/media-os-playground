import type { ReactNode } from "react";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function splitUrlSuffix(url: string): { href: string; suffix: string } {
  let href = url;
  let suffix = "";

  while (href.length > 0 && /[.,;:!?)}\]]$/.test(href)) {
    suffix = href.slice(-1) + suffix;
    href = href.slice(0, -1);
  }

  return { href, suffix };
}

type LinkifiedTextProps = {
  text: string;
  className?: string;
  onLinkClick?: () => void;
};

export function LinkifiedText({
  text,
  className,
  onLinkClick,
}: LinkifiedTextProps) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const matches = [...text.matchAll(URL_REGEX)];

  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  for (const match of matches) {
    const url = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    const { href, suffix } = splitUrlSuffix(url);

    parts.push(
      <a
        key={`${index}-${href}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="linkified-url"
        onClick={(event) => {
          event.stopPropagation();
          onLinkClick?.();
        }}
      >
        {href}
      </a>
    );

    if (suffix) {
      parts.push(suffix);
    }

    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
