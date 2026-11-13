import { expect, test } from "@playwright/test";
import { categoryForCard, canMoveCardToCategory } from "../../lib/managerBoardRules";
import { captureProjectMaterial, findDuplicateProjectName, resolveExistingProject, type CaptureProjectMaterialDependencies, type PersistedProjectMaterial } from "../../lib/mcpProjectWorkflow";
import { normalizeMcpTitle, projectMaterialTitle } from "../../lib/mcpTitles";

test("removes only assistant command wrappers and keeps meaningful action verbs", () => {
  expect(normalizeMcpTitle("Купи телогрейку")).toBe("Телогрейка");
  expect(normalizeMcpTitle("Напомни мне про отчёт")).toBe("Отчёт");
  expect(normalizeMcpTitle("Добавь запиши купить маслины")).toBe("Маслины");
  expect(normalizeMcpTitle("Сдать отчёт")).toBe("Сдать отчёт");
  expect(normalizeMcpTitle("Создай проект Зимний дом")).toBe("Зимний дом");
});

test("projects remain in the Projects column but can be reordered there", () => {
  expect(categoryForCard("project", "wishes")).toBe("projects");
  expect(canMoveCardToCategory("project", "projects")).toBe(true);
  expect(canMoveCardToCategory("project", "intentions")).toBe(false);
  expect(canMoveCardToCategory("task", "intentions")).toBe(true);
});

test("resolves inflected project search uniquely and asks on ambiguity", () => {
  expect(resolveExistingProject("таш", [{ id: "p1", name: "Таша" }])).toMatchObject({ status: "found", match: "partial", project: { id: "p1" } });
  expect(resolveExistingProject("Таша", [{ id: "p1", name: "Таша" }])).toMatchObject({ status: "found", match: "exact", project: { id: "p1" } });
  expect(resolveExistingProject("Таша", [{ id: "p1", name: "Таша" }, { id: "p2", name: "Таша" }])).toMatchObject({ status: "clarify", reason: "duplicate_exact_names" });
});

test("blocks same-name projects while allowing an idempotent retry or a different project name", () => {
  const existing = [{ id: "p1", name: "  Зимний  дом ", submission_id: "same-key" }];
  expect(findDuplicateProjectName("зимний дом", existing)).toMatchObject({ id: "p1" });
  expect(findDuplicateProjectName("Зимний дом", existing, { submission_id: "same-key" })).toBeNull();
  expect(findDuplicateProjectName("Летний дом", existing)).toBeNull();
});

const project = { id: "project-1", name: "Таша" };
const original = "Идея для Таши: мышь должна появиться в кадре дважды";
const materialTitle = projectMaterialTitle(original);

test("creates one ordinary project material, keeps original wording and verifies link and timestamp", async () => {
  const calls: string[] = [];
  let persisted: PersistedProjectMaterial | null = null;
  let createCount = 0;
  const dependencies: CaptureProjectMaterialDependencies = {
    searchProjects: async (query) => { calls.push(`project-search:${query}`); return query === "Таш" ? [project] : []; },
    searchMaterials: async () => [],
    createAndLink: async ({ project_id, title, notes }) => {
      calls.push("create-material-and-project-link");
      createCount++;
      persisted = { id: "material-1", project_id, title, notes, created_at: "2026-11-13T09:00:00Z", linked_to_project: true };
      return { id: persisted.id };
    },
    readMaterial: async (id, projectId) => {
      calls.push("read-material-and-link");
      return persisted?.id === id && persisted.project_id === projectId ? persisted : null;
    },
  };

  const input = { project_query: "Таши", content: original, idempotency_key: "a5bce316-e647-4c98-bc77-2dd7136b4943" };
  const saved = await captureProjectMaterial(input, dependencies, projectMaterialTitle);
  expect(saved).toMatchObject({ created: true, project: { id: "project-1", name: "Таша" }, material: { id: "material-1", title: "Мышь должна появиться в кадре дважды", notes: original, created_at: "2026-11-13T09:00:00Z", linked_to_project: true }, verification: { read_after_write: true } });
  expect(calls).toEqual(["project-search:Таши", "project-search:Таш", "create-material-and-project-link", "read-material-and-link"]);
  expect(createCount).toBe(1);
});

test("repeating a saved thought verifies the existing material and does not duplicate it", async () => {
  const savedMaterial: PersistedProjectMaterial = { id: "material-1", project_id: project.id, title: materialTitle, notes: original, created_at: "2026-11-13T09:00:00Z", linked_to_project: true };
  let createCount = 0;
  const dependencies: CaptureProjectMaterialDependencies = {
    searchProjects: async () => [project],
    searchMaterials: async () => [{ id: savedMaterial.id, title: savedMaterial.title }],
    createAndLink: async () => { createCount++; return { id: "unexpected" }; },
    readMaterial: async () => savedMaterial,
  };

  const result = await captureProjectMaterial({ project_query: "Таша", content: original, idempotency_key: "a5bce316-e647-4c98-bc77-2dd7136b4943" }, dependencies, projectMaterialTitle);
  expect(result).toMatchObject({ created: false, already_saved: true, verification: { read_after_write: true }, material: { id: "material-1" } });
  expect(createCount).toBe(0);
});

test("ambiguous project matches do not create or link materials", async () => {
  let writes = 0;
  const dependencies: CaptureProjectMaterialDependencies = {
    searchProjects: async () => [{ id: "project-1", name: "Таша" }, { id: "project-2", name: "Таша" }],
    searchMaterials: async () => [],
    createAndLink: async () => { writes++; return { id: "unexpected" }; },
    readMaterial: async () => null,
  };
  const result = await captureProjectMaterial({ project_query: "Таша", content: original, idempotency_key: "a5bce316-e647-4c98-bc77-2dd7136b4943" }, dependencies, projectMaterialTitle);
  expect(result).toMatchObject({ created: false, needs_clarification: true, reason: "duplicate_exact_names" });
  expect(writes).toBe(0);
});

test("a material whose project link or original wording cannot be read back is not reported as saved", async () => {
  const dependencies: CaptureProjectMaterialDependencies = {
    searchProjects: async () => [project],
    searchMaterials: async () => [],
    createAndLink: async () => ({ id: "material-1" }),
    readMaterial: async () => ({ id: "material-1", project_id: project.id, title: materialTitle, notes: "changed wording", created_at: "2026-11-13T09:00:00Z", linked_to_project: false }),
  };
  await expect(captureProjectMaterial({ project_query: "Таша", content: original, idempotency_key: "a5bce316-e647-4c98-bc77-2dd7136b4943" }, dependencies, projectMaterialTitle)).rejects.toThrow("do not report success");
});
