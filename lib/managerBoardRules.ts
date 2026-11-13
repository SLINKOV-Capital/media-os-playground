import type { Category } from "@/lib/workCategories";

export function canMoveCardToCategory(kind: "project" | "task", category: Category) {
  return kind !== "project" || category === "projects";
}

export function categoryForCard(kind: "project" | "task", category: Category): Category {
  return kind === "project" ? "projects" : category;
}
