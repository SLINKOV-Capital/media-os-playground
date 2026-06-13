import { createTask } from "@/app/today/actions";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/types";

export function CreateTaskForm() {
  return (
    <section className="create-task">
      <h2 className="create-task-heading">Новая задача</h2>
      <form action={createTask}>
        <div className="create-task-fields">
          <div className="field field-grow">
            <label htmlFor="task-title">Название</label>
            <input id="task-title" name="title" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="task-status">Статус</label>
            <select id="task-status" name="status" defaultValue="decision">
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {TASK_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="create-task-submit">
            Создать
          </button>
        </div>
      </form>
    </section>
  );
}
