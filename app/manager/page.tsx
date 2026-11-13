import { AppShell } from "@/components/AppShell";
import { ManagerBoard } from "@/components/ManagerBoard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ManagerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/slinkov-cockpit-login");

  const [{ data: projects }, { data: tasks }, { data: actions }, { data: links }, { data: projectRows }, { data: documents }, { data: materials }] = await Promise.all([
    supabase.from("projects").select("id,user_id,name,description,category,sort_order").eq("user_id", user.id).is("archived_at", null).order("sort_order"),
    supabase.from("tasks").select("id,user_id,project_id,title,description,notes,category,sort_order,due_date,event_at,completed").eq("user_id", user.id).is("archived_at", null).order("sort_order"),
    supabase.from("actions").select("id,user_id,task_id,title,description,done,due_date,sort_order").eq("user_id", user.id).order("sort_order"),
    supabase.from("work_links").select("id,project_id,task_id,document_id,material_id").eq("user_id", user.id),
    supabase.from("projects").select("id,name").eq("user_id", user.id).order("name"),
    supabase.from("documents").select("id,title").eq("user_id", user.id).order("title"),
    supabase.from("materials").select("id,title,file_url_or_path").eq("user_id", user.id).order("title"),
  ]);
  const actionMap = new Map<string, NonNullable<typeof actions>>();
  for (const action of actions ?? []) if (action.task_id) actionMap.set(action.task_id, [...(actionMap.get(action.task_id) ?? []), action]);
  const projectNames = new Map((projectRows ?? []).map((project) => [project.id, project.name]));
  const documentTitles = new Map((documents ?? []).map((document) => [document.id, document.title]));
  const materialTargets = new Map((materials ?? []).map((material) => [material.id, { title: material.title, href: material.file_url_or_path || `/materials/${material.id}` }]));
  const documentIds = (links ?? []).map((link) => link.document_id).filter(Boolean) as string[];
  const materialIds = (links ?? []).map((link) => link.material_id).filter(Boolean) as string[];
  const [{ data: linkedDocuments }, { data: linkedMaterials }] = await Promise.all([
    documentIds.length ? supabase.from("documents").select("id,title").eq("user_id", user.id).in("id", documentIds) : Promise.resolve({ data: [], error: null }),
    materialIds.length ? supabase.from("materials").select("id,title,file_url_or_path").eq("user_id", user.id).in("id", materialIds) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const document of linkedDocuments ?? []) documentTitles.set(document.id, document.title);
  for (const material of linkedMaterials ?? []) materialTargets.set(material.id, { title: material.title, href: material.file_url_or_path || `/materials/${material.id}` });
  const relatedByParent = new Map<string, { id: string; title: string; href: string }[]>();
  for (const link of links ?? []) {
    const parent = link.project_id ?? link.task_id;
    if (!parent) continue;
    const title = link.document_id ? documentTitles.get(link.document_id) : link.material_id ? materialTargets.get(link.material_id)?.title : undefined;
    const href = link.document_id ? `/documents/${link.document_id}` : link.material_id ? materialTargets.get(link.material_id)?.href : undefined;
    if (title && href) relatedByParent.set(parent, [...(relatedByParent.get(parent) ?? []), { id: link.id, title, href }]);
  }
  const cards = [
    ...(projects ?? []).map((project) => ({ id: project.id, kind: "project" as const, title: project.name, description: project.description, category: "projects" as const, sort_order: project.sort_order, children: (tasks ?? []).filter((task) => task.project_id === project.id).map((task) => ({ id: task.id, title: task.title, completed: task.completed })), related: relatedByParent.get(project.id) ?? [] })),
    ...(tasks ?? []).map((task) => ({ id: task.id, kind: "task" as const, title: task.title, description: task.description ?? task.notes, category: task.category as never, sort_order: task.sort_order, due_date: task.due_date, event_at: task.event_at, completed: task.completed, project_id: task.project_id, project_name: task.project_id ? projectNames.get(task.project_id) : null, actions: actionMap.get(task.id) ?? [], related: relatedByParent.get(task.id) ?? [] })),
  ];
  return <AppShell><div className="content-page manager-page"><header className="content-header content-header-stack"><h1 className="content-title">Диспетчер</h1><p className="page-description">Проекты объединяют задачи. Задача — результат; действия — конкретная работа к нему.</p></header><ManagerBoard initialCards={cards} projects={projectRows ?? []} tasks={(tasks ?? []).map((task) => ({ id: task.id, title: task.title, completed: task.completed }))} documents={documents ?? []} materials={materials ?? []} /></div></AppShell>;
}
