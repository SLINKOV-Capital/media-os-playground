# Materials Architecture — Global Materials (v0.3)

## Суть изменения

Materials перестают быть «дочерними» одного документа. Material — **глобальный объект пользователя**, связанный с документами через junction table `document_materials`.

Связь action ↔ material (`action_materials`, v0.2.1) **сохраняется** и не меняется.

```
documents ←── document_materials ──→ materials
                                        ↑
                                 action_materials
                                        ↑
                                     actions
```

## Правила домена

### Material = атом информации

Material — **глобальный атом информации** пользователя: заголовок, тип, ссылка на источник, текстовое содержимое. Связь с actions (`action_materials`) остаётся в БД, но **не показывается** на карточке material.

### Material нельзя создать без document

Material **всегда** создаётся вместе с хотя бы одной записью в `document_materials`. Orphan-materials в БД недопустимы.

### Два пути создания

| Контекст | Document | Связь |
|----------|----------|-------|
| Карточка документа `/documents/[id]` | текущий document подставляется автоматически | `document_materials` создаётся автоматически |
| Общая таблица `/materials` | пользователь **обязан** выбрать document | без document — ошибка, material не создаётся |

### Уникальность title

- `materials.title` уникален в рамках `user_id`.
- `documents.title` уникален в рамках `user_id`.

При попытке создать material с существующим title (из карточки документа):

- дубль **не создаётся**;
- показывается существующий material;
- пользователь может **привязать** его к текущему document (insert в `document_materials`, если связи ещё нет).

### Привязка существующего material к document

На карточке документа:

- поиск по title (typeahead, от 1 символа);
- выбор существующего global material → link в `document_materials`;
- создание нового → material + `document_materials` в одной транзакции.

## Схема БД (целевая)

### materials (изменённая)

| Поле | Тип | Примечание |
|------|-----|------------|
| id | uuid | PK |
| user_id | uuid | FK auth.users |
| title | text | unique `(user_id, title)` |
| material_type | text | свободный text, UI — hardcoded types + icons |
| file_url_or_path | text | nullable; **оригинал / источник** (Mail.ru, Drive, прямой URL) |
| notes | text | nullable; UI **«Содержимое»** — plain Markdown |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Целевые поля (future, без миграции сейчас):**

| UI / код | Колонка (future) | Примечание |
|----------|------------------|------------|
| Содержимое | `content` | rename `notes` → `content` |
| Превью | `preview_url` | публичный URL миниатюры в Supabase Storage |

**Deprecated (не удаляется):** `document_id` — данные сохранены; новый код читает `document_materials`, колонку не пишет.

### document_materials (новая)

| Поле | Тип | Примечание |
|------|-----|------------|
| id | uuid | PK |
| document_id | uuid | FK documents ON DELETE CASCADE |
| material_id | uuid | FK materials ON DELETE CASCADE |
| user_id | uuid | FK auth.users |
| created_at | timestamptz | default now() |

**Unique:** `(document_id, material_id)`

### action_materials (без изменений)

Many-to-many actions ↔ materials. Уже реализовано в миграции `007`.

## Material types и иконки

Список типов и иконок **захардкожен** в коде (`lib/materialTypes.ts`):

| material_type | UI label | Icon |
|---------------|----------|------|
| link | Ссылка | 🔗 |
| youtube | YouTube | ▶️ |
| file | Файл | 📄 |
| note | Заметка | 📝 |
| image | Изображение | 🖼 |
| other | Другое | 📦 |

Расширение списка — правка константы, не миграция.

## Маршруты

| Маршрут | Назначение |
|---------|------------|
| `/materials` | Глобальная таблица materials: search, filter by type, type icon |
| `/materials/new` | Создание material + обязательный выбор document |
| `/materials/[id]` | Карточка material: свойства, документы |

Middleware: все `/materials/*` — protected (уже есть).

## Карточка material `/materials/[id]`

Секции (Notion property page, без карточек):

1. **Название материала** — title (inline edit, auto-save)
2. **Свойства** — type, URL / путь (источник), **Содержимое** (Markdown textarea)
3. **Документы** — список documents через `document_materials` (ссылки на `/documents/[id]`)

Поле **Содержимое** в UI = колонка `materials.notes` в БД (plain Markdown, без WYSIWYG).

Убирается понятие «документ-родитель» — material может быть в нескольких documents.

## Карточка document `/documents/[id]`

Секция «Материалы» (переработка `DocumentMaterialsBlock`):

- список materials, привязанных через `document_materials`;
- кнопка **«Добавить материал»** → inline panel / popover:
  - поиск существующего material по title;
  - создание нового (с dedup по title);
  - привязка существующего к document.

Materials в action checklist — только materials, **уже привязанные к этому document** (через `document_materials`).

## Server Actions (план)

| Action | Описание |
|--------|----------|
| `createMaterial` | material + document_materials; dedup по title |
| `linkMaterialToDocument` | insert document_materials |
| `unlinkMaterialFromDocument` | delete document_materials (не удаляет global material) |
| `searchMaterials` | по title, для typeahead |
| `updateMaterial` | title, type, url, content (`notes`) |
| `updateDocument` | **bugfix:** inline title |
| `updateTemplate` | **bugfix:** inline document_type (название шаблона) |

## Миграция данных

1. Создать `document_materials`.
2. Перенести `materials.document_id` → rows в `document_materials`.
3. Дедупликация перед unique `(user_id, title)` на materials — вручную или скриптом в миграции.
4. Дедупликация перед unique `(user_id, title)` на documents.
5. ~~Удалить колонку `materials.document_id`.~~ Колонка **deprecated**, не удаляется (008).
6. Добавить unique indexes.

## RLS

`document_materials` — те же паттерны, что `action_materials`:

- select/insert/delete: `auth.uid() = user_id`
- insert: material и document принадлежат user; optional check same user

## Что не входит в v0.3

- Supabase Storage для файлов
- Редактирование material_type enum в БД (остаётся text)
- Global library без привязки к document
- Удаление global material (отложено)

## Material preview (roadmap)

| Фаза | Поведение |
|------|-----------|
| **Сейчас (interim)** | Для `image` + прямой URL в `file_url_or_path` — `<img>` preview в UI (без Storage) |
| **Future** | `preview_url` + bucket `material-previews` в Supabase Storage; upload локального файла, resize; `file_url_or_path` остаётся ссылкой на оригинал |

Не делаем сейчас: OpenGraph, proxy, парсинг Mail.ru / Google Drive, auto-download чужих картинок.

## Material content editor (roadmap)

| Версия | Редактор |
|--------|----------|
| **v1** | Markdown textarea («Содержимое»), auto-height, plain text в `notes` |
| **v1.1** | Вкладка preview (rendered Markdown) |
| **v2** | WYSIWYG; кандидаты: TipTap, Lexical |

## Material Preview (future, beyond Storage preview)

Идея: для материалов типов `file` и `link` показывать превью в карточке.

Примеры:

- **link** — Open Graph / oEmbed превью (заголовок, описание, favicon)
- **file** — превью PDF (первая страница) или иконка типа файла
- **youtube** — embed preview (отдельная фаза)
