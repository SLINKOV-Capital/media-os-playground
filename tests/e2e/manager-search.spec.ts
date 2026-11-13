import { expect, test } from "@playwright/test";
import { searchManagerData } from "../../lib/managerSearch";

const fixture = {
  projects: [{ id: "project-1", name: "QA Evening", description: "Подготовка" }],
  tasks: [{ id: "task-1", title: "Супермаркет", description: "Список покупок", project_id: "project-1" }],
  actions: [
    { id: "action-1", title: "Купить сахар", task_id: "task-1" },
    { id: "action-2", title: "Звонок", task_id: "task-2" },
  ],
  documents: [{ id: "document-1", title: "План вечера", content_md: "Творческий вечер" }],
  materials: [{ id: "material-1", title: "Кочудян", notes: "Паста" }],
};

test("existing manager search finds a task and returns its actions", () => {
  const results = searchManagerData(fixture, "Супермаркет");
  expect(results.tasks.map((item) => item.id)).toEqual(["task-1"]);
  expect(results.actions.map((item) => item.id)).toEqual(["action-1"]);
});

test("existing manager search finds action, document content, material notes and project text", () => {
  expect(searchManagerData(fixture, "Купить сахар").actions.map((item) => item.id)).toEqual(["action-1"]);
  expect(searchManagerData(fixture, "творческий вечер").documents.map((item) => item.id)).toEqual(["document-1"]);
  expect(searchManagerData(fixture, "Паста").materials.map((item) => item.id)).toEqual(["material-1"]);
  expect(searchManagerData(fixture, "подготовка").projects.map((item) => item.id)).toEqual(["project-1"]);
});
