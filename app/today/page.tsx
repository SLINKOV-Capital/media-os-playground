import { toggleActionDone, toggleActionToday } from "@/app/documents/actions";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import type { Action, Document } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

type FocusAction = Action & {
  documents: Pick<Document, "id" | "title">;
};

type DocumentGroup = {
  document: Pick<Document, "id" | "title">;
  actions: FocusAction[];
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("actions")
    .select("*, documents(id, title)")
    .eq("today", true)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch focus actions:", error.message);
  }

  const focusActions = (data ?? []) as FocusAction[];
  const groups = groupByDocument(focusActions);

  return (
    <div className="page">
      <Nav />
      <header className="page-header">
        <h1>Сегодня</h1>
        <p className="page-subtitle">Действия в фокусе из разных документов</p>
      </header>

      {groups.length === 0 ? (
        <p className="empty">
          Ничего в фокусе. Откройте документ и нажмите «В фокус» у нужного
          действия.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.document.id} className="doc-block">
            <h2 className="doc-block-title">
              Документ:{" "}
              <Link href={`/documents/${group.document.id}`} className="doc-link">
                {group.document.title}
              </Link>
            </h2>
            <ul className="action-list">
              {group.actions.map((action) => (
                <li
                  key={action.id}
                  className={`action-item today-action-item${
                    action.done ? " is-done" : ""
                  }`}
                >
                  <div className="action-controls">
                    <form action={toggleActionDone} className="inline-form">
                      <input type="hidden" name="id" value={action.id} />
                      <input
                        type="hidden"
                        name="document_id"
                        value={action.document_id}
                      />
                      <input
                        type="hidden"
                        name="done"
                        value={action.done ? "false" : "true"}
                      />
                      <button type="submit" className="action-toggle-button">
                        {action.done ? "☑" : "☐"} Готово
                      </button>
                    </form>

                    <form action={toggleActionToday} className="inline-form">
                      <input type="hidden" name="id" value={action.id} />
                      <input
                        type="hidden"
                        name="document_id"
                        value={action.document_id}
                      />
                      <input type="hidden" name="today" value="false" />
                      <button type="submit" className="text-button">
                        Убрать из фокуса
                      </button>
                    </form>
                  </div>
                  <p className="action-title-line">{action.title}</p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function groupByDocument(actions: FocusAction[]): DocumentGroup[] {
  const map = new Map<string, DocumentGroup>();

  for (const action of actions) {
    const document = action.documents;
    if (!document) {
      continue;
    }

    const existing = map.get(document.id);
    if (existing) {
      existing.actions.push(action);
      continue;
    }

    map.set(document.id, {
      document,
      actions: [action],
    });
  }

  return Array.from(map.values());
}
