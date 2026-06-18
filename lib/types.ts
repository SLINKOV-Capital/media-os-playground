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

export type Document = {
  id: string;
  user_id: string;
  title: string;
  document_type: string;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: string;
  user_id: string;
  /** @deprecated Use document_materials. DB NOT NULL compat only on create. */
  document_id?: string | null;
  title: string;
  material_type: string;
  file_url_or_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentMaterial = {
  id: string;
  document_id: string;
  material_id: string;
  user_id: string;
  created_at: string;
};

export type ActionMaterial = {
  id: string;
  action_id: string;
  material_id: string;
  user_id: string;
  created_at: string;
};

export type Action = {
  id: string;
  user_id: string;
  document_id: string;
  /** @deprecated Use action_materials junction. Not written by new code. */
  material_id: string | null;
  title: string;
  done: boolean;
  today: boolean;
  sort_order: number;
  today_sort_order: number | null;
  created_at: string;
  updated_at: string;
  materials?: Pick<Material, "id" | "title">[];
};

export type WorkflowTemplate = {
  id: string;
  user_id: string;
  name: string;
  steps: { title: string }[];
  created_at: string;
};

export type WorkflowTemplateV2 = {
  id: string;
  user_id: string;
  document_type: string;
  action_titles: string[];
  created_at: string;
  updated_at: string;
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
