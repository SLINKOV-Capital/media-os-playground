/** Homepage content below the hero. Notes in author briefs are not stored here. */

import {
  publicDocumentPath,
  publicHomePath,
  publicSectionPath,
} from "@/lib/site";

export const HOME_ABOUT_LINKS_ROW1 = [
  { href: publicSectionPath("articles"), label: "Статьи" },
  { href: publicSectionPath("stories"), label: "Истории" },
  { href: publicSectionPath("books"), label: "Книги" },
] as const;

export const HOME_ABOUT_LINKS_ROW2 = [
  { href: publicSectionPath("plays"), label: "Пьесы" },
  { href: publicSectionPath("video"), label: "Подкаст" },
  { href: `${publicHomePath()}#seminars`, label: "Семинары" },
  { href: `${publicHomePath()}#seminars`, label: "Концерты" },
] as const;

export const HOME_ABOUT_LINKS = [
  ...HOME_ABOUT_LINKS_ROW1,
  ...HOME_ABOUT_LINKS_ROW2,
] as const;

export const HOME_START_HERE = [
  {
    href: publicDocumentPath(
      "chem-otlichayetsya-trablshuter-ot-konsultanta",
      "articles"
    ),
    title: "Чем отличается траблшутер от консультанта",
    preview:
      "Почему эксперт — это не профессия, а способ смотреть на проблему.",
  },
  {
    href: publicDocumentPath(
      "kak-sdelat-interesnuyu-istoriyu-iz-skuchnyh-faktov",
      "articles"
    ),
    title: "Как сконструировать интересную историю",
    preview:
      "Почему сторителлинг — это не украшение текста, а инструмент мышления.",
  },
  {
    href: publicDocumentPath("kuzka", "stories"),
    title: "Кузька",
    preview:
      "Я люблю тебя! Люблю как старики любят собственную молодость. Всё время хочется вернуть.",
  },
] as const;

export const HOME_WORKING_ON = [
  {
    title: "Пишу книгу «Корпоративный сторителлинг»",
    size: "sm" as const,
    tone: "c" as const,
    image: "/brand/maska.webp",
  },
  {
    title: "Создаю несколько заказных AI-продуктов с помощью вайбкодинга",
    size: "xl" as const,
    tone: "a" as const,
    image: "/brand/orkestr.webp",
  },
  {
    title:
      "Записываю подкаст — истории о людях, бизнесе и технологиях без корпоративного новояза.",
    size: "md" as const,
    tone: "b" as const,
    image: "/brand/podcast.webp",
  },
  {
    title:
      "Записываю и режиссирую аудио-версию моей пьесы «Питерский Ангел»",
    size: "lg" as const,
    tone: "d" as const,
    image: "/brand/angel.webp",
  },
  {
    title:
      "Разрабатываю сервис, который превращает чтение иностранных книг в непрерывный процесс обучения языку",
    size: "sq" as const,
    tone: "e" as const,
    image: "/brand/chitatel.webp",
  },
] as const;

export const HOME_SEMINARS = [
  {
    title: "Семинары «Искусственный интеллект для бизнеса»",
    body: "Программа постоянно совершенствуется. Вышлю вам её по запросу. Семинар может быть спроектирован под ваши нужды и специфику. Рассказываю о конкретных ИИ-инструментах, показательных кейсах и о том, как человеку не стать ботом.",
  },
  {
    title: "Семинары «Корпоративный сторителлинг»",
    body: "Почему одни компании запоминаются, а другие — только перечисляют преимущества? Разбираем, как история, конфликт и юмор помогают завоёвывать внимание, доверие и объяснять сложные идеи без лишних слайдов и корпоративного новояза.",
  },
  {
    title: "Концертная программа\nавторских чтений",
    body: "Меня часто приглашают почитать мои истории широкой публике. Будет смешно, интересно и задумчиво. Осторожно: концерт может вызывать слёзы. Те самые, которые «счастья»!",
  },
] as const;

export const PUBLIC_SOCIALS = [
  { href: "https://t.me/slinkov", label: "Telegram" },
  { href: "https://www.linkedin.com/in/dslinkov/", label: "LinkedIn" },
  { href: "https://www.instagram.com/dimitriy2000/", label: "Instagram" },
  { href: "https://www.youtube.com/@slinkov.russian", label: "YouTube" },
  { href: "https://vk.ru/dslinkov", label: "VK" },
  { href: "https://tenchat.ru/slinkov", label: "TenChat" },
  { href: "https://www.threads.com/@dimitriy2000", label: "Threads" },
] as const;

/** Footer menu = about links (включая Концерты). */
export const FOOTER_NAV = HOME_ABOUT_LINKS;
