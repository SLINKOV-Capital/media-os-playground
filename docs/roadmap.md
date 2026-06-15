# Roadmap — Media OS

Зафиксированные идеи развития. Не является обязательством к реализации.

## Ближайшие

- **UI-2 завершение:** привести `/today` и `/templates/[id]/edit` к AppShell + checklist-стилю.
- **Единый Notion-property** для форм `/documents/new` и `/templates/new`.
- **Inline-редактирование** title и document_type на странице документа.
- **Подтверждение удаления** action (минимальный dialog или double-click).
- **Deploy на Vercel** + документация env-переменных.
- **Очистка legacy-кода:** удалить неиспользуемые типы Task/Project, компонент Nav (после миграции всех экранов).

## Отложенные

- **Перегенерация actions** из шаблона (с подтверждением, если actions уже есть).
- **Reorder actions** (sort_order в БД, без drag-and-drop — кнопки вверх/вниз).
- **Редактирование / удаление materials.**
- **Поиск** по документам и действиям.
- **Фильтры** на `/documents` (по типу).
- **Breadcrumbs** и навигация «последние документы» в sidebar.
- **Удаление legacy-таблиц** (`tasks`, `projects`, `workflow_templates` v0.1) после финальной миграции данных.

## Когда-нибудь

- **Dark mode.**
- **Drag-and-drop** reorder.
- **Slash-команды** на странице документа.
- **Supabase Storage** для файлов materials.
- **AI-функции** (генерация действий, черновиков).
- **Дедлайны и календарь.**
- **Версионирование документов.**
- **Экспорт** документа (Markdown, PDF).
- **Мобильная адаптация** sidebar (hamburger / bottom nav).
- **Несколько пользователей** / shared documents.
