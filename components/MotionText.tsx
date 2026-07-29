"use client";

type CharMotionProps = {
  text: string;
  className?: string;
  charClassName: string;
};

function CharMotion({ text, className, charClassName }: CharMotionProps) {
  return (
    <span className={className}>
      {Array.from(text).map((char, index) => (
        <span
          key={`${index}-${char}`}
          className={charClassName}
          style={{ ["--i" as string]: index }}
          aria-hidden="true"
        >
          {char === " " ? "\u00a0" : char}
        </span>
      ))}
      <span className="public-motion-sr">{text}</span>
    </span>
  );
}

/** Letter wave on hover — use inside links / menu items. */
export function WaveText({ text, className }: { text: string; className?: string }) {
  return (
    <CharMotion
      text={text}
      className={`public-wave${className ? ` ${className}` : ""}`}
      charClassName="public-wave-char"
    />
  );
}

/** Mechanical flipboard on hover — footer links. */
export function FlipText({ text, className }: { text: string; className?: string }) {
  return (
    <CharMotion
      text={text}
      className={`public-flip${className ? ` ${className}` : ""}`}
      charClassName="public-flip-char"
    />
  );
}
