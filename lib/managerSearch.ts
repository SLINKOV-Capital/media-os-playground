type SearchRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  notes?: string | null;
  content_md?: string | null;
  task_id?: string | null;
  archived_at?: string | null;
  completed?: boolean;
};

export type ManagerSearchData = {
  projects: SearchRecord[];
  tasks: SearchRecord[];
  actions: SearchRecord[];
  documents: (SearchRecord & { content_md?: string | null })[];
  materials: SearchRecord[];
};

export function searchManagerData(data: ManagerSearchData, query: string, id?: string | null) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");
  const includes = (...values: (string | null | undefined)[]) => !normalizedQuery || values.some((value) => value?.toLocaleLowerCase("ru").includes(normalizedQuery));
  const projects = data.projects.filter((item) => (!id || item.id === id) && includes(item.name, item.description));
  const matchedTasks = data.tasks.filter((item) => (!id || item.id === id) && includes(item.title, item.description, item.notes));
  const textMatchedActions = data.actions.filter((item) => includes(item.title, item.description));
  const taskIdsMatchedByActions = new Set(textMatchedActions.map((item) => item.task_id).filter((taskId): taskId is string => Boolean(taskId)));
  const tasks = !id && normalizedQuery
    ? [...new Map([...matchedTasks, ...data.tasks.filter((item) => taskIdsMatchedByActions.has(item.id))].map((item) => [item.id, item])).values()]
    : matchedTasks;
  const matchedTaskIds = new Set(tasks.map((item) => item.id));
  const actions = data.actions.filter((item) => !id
    ? textMatchedActions.includes(item) || Boolean(item.task_id && matchedTaskIds.has(item.task_id))
    : item.id === id || Boolean(item.task_id && matchedTaskIds.has(item.task_id)));
  const documents = data.documents
    .filter((item) => (!id || item.id === id) && includes(item.title, item.content_md))
    .map(({ content_md: _content, ...document }) => document);
  const materials = data.materials.filter((item) => (!id || item.id === id) && includes(item.title, item.notes));
  return { projects, tasks, actions, documents, materials };
}
