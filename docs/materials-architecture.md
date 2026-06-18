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
| file_url_or_path | text | nullable |
| notes | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

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
| file | Файл | 📄 |
| note | Заметка | 📝 |
| source | Источник | 📚 |
| image | Изображение | 🖼 |
| other | Другое | ◻ |

Расширение списка — правка константы, не миграция.

## Маршруты

| Маршрут | Назначение |
|---------|------------|
| `/materials` | Глобальная таблица materials: search, filter by type, type icon |
| `/materials/new` | Создание material + обязательный выбор document |
| `/materials/[id]` | Карточка material: info, documents, actions |

Middleware: все `/materials/*` — protected (уже есть).

## Карточка material `/materials/[id]`

Секции (Notion property page, без карточек):

1. **Заголовок** — title (inline edit, auto-save)
2. **Свойства** — type pill, URL, notes
3. **Документы** — список documents через `document_materials` (ссылки на `/documents/[id]`)
4. **Действия** — список actions через `action_materials` (ссылки на document + action context)

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
| `updateMaterial` | title, type, url, notes |
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

## Material Preview (future)

Идея: для материалов типов `image`, `file` и `link` показывать превью прямо в карточке материала (`/materials/[id]`).

Примеры:

- **image** — миниатюра изображения по URL или из Storage
- **link** — Open Graph / oEmbed превью (заголовок, описание, favicon)
- **file** — превью PDF (первая страница) или иконка типа файла

Сейчас карточка показывает только текстовые свойства (URL, заметки). Превью — отдельная фаза после стабилизации CRUD и связей document ↔ material.
