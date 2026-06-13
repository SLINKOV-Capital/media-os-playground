import { CreateTaskForm } from "@/components/CreateTaskForm";
import { Nav } from "@/components/Nav";
import { TaskBlock } from "@/components/TaskBlock";
import { createClient } from "@/lib/supabase/server";
import type { Task, TaskStatus } from "@/lib/types";
import { redirect } from "next/navigation";

async function fetchTasksByStatus(status: TaskStatus): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", status)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(`Failed to fetch tasks (${status}):`, error.message);
    return [];
  }

  return (data ?? []) as Task[];
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [decisionTasks, stuckTasks, letGoTasks] = await Promise.all([
    fetchTasksByStatus("decision"),
    fetchTasksByStatus("stuck"),
    fetchTasksByStatus("let_go"),
  ]);

  return (
    <div className="page">
      <Nav />
      <header className="page-header">
        <h1>Что мне делать сегодня?</h1>
      </header>
      <CreateTaskForm />
      <TaskBlock title="Требует решения" tasks={decisionTasks} />
      <TaskBlock title="Застряло" tasks={stuckTasks} />
      <TaskBlock title="Можно отпустить" tasks={letGoTasks} />
    </div>
  );
}
