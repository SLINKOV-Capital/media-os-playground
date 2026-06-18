# Architecture — Media OS Cockpit

## Стек

| Слой | Технология |
|------|------------|
| Frontend | Next.js 15 (App Router), React, TypeScript |
| Стили | Plain CSS, design tokens в `app/globals.css` |
| Backend / DB | Supabase (Postgres + Auth) |
| Деплой | Vercel |
| Мутации данных | Next.js Server Actions |

## Next.js App Router

- Страницы в `app/` — Server Components по умолчанию.
- Client Components только там, где нужна интерактивность (checklist, typeahead, inline edit, drag-and-drop).
- `middleware.ts` — refresh сессии Supabase, защита маршрутов.
- Server Actions: `app/documents/actions.ts`, `app/templates/actions.ts`, `app/materials/actions.ts` (план), `app/nihuyasi/actions.ts` (план).

## Page Title — единый контракт

Заголовки карточек сущностей верхнего уровня (Document, Material, Template) — один UI-контракт:

| Слой | Артефакт |
|------|----------|
| Компонент | `components/PageTitle.tsx` |
| Стили | tokens в `app/globals.css`: `--page-title-size`, `--page-title-weight`, `--page-title-line-height`, `--page-title-letter-spacing` |
| CSS-классы | `.page-title`, `.page-title-field`, `.page-title-static` — без per-entity классов |

Подробные правила, anti-patterns и чеклист регрессии — `docs/design-principles.md` → «Page Title — единый контракт».

## Drag-and-drop (dnd-kit)

- Списки с reorder: `SortableActionsList` (document actions), `SortableTodayList` (today).
- `useSortable` возвращает `attributes` с `aria-describedby` (IDs вида `DndDescribedBy-N`).
- **Hydration:** эти атрибуты нельзя применять на SSR — счётчик ID расходится между server и client. Решение: `lib/useClientDragHandleProps.ts` — drag handle props только после mount.
- У каждого `DndContext` — стабильный `id` (`document-actions-dnd`, `today-actions-dnd`).

## Supabase

- **Auth:** email + password, сессия в cookies через `@supabase/ssr`.
- **RLS:** все пользовательские таблицы — `auth.uid() = user_id`.
- **Клиенты:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`.

Переменные окружения:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Server Actions

| Файл | Операции |
|------|----------|
| `app/documents/actions.ts` | documents, actions, action_materials, generateActions, reorder, toggle done/today, **updateDocument** (план) |
| `app/templates/actions.ts` | workflow_templates_v2 CRUD, **updateTemplate** (план) |
| `app/materials/actions.ts` (план) | global materials CRUD, document_materials link/unlink, search |
| `app/nihuyasi/actions.ts` (план) | nihuyasi CRUD |

После мутаций — `revalidatePath` для затронутых маршрутов.

## Сущности БД

### v0.3 (план — global materials + nihuyasi)

**documents**
- `title` — unique `(user_id, title)` *(новое)*
- `document_type`, `user_id`, timestamps

**materials** (global)
- `title` — unique `(user_id, title)` *(новое)*
- `material_type`, `file_url_or_path`, `notes`
- `user_id`, timestamps
- **без записи в** `document_id` *(deprecated, колонка сохранена)*

**document_materials** *(новая)*
- `document_id`, `material_id`, `user_id`, `created_at`
- unique: `(document_id, material_id)`

**actions**
- `title`, `document_id`, `material_id` (deprecated)
- `done`, `today`, `sort_order`, `today_sort_order`
- `user_id`, timestamps

**action_materials**
- many-to-many actions ↔ materials
- unique: `(action_id, material_id)`

**workflow_templates_v2**
- `document_type`, `action_titles[]`
- unique: `(user_id, document_type)`

**nihuyasi** *(новая)*
- `user_id`, `date`, `text`, timestamps

Подробнее: `docs/materials-architecture.md`, `docs/nihuyasi.md`.

### v0.2 (текущее prod до миграции 008)

**materials** — с полем `document_id` (будет заменено на `document_materials`).

### Legacy (не развиваются)

**tasks**, **projects**, **workflow_templates** (v0.1).

## Маршруты

| Маршрут | Назначение | Статус |
|---------|------------|--------|
| `/` | Landing | публичный |
| `/login` | Вход | публичный |
| `/today` | Focus actions | AppShell |
| `/documents`, `/documents/new`, `/documents/[id]` | Documents | AppShell |
| `/templates`, `/templates/new`, `/templates/[id]/edit` | Templates | AppShell |
| `/materials` | Global materials table | **план v0.3** |
| `/materials/new` | Create material + document picker | **план v0.3** |
| `/materials/[id]` | Material card (documents + actions) | AppShell, **расширить v0.3** |
| `/nihuyasi` | Nihuyasi feed | **план v0.3** |
| `/auth/callback`, `/auth/logout` | Auth | — |

## Middleware

Protected prefixes:

- `/today`, `/templates`, `/documents`, `/materials`, `/nihuyasi` *(добавить)*

## Навигация

| Shell | Пункты |
|-------|--------|
| Desktop sidebar | Сегодня · Документы · Шаблоны · **Материалы** · **Нихуяси** · Выйти |
| Mobile bottom nav | Сегодня · Документы · Шаблоны *(без изменений)* |
| Mobile hamburger | Материалы · Нихуяси · Выйти |

## Миграции

| # | Файл | Содержание |
|---|------|------------|
| 001 | `001_initial.sql` | tasks, projects, workflow_templates (legacy) |
| 002 | `002_v0_2_documents.sql` | documents, materials, actions, workflow_templates_v2 |
| 003–006 | actions flags, sort orders | |
| 007 | `007_action_materials.sql` | action_materials junction |
| **008** | `008_global_materials.sql` *(план)* | document_materials, migrate, drop document_id, unique titles |
| **009** | `009_nihuyasi.sql` *(план)* | nihuyasi table + RLS |

## Legacy

- Таблицы и типы v0.1 — frozen.
- `actions.material_id` — deprecated, не удалять.

## Связанные документы

- `docs/materials-architecture.md` — global materials
- `docs/nihuyasi.md` — модуль Nihuyasi
- `docs/design-principles.md` — UI-паттерны
- `docs/deployment.md` — Vercel
