"use client";

import { useState } from "react";

type MaterialUrlFieldProps = {
  id: string;
  name?: string;
  initialValue?: string;
  disabled?: boolean;
  onBlur?: (value: string) => void;
};

export function MaterialUrlField({
  id,
  name,
  initialValue = "",
  disabled = false,
  onBlur,
}: MaterialUrlFieldProps) {
  const [value, setValue] = useState(initialValue);
  const trimmedValue = value.trim();
  const isObsidianUrl = trimmedValue.startsWith("obsidian://");
  const isWebUrl = /^https?:\/\//i.test(trimmedValue);
  const isClickable = isObsidianUrl || isWebUrl;

  return (
    <div className="material-url-field">
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        placeholder="https://…"
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onBlur={(event) => onBlur?.(event.target.value)}
      />
      {isClickable && (
        <a
          className="material-url-link"
          href={trimmedValue}
          target={isWebUrl ? "_blank" : undefined}
          rel={isWebUrl ? "noopener noreferrer" : undefined}
          title={trimmedValue}
        >
          {trimmedValue}
        </a>
      )}
    </div>
  );
}
