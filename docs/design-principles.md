# Design Principles — Media OS



Визуальные референсы: **Notion**, **Craft**, **Capacities**, **Reflect** — паттерны и ощущения, не копирование пиксель-в-пиксель.



## Цели дизайна



- Спокойный, лёгкий интерфейс с большим количеством воздуха.

- Минимум визуального шума — пользователь работает с содержимым, а не с формами.

- Ощущение «страницы», а не «административной панели».

- **Единая система** для Cockpit и будущего public website на **soloten.com** — одна типографика, tokens и паттерны; разные контексты (редактирование vs чтение), но одно ощущение продукта.



## Единая система: Cockpit и Public Site



**Архитектурное решение:** визуальный язык Media OS — не только UI Cockpit (`test.soloten.com`), но и основа будущего публичного сайта **soloten.com**. Cockpit и Public Site должны ощущаться **частями одной системы**, а не как «админка + отдельный маркетинговый лендинг».



### Ориентиры



Notion · Craft · Capacities · Reflect



### Запрещённый стиль



- CRM, ERP, админка, корпоративный лендинг.

- Тяжёлые карточки и boxed-секции «ради дизайна».

- Формы как анкеты: label сверху + bordered input, stack полей, primary-кнопка на каждый шаг.

- Декоративные блоки без функции (баннеры, sticky-плашки, цветные секции).



### Нужный стиль



- **Страница как документ** — заголовок, текст, списки; UI не конкурирует с контентом.

- **Контент важнее UI** — chrome минимален; акцент на читаемость и редактирование.

- **Минимум рамок** — структура через отступы (24–32px между секциями), типографику и hover; границы input — только при focus.

- **Иерархия через типографику и воздух** — не через карточки и цветные фоны.

- **Объекты контента** — ссылки, материалы, действия, записи блога выглядят как элементы страницы или строки списка, не как поля формы или строки таблицы.



### Public Site (soloten.com)



| Паттерн | Принцип |

|---------|---------|

| **Blog list** | Список страниц — как collection-list в Cockpit: название primary, дата/тип secondary, без карточной сетки |

| **Article page** | Чистая страница для чтения: крупный заголовок, body-текст, минимум chrome; тот же `--text`, `--bg`, типографическая шкала |

| **Навигация** | Спокойная, без «hero»-блоков и маркетинговых секций |

| **Связь с Cockpit** | Те же design tokens, шрифт, muted/accent; публичная статья и документ в Cockpit — визуально родственные «страницы» |



### Cockpit vs Public Site



| | Cockpit | Public Site |

|---|---------|-------------|

| Роль | Редактирование, workflow, фокус | Чтение, публикация |

| Shell | Sidebar / mobile nav | Минимальный header или без sidebar |

| Интерактив | Checklist, property rows, inline edit | Ссылки, типографика, редкие CTA |

| Общее | Tokens, типографика, «страница не форма», flat lists, без CRM-эстетики | То же |



### Property rows (Cockpit)



- Desktop: метка слева → значение справа, общий hover-блок (Notion property).

- Mobile: **вертикальный stack** — метка над значением; не сжимать в две колонки на узком экране.



## Design tokens



Определены в `app/globals.css`:



**Адаптив:** правила layout — `docs/responsive-layout.md` (breakpoint 1024px, overflow, min-width: 0).



| Token | Значение | Назначение |

|-------|----------|------------|

| `--bg` | `#ffffff` | основной фон |

| `--bg-secondary` | `#f7f7f5` | sidebar, карточки, callout |

| `--bg-hover` | `#efefef` | hover строк и блоков |

| `--text` | `#37352f` | основной текст |

| `--text-muted` | `#9b9a97` | метки, вторичный текст |

| `--border` | `#e9e9e7` | тонкие разделители |

| `--accent` | `#2383e2` | Notion-blue |

| `--accent-soft` | rgba blue 8% | активные состояния |

| `--sidebar-width` | `240px` | фиксированная ширина sidebar |



Шрифт: system-ui stack, базовый размер 14px.



## Визуальные принципы



1. **Мало рамок.** Разделение через отступы, hover и фон — не через чёрные линии.

2. **Мало кнопок «Сохранить».** Inline-редактирование с auto-save on blur там, где возможно.

3. **Inline labels.** Свойства (Notion property): метка и значение в одной строке, общий hover-блок.

4. **Destructive actions вторичны.** «Удалить» — muted, виден при hover строки.

5. **Без цветовых статусов.** Нет красных/жёлтых/зелёных бейджей статусов.

6. **Sidebar всегда видим.** Фиксированная ширина, навигация: Сегодня · Документы · Шаблоны · Выйти.

7. **Мало подчёркиваний и разделителей.** Горизонтальные линии — только там, где нужна структура списка; не для декора.



## Общие UI-паттерны



### Кнопка «+ Новый …» (`.notion-new-button`)



- Без рамки, прозрачный фон, muted-текст.

- Hover: лёгкий `--bg-hover`, текст темнеет.

- Используется на `/documents` и `/templates`.



### Списки-коллекции (`.collection-list`)



- Notion-database без ощущения Excel: нет внешней рамки, лёгкие разделители между строками.

- Строка целиком кликабельна (или основная часть — ссылка).

- Hover на строке — `--bg-hover`, больше воздуха (`padding` 12px).

- Заголовки колонок — мелкий muted-текст, без цветного фона.

- **Primary-элемент строки** — крупнее и жирнее (`15px`, `font-weight: 500`).

- **Secondary-метаданные** — `13px`, `--text-muted`.

- Деструктивные действия в строке (например, «Удалить») — скрыты, видны при hover.



## Sidebar



- Фон `--bg-secondary`, тонкий `border-right`.

- Бренд и пункты навигации — hover на `--bg-hover`.

- Активный пункт: `--accent-soft` + `--accent`, `font-weight: 500`. Без inset-полоски.

- «Выйти» — muted, внизу sidebar.

- Пункт **Materials** в desktop sidebar — **добавляется в v0.3** (`/materials`).
- Пункт **Нихуяси** в desktop sidebar — **v0.3** (`/nihuyasi`).
- На mobile: Materials и Nihuyasi — только через **hamburger menu**; bottom nav не меняется.



## Документы — главный объект



### Список `/documents`



- Collection-list: **название** — primary, **тип** и **дата обновления** — secondary.

- Клик по строке ведёт на страницу документа.



### Страница `/documents/[id]`



- Заголовок крупный (`2.5rem`, bold) — это «страница», не поле формы.

- Тип документа — subtle pill под заголовком.

- Секции (Действия, Материалы) разделены **воздухом** (24–32px), без карточек и рамок вокруг блоков.

- Документ воспринимается как **страница**, не как запись в таблице.



## Действия — чек-листы



- Checkbox слева → **Done**.

- Title — borderless input, зачёркивание при `done`.

- Pill **«В фокус»** → `today = true` (синий при активном).

- Материал — pills, не dropdown. Активный pill — ссылка на `/materials/[id]`; неактивные — кнопки назначения.

- «Добавить действие» — placeholder-строка внизу списка.

- Фильтр «Только активные» скрывает выполненные; drag handle скрыт в этом режиме.

- **Reorder в документе** — drag-and-drop через grip-handle (⋮⋮) слева от checkbox; только в режиме «Показать все». Сама строка не перетаскивается — только handle. Handle полупрозрачен, виден при hover. Порядок — `actions.sort_order` (с 0), библиотека `@dnd-kit`.



## Материалы — global objects (v0.3)



Materials — **глобальные объекты пользователя**, не «дети» одного документа. Связь с documents — через `document_materials`; с actions — через `action_materials`.



Подробнее: `docs/materials-architecture.md`.



### Список `/materials`



- Collection-list (Notion-database): type **icon** слева, **title** primary, **material_type** secondary.
- Поиск по title (inline, без modal).
- Фильтр по `material_type` — pills или select, hardcoded types (см. список ниже).
- Кнопка «+ Новый материал» — `.notion-new-button`.
- Без CRM-таблицы и boxed-карточек.

**Допустимые `material_type`** (константа `lib/materialTypes.ts`, не enum в БД):

| value | UI label | icon |
|-------|----------|------|
| link | Ссылка | 🔗 |
| youtube | YouTube | ▶️ |
| file | Файл | 📄 |
| note | Заметка | 📝 |
| image | Изображение | 🖼 |
| other | Другое | 📦 |

Иконка и label — через `getMaterialTypeIcon()` / `getMaterialTypeLabel()`; select — `MaterialTypeSelect`.



### Создание material



- Из `/materials/new` — **обязательный** выбор document (property row или combobox).
- Из `/documents/[id]` — document подставлен; panel «Добавить материал»:
  - typeahead по title (от 1 символа);
  - создание нового или привязка существующего;
  - dedup: один title на user — дубль не создавать.



### Карточка `/materials/[id]`



- Title — крупный заголовок страницы, inline edit.
- Properties: type, URL / путь, image preview (v1 для `image`), **Содержимое** (Markdown textarea, full width, auto-height).
- UI label **Содержимое** = DB column `notes` (plain Markdown).
- Секция **Документы** — flat list ссылок (не «родитель», а все documents).
- Без секции «Связанные действия» на карточке material (материал = атом информации).
- Без файлового менеджера; URL — текстовое поле, image preview только по прямому URL.



### На странице документа



- Секция «Материалы» — materials, привязанные к document через `document_materials`.
- Для `image` + URL — миниатюра слева в строке списка.
- Кнопка **«Добавить материал»** → search + create/link panel.
- В action checklist доступны только materials **этого document**.



### Material content editor (roadmap)

- **v1** — Markdown textarea «Содержимое»
- **v1.1** — preview tab
- **v2** — WYSIWYG (TipTap / Lexical)



### Type icons



Hardcoded map в `lib/materialTypes.ts` — emoji или SVG слева от title в списках.



## Nihuyasi (v0.3)



- Отдельный feed, не смешивать с documents.
- Хронологический список: дата secondary, текст primary.
- Inline add / edit, auto-save.
- Подробнее: `docs/nihuyasi.md`.



## Mobile navigation (v0.3)



- **Bottom nav** — без изменений: Сегодня · Документы · Шаблоны.
- **Hamburger** (правый верхний угол или sidebar drawer): Материалы · Нихуяси · Выйти.
- Hamburger не дублирует пункты bottom nav.



## Inline edit — bugfixes (v0.3)



- **Document title** на `/documents/[id]` — borderless input / contenteditable pattern, auto-save on blur (как action title).
- **Template name** (`document_type`) на `/templates/[id]/edit` — тот же паттерн; сейчас заголовок статичный — исправить.



## Page Title — единый контракт



В Media OS все основные сущности используют единый визуальный контракт заголовка:



* Document
* Material
* Template
* будущие карточки сущностей



**Реализация:** `components/PageTitle.tsx` — единственный компонент заголовка сущности. Используется на `/documents/[id]`, `/materials/[id]`, `/templates/new`, `/templates/[id]/edit` и read-only экранах (например «Новый материал»).



### Правила



1. Заголовок сущности является объектом первого уровня интерфейса.
2. Все заголовки должны выглядеть одинаково.
3. Inline-редактируемый заголовок и статический заголовок визуально не отличаются.
4. Размер, вес и межстрочный интервал задаются только через tokens:

   * `--page-title-size` (desktop: 2.5rem; mobile: `--page-title-size-mobile` 1.75rem)
   * `--page-title-weight` (700)
   * `--page-title-line-height` (1.15)
   * `--page-title-letter-spacing` (-0.03em)
5. Заголовок обязан корректно переноситься на несколько строк (многострочный `textarea` / `h1`, auto-height).
6. Любое изменение типографики выполняется через tokens, а не через стили конкретной сущности.
7. Запрещено использовать `font: inherit` для полей заголовков — shorthand сбрасывает размер до body (14px).
8. Legacy-селекторы вида `.page-header h1` не допускаются без дополнительного scope (только `.page .page-header h1`).

CSS: `.page-title`, `textarea.page-title-field`, `h1.page-title-static` — один набор правил для всех сущностей.



### Anti-patterns



Запрещено создавать отдельные визуальные системы заголовков:



* `doc-page-title`
* `material-page-title`
* `template-page-title`



Должен существовать один контракт заголовка для всех карточек сущностей.



### Регрессия после CSS-изменений (вывод из бага 2025)



Если после CSS-изменений меняется типографика заголовков, **обязательно** проверять визуально:



* `/documents/[id]`
* `/materials/[id]`
* `/templates/[id]/edit`



**Что пошло не так:** замена заголовков на `PageTitle` с `font: inherit` на поле + глобальный `.page-header h1 { 1.5rem }` — все три сущности «схлопнулись» до размера body. Исправление: tokens + явная типографика, legacy scope под `.page`.



## Материалы — вторичные объекты (v0.2, частично заменено v0.3)



> Секция выше «Материалы — global objects» заменяет модель v0.2. Ниже — историческая справка до миграции.



- На странице документа — список materials document-scoped (до v0.3).
- **Теги и ссылки:** material pill → `/materials/[id]`.
- Accordion в action row для many-to-many (action_materials).



## Today — рабочая поверхность внимания



- Не таск-менеджер и не доска статусов.

- AppShell + единый sidebar с остальными экранами.

- **Дата — часть заголовка страницы** (`Сегодня` + dateline под ним), не sticky-баннер и не отдельная плашка.
- **Часовой пояс Today — всегда Europe/Moscow** (`lib/format.ts`: `TODAY_TIMEZONE`, `formatMoscowIsoDate()`, `formatTodayHeading()`). Dateline и блок Nihuyasi на Today используют московскую календарную дату, независимо от TZ устройства или сервера.

- Плоский список actions с `today = true`; **без группировки по документам** и без горизонтальных разделителей между блоками.

- Визуальная иерархия строки: **Действие → Документ → Материал**.

  - Действие — primary: `16px`, `font-weight: 600`.

  - Документ — secondary: ссылка-accent под действием.

  - Материал — tag-pill после документа через `·`; ссылка на `/materials/[id]`.

- Checkbox — тот же notion-style, что на странице документа (не кнопка «Готово»).

- «Убрать из фокуса» — muted, скрыта, видна при hover строки; не агрессивна.

- **Reorder на Today** — grip-handle слева от checkbox, всегда включён (включая done-actions). Порядок — `actions.today_sort_order`, не влияет на `sort_order` в документе.

- Пользователь **вручную** вытаскивает действия в фокус с страницы документа.



## Шаблоны `/templates`



- Кнопка «+ Новый шаблон» — `.notion-new-button`.

- Collection-list: **тип документа** — primary, **количество действий** — secondary.

- «Удалить» — при hover строки, muted. Если тип используется documents — ошибка с числом документов.

- Inline rename типа (`PageTitle`) — каскадно обновляет documents через RPC.



## Тип документа — консистентность



| Правило | Поведение |
|---------|-----------|
| Создание document | Select только из `workflow_templates_v2` |
| Удаление template | Запрещено при documents с этим типом |
| Переименование template | Каскад на все documents + duplicate check |
| Карточка document | Select смены типа (`DocumentTypeSelect`) |
| Orphan type | Document со старым типом без шаблона — показать hint, выбрать новый |



## Правила синего акцента (`--accent`)



Использовать **только** для:



- ссылок (документ, внешний URL на странице материала);

- активного пункта sidebar;

- pill «В фокусе»;

- активного material pill (привязка к действию);

- focus-состояния input (border + soft shadow).



**Не использовать** для: primary-кнопок (они тёмно-серые `--text`), статусов, destructive actions, фона секций, кнопки «Убрать из фокуса».



## Состояние UI-миграции



| Экран | Статус |

|-------|--------|

| `/documents`, `/documents/new` | AppShell + collection-list |

| `/documents/[id]` | AppShell + checklist + reorder |

| `/templates`, `/templates/new` | AppShell + collection-list |

| `/today` | AppShell + focus checklist + reorder + dateline в заголовке |

| `/materials` | AppShell + global collection-list | **план v0.3** |
| `/materials/[id]` | AppShell + property page + documents + actions | **расширить v0.3** |
| `/nihuyasi` | AppShell + feed | **план v0.3** |

| `/templates/[id]/edit` | AppShell + property page (миграция в процессе) |

| `/login`, `/` | обновлены tokens, без sidebar |

| **soloten.com** (public) | не реализован; следовать разделу «Единая система: Cockpit и Public Site» |



## Отложенные идеи (дизайн)



- Dark mode.

- Collapsible sidebar.

- Slash-команды.

- Emoji-иконки документов.

- Hover-only menus (`···`) вместо текстовых кнопок.


