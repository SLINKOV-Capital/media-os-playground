"use client";

import { updateTaskStatus } from "@/app/today/actions";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Task,
  type TaskStatus,
} from "@/lib/types";
import { useTransition } from "react";

type TaskItemProps = {
  task: Task;
};

export function TaskItem({ task }: TaskItemProps) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(nextStatus: TaskStatus) {
    if (nextStatus === task.status || isPending) {
      return;
    }

    startTransition(async () => {
      await updateTaskStatus(task.id, nextStatus);
    });
  }

  return (
    <li className="task-item">
      <p className="task-title">{task.title}</p>
      <div className="status-buttons">
        {TASK_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`status-button${task.status === status ? " is-active" : ""}`}
            disabled={task.status === status || isPending}
            onClick={() => handleStatusChange(status)}
          >
            {TASK_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </li>
  );
}
