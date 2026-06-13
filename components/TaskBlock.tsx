import { TaskItem } from "@/components/TaskItem";
import type { Task } from "@/lib/types";

type TaskBlockProps = {
  title: string;
  tasks: Task[];
};

export function TaskBlock({ title, tasks }: TaskBlockProps) {
  return (
    <section className="task-block">
      <h2>{title}</h2>
      {tasks.length === 0 ? (
        <p className="empty">Пусто</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
}
