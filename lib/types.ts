export type TaskStatus = "new" | "decision" | "stuck" | "done" | "let_go";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  status: TaskStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  projects?: Pick<Project, "name"> | null;
};

export type WorkflowTemplate = {
  id: string;
  user_id: string;
  name: string;
  steps: { title: string }[];
  created_at: string;
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: "Новая",
  decision: "Требует решения",
  stuck: "Застряла",
  done: "Завершена",
  let_go: "Отпустить",
};

export const TASK_STATUSES: TaskStatus[] = [
  "new",
  "decision",
  "stuck",
  "done",
  "let_go",
];
