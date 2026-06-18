# Nihuyasi — личный дневник наблюдений

## Что это

**Nihuyasi** (UI: «Нихуяси») — отдельный модуль Media OS Cockpit. Личная лента коротких текстовых записей по датам. Не связан с documents, actions, materials.

## Схема БД

Таблица `nihuyasi`:

| Поле | Тип | Примечание |
|------|-----|------------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | FK auth.users ON DELETE CASCADE |
| date | date | дата записи (не timestamptz — одна запись на день или несколько?) |
| text | text | содержимое |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | trigger set_updated_at |

**Уточнение v0.3:** несколько записей на одну `date` допустимы (нет unique на date).

## RLS

Стандартный паттерн Media OS: `auth.uid() = user_id` для select, insert, update, delete.

## Маршруты

| Маршрут | Назначение |
|---------|------------|
| `/nihuyasi` | Список записей (группировка по date, новые сверху) |
| `/nihuyasi/new` | Новая запись (опционально, может быть inline на списке) |

Middleware: `/nihuyasi` — protected.

## Навигация

| Контекст | Поведение |
|----------|-----------|
| **Desktop sidebar** | Новый пункт «Нихуяси» между основными разделами |
| **Mobile bottom nav** | **Без изменений** — Сегодня · Документы · Шаблоны |
| **Mobile hamburger** | Materials, Nihuyasi, Выйти и прочие вторичные пункты |

Hamburger menu — новый UI-компонент для mobile (`components/MobileMenu.tsx`).

## UI (design principles)

- Collection-list или хронологический feed — **не CRM-карточки**.
- Дата — secondary metadata, текст — primary.
- Inline add внизу или «+ Новая запись» (`.notion-new-button`).
- Inline edit текста, auto-save on blur.
- Без цветовых статусов, без тяжёлых рамок.
- Фон секций — через воздух, не boxed cards.

## Server Actions

| Action | Описание |
|--------|----------|
| `createNihuyasiEntry` | date + text |
| `updateNihuyasiEntry` | text, date |
| `deleteNihuyasiEntry` | удаление |

Файл: `app/nihuyasi/actions.ts`.

## Терминология UI

| English | UI (ru) |
|---------|---------|
| Nihuyasi | Нихуяси |

Не путать с Action, Material, Document.
