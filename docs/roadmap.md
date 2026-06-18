# Roadmap — Media OS

Зафиксированные идеи развития. Не является обязательством к реализации.

## v0.3 — архитектурный пакет (ближайший спринт)

### Global Materials

- [ ] Миграция `008_global_materials.sql` — `document_materials`, global materials, unique titles
- [ ] `/materials` — таблица, search, filter by type, type icons
- [ ] `/materials/new` — создание с обязательным document
- [ ] `/materials/[id]` — documents list + actions list
- [ ] Document card — «Добавить материал», typeahead, dedup by title, link existing
- [ ] Action checklist — materials только из document scope
- [ ] `app/materials/actions.ts` — CRUD, link/unlink, search
- [ ] Desktop sidebar — пункт «Материалы»
- [ ] Mobile hamburger — Materials

Подробнее: `docs/materials-architecture.md`.

### Nihuyasi

- [ ] Миграция `009_nihuyasi.sql`
- [ ] `/nihuyasi` — feed + inline add/edit
- [ ] Desktop sidebar — пункт «Нихуяси»
- [ ] Mobile hamburger — Nihuyasi
- [ ] `app/nihuyasi/actions.ts`

Подробнее: `docs/nihuyasi.md`.

### Bugfixes

- [ ] Inline edit **document title** на `/documents/[id]`
- [ ] Inline edit **template name** (`document_type`) на `/templates/[id]/edit`

### Uniqueness

- [ ] `materials.title` unique per `user_id`
- [ ] `documents.title` unique per `user_id`

## Ближайшие (после v0.3)

- [ ] **Вывести Media OS в онлайн** (см. `docs/deployment.md`)
- [ ] **Поработать на реальных задачах** и потюнить UX
- [ ] **Довести один документ до публикации**
- [ ] **Публичные страницы:** блог, статья (soloten.com)
- [ ] **Опубликовать первый пост** на временном домене

## Отложенные

- Перегенерация actions из шаблона
- Удаление global material
- Unlink material from document (UI)
- Поиск по documents и actions
- Фильтры на `/documents` (по типу)
- Breadcrumbs / recent documents в sidebar
- Очистка legacy-кода и таблиц v0.1
- `/templates/[id]/edit` — property rows унификация

## Когда-нибудь

- Dark mode
- Slash-команды
- Supabase Storage для files
- AI-функции
- Дедлайны и календарь
- Версионирование документов
- Экспорт (Markdown, PDF)
- Несколько пользователей / shared documents

## Выполнено (архив)

- v0.2 — documents, actions, materials, templates, Today
- v0.2.1 — `action_materials` many-to-many
- Action accordion UX на странице документа
- Drag-and-drop reorder (document + Today)
- AppShell + mobile bottom nav
- Deploy docs (`docs/deployment.md`)
