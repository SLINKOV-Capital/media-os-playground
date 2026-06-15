# Architecture — Media OS Cockpit

## Стек

| Слой | Технология |
|------|------------|
| Frontend | Next.js 15 (App Router), React, TypeScript |
| Стили | Plain CSS, design tokens в `app/globals.css` |
| Backend / DB | Supabase (Postgres + Auth) |
| Деплой | Vercel (планируется) |
| Мутации данных | Next.js Server Actions |

## Next.js App Router

- Страницы в `app/` — Server Components по умолчанию.
- Client Components только там, где нужна интерактивность (например, `ActionChecklistItem` — auto-save on blur).
- `middleware.ts` — refresh сессии Supabase, защита маршрутов.
- `app/documents/actions.ts`, `app/templates/actions.ts` — Server Actions с `"use server"`.

## Supabase

- **Auth:** email + password, сессия в cookies через `@supabase/ssr`.
- **RLS:** все пользовательские таблицы — `auth.uid() = user_id`.
- **Клиенты:** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/middleware.ts`.

Переменные окружения:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Server Actions

Основные группы:

| Файл | Операции |
|------|----------|
| `app/documents/actions.ts` | documents, actions, materials, generateActions, reorderActions, toggleActionDone, toggleActionToday |
| `app/templates/actions.ts` | workflow_templates_v2 CRUD |

После мутаций — `revalidatePath` для затронутых маршрутов (`/documents`, `/documents/[id]`, `/today`, `/templates`).

## Сущности БД

### Актуальные (v0.2)

**documents**
- `title`, `document_type`
- `user_id`, timestamps

**materials**
- `title`, `material_type`, `file_url_or_path`, `notes`
- `document_id`, `user_id`, timestamps

**actions**
- `title`, `document_id`, `material_id` (nullable)
- `done` boolean, `today` boolean
- `sort_order` integer (0-based, порядок в документе)
- `user_id`, timestamps

**workflow_templates_v2**
- `document_type`, `action_titles[]` (text array)
- `user_id`, timestamps
- unique: `(user_id, document_type)`

### Legacy (не развиваются)

**tasks** — старая модель с enum-статусами (`new`, `decision`, `stuck`, `done`, `let_go`). Таблица сохранена, UI удалён.

**projects** — не используется в v0.2.

**workflow_templates** (v0.1) — `name` + `steps` jsonb. Заменена `workflow_templates_v2`, таблица не удалена.

## Маршруты

| Маршрут | Назначение | UI-статус |
|---------|------------|-----------|
| `/` | Лендинг | публичный |
| `/login` | Вход | публичный |
| `/documents` | Список документов | AppShell, Notion-like |
| `/documents/new` | Создание документа | AppShell |
| `/documents/[id]` | Страница документа | AppShell, checklist UI |
| `/templates` | Список шаблонов | AppShell |
| `/templates/new` | Новый шаблон | AppShell |
| `/templates/[id]/edit` | Редактирование шаблона | legacy top Nav |
| `/today` | Действия в фокусе | legacy top Nav |
| `/auth/callback`, `/auth/logout` | Auth flows | — |

## Legacy

- Таблицы `tasks`, `projects`, `workflow_templates` (v0.1).
- TypeScript-типы `Task`, `TaskStatus`, `Project`, `WorkflowTemplate` в `lib/types.ts`.
- `components/Nav.tsx` — top navigation для `/today` и `/templates/[id]/edit`.
- Статусная модель задач — полностью выведена из UI.

## Миграции

Файлы в `supabase/migrations/`:

1. `001_initial.sql` — tasks, projects, workflow_templates (v0.1)
2. `002_v0_2_documents.sql` — documents, materials, actions, workflow_templates_v2
3. `003_actions_done.sql` — `actions.done`
4. `004_actions_today.sql` — `actions.today`
5. `005_actions_sort_order.sql` — `actions.sort_order` (drag-and-drop reorder)
