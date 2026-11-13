export type ExistingTask = { id: string; title: string; project_id?: string | null; category?: string };
export type PersistedAction = { id: string; task_id: string; title: string; description?: string | null; due_date?: string | null };

export type AddActionInput = {
  task_query: string;
  title: string;
  description?: string;
  due_date?: string;
  idempotency_key: string;
};

export type AddActionDependencies = {
  searchTasks: (query: string) => Promise<ExistingTask[]>;
  createAction: (input: { task_id: string; title: string; description?: string; due_date?: string; idempotency_key: string }) => Promise<{ id: string }>;
  readAction: (id: string, taskId: string) => Promise<PersistedAction | null>;
};

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

export function resolveExistingTask(query: string, candidates: ExistingTask[]) {
  const normalizedQuery = normalize(query);
  const unique = [...new Map(candidates.map((task) => [task.id, task])).values()];
  const exact = unique.filter((task) => normalize(task.title) === normalizedQuery);
  if (exact.length === 1) return { status: "found" as const, task: exact[0], candidates: exact };
  if (exact.length > 1) return { status: "clarify" as const, reason: "duplicate_exact_titles", candidates: exact };
  const titleMatches = unique.filter((task) => {
    const title = normalize(task.title);
    return normalizedQuery && (title.includes(normalizedQuery) || normalizedQuery.includes(title));
  });
  if (titleMatches.length === 1) return { status: "found" as const, task: titleMatches[0], candidates: titleMatches };
  return {
    status: "clarify" as const,
    reason: titleMatches.length > 1 ? "multiple_task_matches" : unique.length ? "no_title_match" : "no_existing_task",
    candidates: titleMatches.length ? titleMatches : unique,
  };
}

export async function addActionToExistingTask(input: AddActionInput, dependencies: AddActionDependencies) {
  const taskQuery = input.task_query.trim();
  const title = input.title.trim();
  if (!taskQuery || !title) throw new Error("A task query and action title are required");

  const candidates = await dependencies.searchTasks(taskQuery);
  const resolution = resolveExistingTask(taskQuery, candidates);
  if (resolution.status !== "found") {
    return { created: false as const, needs_clarification: true as const, reason: resolution.reason, candidates: resolution.candidates };
  }

  const created = await dependencies.createAction({ ...input, task_id: resolution.task.id, title });
  const saved = await dependencies.readAction(created.id, resolution.task.id);
  if (!saved || saved.id !== created.id || saved.task_id !== resolution.task.id || saved.title !== title || (saved.description ?? "") !== (input.description ?? "") || (saved.due_date ?? null) !== (input.due_date ?? null)) {
    throw new Error("MediaOS did not confirm the action after saving; do not report success");
  }

  return {
    created: true as const,
    task: { id: resolution.task.id, title: resolution.task.title },
    action: saved,
    verification: { read_after_write: true as const },
  };
}
