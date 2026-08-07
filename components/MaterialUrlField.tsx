"use client";

import { useState } from "react";
import type { MaterialTypeValue } from "@/lib/materialTypes";

type MaterialUrlFieldProps = {
  id: string;
  materialType: MaterialTypeValue;
  name?: string;
  initialValue?: string;
  disabled?: boolean;
  onBlur?: (value: string) => void;
};

export function MaterialUrlField({
  id,
  materialType,
  name,
  initialValue = "",
  disabled = false,
  onBlur,
}: MaterialUrlFieldProps) {
  const [value, setValue] = useState(initialValue);

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
      {materialType === "obsidian" && (
        <a
          className="ghost-button"
          href={value || undefined}
          aria-disabled={value ? undefined : true}
        >
          Открыть в Obsidian
        </a>
      )}
    </div>
  );
}
