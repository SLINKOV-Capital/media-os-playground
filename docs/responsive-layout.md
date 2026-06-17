# Responsive Layout — Media OS

Правила, чтобы горизонтальный скролл и «плывущая» вёрстка не возвращались после каждой UI-итерации.

## Breakpoint

- **Compact shell** (mobile top bar + bottom nav, без sidebar): `max-width: 1024px`
- **Desktop shell** (sidebar, без bottom nav): `min-width: 1025px`

Порог **1024px**, не 900px: в landscape на iPhone Pro Max viewport ~932px — при 900px включался desktop-shell (sidebar 240px + padding 96px) на физическом телефоне.

Токен: `--layout-compact-max: 1024px` в `app/globals.css` (документация; в media queries — литерал).

## Overflow

- `html`, `body`, `.app-shell`, `.app-shell-body`, `.app-main` — **`overflow-x: hidden`**, не `clip` (лучше на iOS Safari).
- Не полагаться на точечные `overflow-x` на отдельных экранах — только глобальный containment + `min-width: 0` на flex/grid-цепочках.

## Ширина

- **Не использовать `100vw`** для layout-контейнеров (scrollbar + safe area ломают ширину).
- Использовать **`width: 100%`** + `max-width: 100%`.
- У flex-детей в main-цепочке: **`min-width: 0`** (без этого текст/inputs раздувают родителя).

## Padding

- `.content-page` — **fluid padding** через `clamp()`, не фиксированные `96px` на узких viewport.
- Compact: фиксированные `12px` inline.

## Grid / fixed columns

- В collection-list колонки только как **`minmax(0, Npx)`**, не голые `160px` / `120px`.
- Property rows: label с `max-width: 38%`, value с `min-width: 0`.

## Shell DOM

- `MobileBottomNav` — **внутри** `.app-shell-body`, не sibling на уровне `.app-shell`.
- Bottom nav: `position: fixed`, `width: 100%` (не `100vw`).

## DnD overlay

- `.is-drag-overlay` — `max-width: 100%`, `box-sizing: border-box` (DragOverlay рендерится в portal).

## Чеклист перед merge UI-изменений

1. Проверить portrait **390px** и landscape **~932px** на Today, Documents, Template Edit, Materials.
2. Повернуть portrait → landscape → portrait — layout не должен переключаться в desktop-shell на телефоне.
3. Длинный текст / URL — `overflow-wrap: anywhere` или `word-break` на value-полях.
4. Новый компонент в flex-row — добавить `min-width: 0` на растягиваемый child.
5. Не добавлять `width: 100vw`, фиксированные grid-колонки без `minmax(0, …)`.

## Запрещённые паттерны

| Паттерн | Почему |
|---------|--------|
| `100vw` на shell/nav | горизонтальный скролл из-за scrollbar |
| `overflow-x: clip` как единственная защита | слабая поддержка на mobile Safari |
| breakpoint 900px для shell | landscape phone → desktop layout |
| `padding: 48px 96px` без clamp | контент шире viewport на узком экране |
| label `width: 140px` без `min-width: 0` на sibling | flex overflow |
| patch `overflow-x` на одном экране | симптом, не причина |
