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
- Фильтр по `material_type` — pills или select, hardcoded types.
- Кнопка «+ Новый материал» — `.notion-new-button`.
- Без CRM-таблицы и boxed-карточек.



### Создание material



- Из `/materials/new` — **обязательный** выбор document (property row или combobox).
- Из `/documents/[id]` — document подставлен; panel «Добавить материал»:
  - typeahead по title (от 1 символа);
  - создание нового или привязка существующего;
  - dedup: один title на user — дубль не создавать.



### Карточка `/materials/[id]`



- Title — крупный заголовок страницы, inline edit.
- Properties: type pill, URL, notes.
- Секция **Документы** — flat list ссылок (не «родитель», а все documents).
- Секция **Действия** — flat list linked actions.
- Без файлового менеджера; URL — accent link.



### На странице документа



- Секция «Материалы» — materials, привязанные к document через `document_materials`.
- Кнопка **«Добавить материал»** → search + create/link panel.
- В action checklist доступны только materials **этого document**.



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



## Материалы — вторичные объекты (v0.2, частично заменено v0.3)



> Секция выше «Материалы — global objects» заменяет модель v0.2. Ниже — историческая справка до миграции.



- На странице документа — список materials document-scoped (до v0.3).
- **Теги и ссылки:** material pill → `/materials/[id]`.
- Accordion в action row для many-to-many (action_materials).



## Today — рабочая поверхность внимания



- Не таск-менеджер и не доска статусов.

- AppShell + единый sidebar с остальными экранами.

- **Дата — часть заголовка страницы** (`Сегодня` + dateline под ним), не sticky-баннер и не отдельная плашка.

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

- «Удалить» — при hover строки, muted.



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


