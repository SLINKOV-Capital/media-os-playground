import { expect, test } from "@playwright/test";
import { buildMaterialPatch, exactMaterialTitleMatches } from "../../lib/mcpMaterialWorkflow";
import { searchManagerData } from "../../lib/managerSearch";

test("appends to existing material notes without replacing its original text", () => {
  expect(buildMaterialPatch({ title: "Мышь", notes: "Появляется дважды" }, { append_text: "Второе появление должно быть неожиданным" })).toEqual({ notes: "Появляется дважды\n\nВторое появление должно быть неожиданным" });
  expect(buildMaterialPatch({ title: "Пустой", notes: null }, { append_text: "Новая мысль" })).toEqual({ notes: "Новая мысль" });
});

test("material edits reject ambiguous replacement and append inputs", () => {
  expect(() => buildMaterialPatch({ title: "A", notes: "B" }, { notes: "C", append_text: "D" })).toThrow("either replacement notes or append_text");
  expect(() => buildMaterialPatch({ title: "A", notes: null }, {})).toThrow("Provide a title, notes, or append_text");
});

test("normalizes exact title matches but preserves distinct materials", () => {
  const rows = [{ id: "a", title: "Мышь  в кадре" }, { id: "b", title: "Кадр с мышью" }, { id: "c", title: "мышь в кадре" }];
  expect(exactMaterialTitleMatches("Мышь в кадре", rows).map((item) => item.id)).toEqual(["a", "c"]);
});

test("completed and archived records remain searchable with their flags intact", () => {
  const archivedAt = "2026-11-13T08:00:00.000Z";
  const result = searchManagerData({
    projects: [{ id: "p1", name: "Архивный проект", archived_at: archivedAt }],
    tasks: [{ id: "t1", title: "Завершённая задача", completed: true }, { id: "t2", title: "Архивная задача", archived_at: archivedAt }],
    actions: [], documents: [], materials: [{ id: "m1", title: "Архивный материал", notes: "Содержимое", archived_at: archivedAt }],
  }, "Архив");
  expect(result.projects[0]).toMatchObject({ id: "p1", archived_at: archivedAt });
  expect(result.tasks[0]).toMatchObject({ id: "t2", archived_at: archivedAt });
  expect(result.materials[0]).toMatchObject({ id: "m1", archived_at: archivedAt, notes: "Содержимое" });
  expect(searchManagerData({ projects: [], tasks: [{ id: "t1", title: "Завершённая задача", completed: true }], actions: [], documents: [], materials: [] }, "Завершённая").tasks[0].completed).toBe(true);
});
