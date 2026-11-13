import { expect, test } from "@playwright/test";
import { addActionToExistingTask, type AddActionDependencies, type ExistingTask, type PersistedAction } from "../../lib/mcpActionWorkflow";

const shopping: ExistingTask = { id: "shopping-1", title: "Покупки", category: "commitments" };
const supermarket: ExistingTask = { id: "supermarket-1", title: "Супермаркет", category: "intentions" };
const input = { task_query: "покупки", title: "Купить дайкон", idempotency_key: "d312cc66-9081-4e42-99b1-180f318a11af" };

test("adding an item searches existing tasks, writes an action under the unique match, and reads it back", async () => {
  const calls: string[] = [];
  let persisted: PersistedAction | null = null;
  const dependencies: AddActionDependencies = {
    searchTasks: async (query) => { calls.push(`search:${query}`); return [shopping, supermarket]; },
    createAction: async (action) => {
      calls.push(`create_action:${action.task_id}`);
      persisted = { id: "action-1", task_id: action.task_id, title: action.title, description: action.description ?? "", due_date: action.due_date ?? null };
      return { id: persisted.id };
    },
    readAction: async (id, taskId) => { calls.push(`read:${id}`); return persisted?.task_id === taskId ? persisted : null; },
  };

  const result = await addActionToExistingTask(input, dependencies);
  expect(calls).toEqual(["search:покупки", "create_action:shopping-1", "read:action-1"]);
  expect(result).toMatchObject({ created: true, task: { id: "shopping-1", title: "Покупки" }, action: { id: "action-1", title: "Купить дайкон", task_id: "shopping-1" }, verification: { read_after_write: true } });
});

test("ambiguous task matches return candidates without writing", async () => {
  let writes = 0;
  const dependencies: AddActionDependencies = {
    searchTasks: async () => [{ ...shopping, id: "shopping-1" }, { ...shopping, id: "shopping-2" }],
    createAction: async () => { writes++; return { id: "must-not-be-created" }; },
    readAction: async () => null,
  };

  const result = await addActionToExistingTask(input, dependencies);
  expect(result).toMatchObject({ created: false, needs_clarification: true, reason: "duplicate_exact_titles" });
  expect(writes).toBe(0);
});

test("a search result whose task title does not match is not used as an action target", async () => {
  let writes = 0;
  const dependencies: AddActionDependencies = {
    searchTasks: async () => [{ ...shopping, title: "Еженедельный обзор" }],
    createAction: async () => { writes++; return { id: "must-not-be-created" }; },
    readAction: async () => null,
  };

  const result = await addActionToExistingTask(input, dependencies);
  expect(result).toMatchObject({ created: false, needs_clarification: true, reason: "no_title_match" });
  expect(writes).toBe(0);
});

test("a write without a matching read-back is never reported as successful", async () => {
  const dependencies: AddActionDependencies = {
    searchTasks: async () => [shopping],
    createAction: async () => ({ id: "action-not-visible-yet" }),
    readAction: async () => null,
  };
  await expect(addActionToExistingTask(input, dependencies)).rejects.toThrow("do not report success");
});
