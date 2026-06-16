# Deployment — Media OS Cockpit на Vercel

## Цель деплоя

Вывести **Cockpit** Media OS в онлайн, чтобы он был доступен через браузер с разных устройств без локального `npm run dev`.

Media OS состоит из двух частей:

1. **Cockpit** — личный backend/admin для документов, действий, материалов, шаблонов и Today.
2. **Public website** — будущий внешний сайт на домене **soloten.com**.

Сейчас в онлайн выводится именно Cockpit. Public website и Cockpit живут в **одном Next.js-проекте**: публичный `/` и защищённые маршруты Cockpit деплоятся вместе.

Ограничения текущего деплоя:

- не менять бизнес-логику, schema, UI;
- не добавлять новые функции;
- не делать мобильную адаптацию;
- не удалять существующие страницы.

---

## Env-переменные

В коде используются **только две** переменные окружения:

| Переменная | Где используется | Обязательна |
|------------|------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `server.ts`, `middleware.ts` | Да |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | те же файлы | Да |

Других `process.env.*` в проекте нет.

**Не используются и не нужны для Cockpit:**

- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (проект использует publishable key)

Hardcoded `localhost`, `vercel.app` или `soloten.com` в коде отсутствуют.

Локальный `.env.local` описан в `.env.local.example`. Файл `.env*.local` в `.gitignore` — в git не коммитится.

---

## Vercel settings

### Импорт проекта

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Импорт Git-репозитория `MediaOSLab`
3. Framework: **Next.js** (auto-detect)

### Build settings

| Параметр | Значение |
|----------|----------|
| Build Command | `next build` (default) |
| Output Directory | default (Next.js App Router) |
| Install Command | `npm install` (default) |
| Node.js | default Vercel (версия не зафиксирована в репо) |

`vercel.json` не требуется. `next.config.ts` — пустой объект, без локальных путей.

### Environment Variables

Добавить в **Project Settings → Environment Variables** для **Production**, **Preview** и **Development**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Значения — те же, что в локальном `.env.local`.

### Scripts (`package.json`)

| Script | Назначение |
|--------|------------|
| `dev` | только локально |
| `build` | `next build` — используется Vercel |
| `start` | `next start` — Vercel использует свой runtime |

### Готовность сборки

`npm run build` проходит успешно (Next.js 15, 12 страниц, middleware ~90 kB).

---

## Supabase Auth settings

Вход в Cockpit — **email + password** (`signInWithPassword`). OAuth и magic link не используются, но маршрут `/auth/callback` зарегистрирован — нужен для PKCE и возможного email confirmation.

### Site URL

**Сейчас (временный Vercel-домен):**

```
https://<your-project>.vercel.app
```

**После перехода на soloten.com:**

```
https://soloten.com
```

### Redirect URLs

Добавить в **Supabase Dashboard → Authentication → URL Configuration**:

```
http://localhost:3000/auth/callback
http://localhost:3000/**
https://<your-project>.vercel.app/auth/callback
https://<your-project>.vercel.app/**
https://soloten.com/auth/callback
https://soloten.com/**
https://www.soloten.com/auth/callback
https://www.soloten.com/**
```

Для preview-деплоев PR (опционально):

```
https://*-<team>.vercel.app/**
```

### Пользователь

Пользователь Auth должен быть создан заранее: **Authentication → Users → Add user** (email + password).

### Переход Vercel → soloten.com

1. Vercel → **Domains** → добавить `soloten.com` (+ `www` при необходимости)
2. DNS у регистратора → CNAME/A по инструкции Vercel
3. Supabase → **Site URL** → `https://soloten.com`
4. Redirect URLs для Vercel-URL можно оставить — не мешают
5. Проверить login и callback на новом домене

**Примечание:** разделение Cockpit на subdomain (`app.soloten.com`) — отдельное решение на будущее. Сейчас один деплой обслуживает и public `/`, и Cockpit.

---

## Маршруты

| Маршрут | Тип | Auth | Назначение |
|---------|-----|------|------------|
| `/` | Static | публичный | Landing public website |
| `/login` | Static | публичный | Вход (редирект на `/documents` если уже залогинен) |
| `/today` | Dynamic | защищён | Действия в фокусе |
| `/documents` | Dynamic | защищён | Список документов |
| `/documents/new` | Dynamic | защищён | Создание документа |
| `/documents/[id]` | Dynamic | защищён | Страница документа |
| `/templates` | Dynamic | защищён | Список шаблонов |
| `/templates/new` | Dynamic | защищён | Новый шаблон |
| `/templates/[id]/edit` | Dynamic | защищён | Редактирование шаблона |
| `/materials/[id]` | Dynamic | защищён | Страница материала |
| `/auth/callback` | Route handler | публичный | Auth callback (PKCE) |
| `/auth/logout` | POST route | публичный | Выход |

---

## Middleware

Файл: `middleware.ts` → `lib/supabase/middleware.ts`.

Защищённые префиксы (без сессии → редирект на `/login`):

- `/today`
- `/templates`
- `/documents`
- `/materials`

Публичные маршруты:

- `/` — landing
- `/login` — если пользователь уже залогинен → редирект на `/documents`
- `/auth/callback`, `/auth/logout`

Matcher покрывает все страницы, кроме static assets (`_next/static`, `_next/image`, favicon, изображения).

---

## Checklist перед деплоем

- [ ] Миграции `001`–`006` применены в production Supabase вручную
- [ ] Пользователь Auth создан в Supabase (email + password)
- [ ] Локально `npm run build` проходит без ошибок
- [ ] `.env.local` не закоммичен (проверить `.gitignore`)
- [ ] Git-репозиторий запушен в remote (Vercel импортирует из Git)
- [ ] Значения `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` готовы для Vercel
- [ ] Supabase Site URL и Redirect URLs подготовлены (можно обновить сразу после первого деплоя, когда известен Vercel URL)

---

## Checklist после деплоя

1. [ ] `https://<project>.vercel.app/` — landing открывается, кнопка **Cockpit →** работает
2. [ ] `https://<project>.vercel.app/documents` — редирект на `/login`
3. [ ] Вход email/password → попадание на `/documents`
4. [ ] `/today` — открывается, данные из Supabase
5. [ ] `/templates` — открывается, список шаблонов
6. [ ] `/documents/[id]` — страница документа, действия и материалы
7. [ ] `/materials/[id]` — страница материала (для существующего материала)
8. [ ] **Выйти** → возврат на `/login`
9. [ ] Тот же URL с другого устройства — вход и работа Cockpit
10. [ ] Supabase Site URL обновлён на фактический production URL

---

## Риски

| Риск | Серьёзность | Комментарий |
|------|-------------|-------------|
| Env не заданы на Vercel | Высокая | Middleware и все страницы упадут |
| Неверный publishable key | Высокая | Auth и запросы к БД не работают |
| Миграции не применены в prod DB | Высокая | Runtime errors (например, `sort_order`, `today`) |
| Site URL в Supabase ≠ фактический домен | Средняя | Проблемы с callback/email flows; password login обычно работает |
| Preview-деплои (PR) | Средняя | Без wildcard redirect auth на preview может ломаться |
| Cockpit на том же домене, что public site | Средняя | `/login` публичен; защита только через auth |
| Один Vercel-проект на обе части | Средняя | Public pages и Cockpit деплоятся вместе |
| Мобильный UI не адаптирован | Средняя | Осознанно отложено; sidebar 240px на телефоне будет тесно |
| Node version не зафиксирована | Низкая | Vercel default обычно достаточен |
| `@dnd-kit/*` в dependencies | Низкая | Не блокирует деплой |

---

## Вердикт

Проект **технически готов** к деплою на Vercel. Блокеров в коде нет. Для онлайн-запуска нужны только настройки Vercel, env-переменные и Supabase Auth URLs.
