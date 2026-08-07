export const MATERIAL_TYPES = [
  { value: "obsidian", label: "Obsidian", icon: "💎" },
  { value: "image", label: "Изображение", icon: "🖼" },
  { value: "video", label: "Видео", icon: "🎬" },
  { value: "youtube", label: "YouTube", icon: "▶️" },
  { value: "other", label: "Другое", icon: "📦" },
] as const;

export type MaterialTypeValue = (typeof MATERIAL_TYPES)[number]["value"];

const MATERIAL_TYPE_VALUES = new Set<string>(
  MATERIAL_TYPES.map((item) => item.value)
);

export function isValidMaterialType(type: string): type is MaterialTypeValue {
  return MATERIAL_TYPE_VALUES.has(type);
}

export function getMaterialTypeIcon(type: string) {
  return MATERIAL_TYPES.find((item) => item.value === type)?.icon ?? "📦";
}

export function getMaterialTypeLabel(type: string) {
  return MATERIAL_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function normalizeMaterialTitle(title: string) {
  return title.trim().toLowerCase();
}
