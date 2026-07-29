export const PUBLIC_NAV = [
  { href: "/articles", label: "Статьи" },
  { href: "/stories", label: "Истории" },
  { href: "/books", label: "Книги" },
  { href: "/plays", label: "Пьесы" },
  { href: "/video", label: "Подкаст" },
  { href: "/#seminars", label: "Семинары" },
  { href: "/#seminars", label: "Концерты" },
] as const;

/** Compact horizontal bar (≥1200px): subset of sections. */
export const PUBLIC_DESKTOP_NAV = [
  { href: "/articles", label: "Статьи" },
  { href: "/stories", label: "Истории" },
  { href: "/books", label: "Книги" },
  { href: "/#seminars", label: "Семинары" },
] as const;

export type PublicSectionId =
  | "articles"
  | "stories"
  | "books"
  | "plays"
  | "videos"
  | "glossary"
  | "presentations";

export type PlaceholderItem = {
  slug: string;
  title: string;
  type: string;
  preview: string;
  href?: string;
  image?: string;
};

export type PublicSection = {
  id: PublicSectionId;
  path: string;
  title: string;
  eyebrow: string;
  intro: string;
  items: PlaceholderItem[];
};

export const PUBLIC_SECTIONS: PublicSection[] = [
  {
    id: "articles",
    path: "/articles",
    title: "Статьи",
    eyebrow: "(Статьи)",
    intro:
      "Тексты о том, как ИИ входит в работу редакции, бизнеса и повседневных решений — без магии и без паники.",
    items: [
      {
        slug: "razzhovannoe-slozhnoe",
        title: "Разжёванное сложное: зачем объяснять ИИ человеческим языком",
        type: "Статья",
        preview:
          "Если сложное не разжевать, оно остаётся чужим. Как строить тексты, которые оставляют читателю ясность, а не впечатление.",
        href: "/p/demo-article",
        image: "/brand/chitatel.webp",
      },
      {
        slug: "redakciya-s-ii",
        title: "Редакция с ИИ: что оставить человеку",
        type: "Статья",
        preview:
          "Черновик, фактчек, тон, публикация — где модель ускоряет, а где решение всё ещё за автором.",
        href: "/p/demo-article",
        image: "/brand/maska.webp",
      },
      {
        slug: "odna-tema-mnogo-formatov",
        title: "Одна тема — много форматов",
        type: "Статья",
        preview:
          "Статья, видео и шортс по одной теме — разные проекты. Как не смешивать каналы и не терять смысл.",
        href: "/p/demo-article",
        image: "/brand/orkestr.webp",
      },
    ],
  },
  {
    id: "stories",
    path: "/stories",
    title: "Рассказы",
    eyebrow: "(Рассказы)",
    intro:
      "Короткие истории на стыке технологий и человеческих решений — без морали «на вырост».",
    items: [
      {
        slug: "operator-nochnoy-smeny",
        title: "Оператор ночной смены",
        type: "Рассказ",
        preview:
          "Система предлагает идеальный ответ. Человек должен решить, можно ли его отправить клиенту.",
      },
      {
        slug: "pis'mo-kotoroe-ne-otpravili",
        title: "Письмо, которое не отправили",
        type: "Рассказ",
        preview:
          "Черновик готов. Кнопка «опубликовать» мигает. Между ними — пауза длиннее, чем весь текст.",
      },
      {
        slug: "gorod-bez-poiska",
        title: "Город без поиска",
        type: "Рассказ",
        preview:
          "В городе отключили поиск на сутки. Остались разговоры, карты и чужая память.",
      },
    ],
  },
  {
    id: "books",
    path: "/books",
    title: "Книги",
    eyebrow: "(Книги)",
    intro: "Длинные формы: то, что не умещается в пост и не обязано умещаться в ленту.",
    items: [
      {
        slug: "mezhdu-strok-ii",
        title: "ИИ между строк",
        type: "Книга",
        preview:
          "Практическая книга о том, как читать новости об ИИ, отделять сигнал от шума и писать об этом самому.",
      },
      {
        slug: "rabochaya-tetrad-redaktora",
        title: "Рабочая тетрадь редактора",
        type: "Книга",
        preview:
          "Шаблоны вопросов, чек-листы фактачека и упражнения на ясность — для тех, кто ведёт тексты каждый день.",
      },
    ],
  },
  {
    id: "plays",
    path: "/plays",
    title: "Пьесы",
    eyebrow: "(Пьесы)",
    intro: "Диалоги и сцены, где технология — не декорация, а действующее лицо.",
    items: [
      {
        slug: "soveshchanie-s-modeлью",
        title: "Совещание с моделью",
        type: "Пьеса",
        preview:
          "Трое в комнате и один голос из колонки. Решение должно быть принято до конца акта.",
      },
      {
        slug: "proba-golosa",
        title: "Проба голоса",
        type: "Пьеса",
        preview:
          "Актёр читает текст, сгенерированный под его интонацию. Зритель слышит двоих.",
      },
    ],
  },
  {
    id: "videos",
    path: "/video",
    title: "Подкаст",
    eyebrow: "(Подкаст)",
    intro: "Разборы, эфиры и короткие ролики — отдельные документы, не «каналы» одной статьи.",
    items: [
      {
        slug: "kak-ya-sobirayu-novosti",
        title: "Как я собираю новости об ИИ",
        type: "Видео",
        preview:
          "Отбор, пруфы, обложка, постинг. Закулисье редакционного конвейера без розовых фильтров.",
      },
      {
        slug: "pyat-minut-o-promptakh",
        title: "Пять минут о промптах, которые не стыдно показать",
        type: "Видео",
        preview:
          "Не «секретные формулы», а рабочие формулировки для черновика, сокращения и фактчека.",
      },
      {
        slug: "konsultaciya-na-kameru",
        title: "Консультация на камеру: разбор кейса",
        type: "Видео",
        preview:
          "Как команда внедрила ИИ в подготовку материалов и где упёрлась в процесс, а не в модель.",
      },
    ],
  },
  {
    id: "glossary",
    path: "/glossary",
    title: "Тезаурус",
    eyebrow: "(Тезаурус)",
    intro:
      "Словарь ИИ без англицизмов ради статуса. Короткие определения, которыми можно пользоваться в тексте.",
    items: [
      {
        slug: "gallyucinaciya",
        title: "Галлюцинация",
        type: "Термин",
        preview:
          "Когда модель уверенно выдаёт несуществующий факт. Не «ошибка печати» — структурный риск генерации.",
      },
      {
        slug: "kontekstnoe-okno",
        title: "Контекстное окно",
        type: "Термин",
        preview:
          "Сколько текста модель «держит в голове» за один запрос. Чем больше окно, тем легче забыть, зачем вы его открыли.",
      },
      {
        slug: "rag",
        title: "RAG",
        type: "Термин",
        preview:
          "Подтягивание ваших документов к ответу модели. Не магия памяти — поиск плюс генерация.",
      },
      {
        slug: "agent",
        title: "Агент",
        type: "Термин",
        preview:
          "Система, которая не только отвечает, но и действует: вызывает инструменты, идёт по шагам, ошибается на ходу.",
      },
    ],
  },
  {
    id: "presentations",
    path: "/presentations",
    title: "Презентации",
    eyebrow: "(Презентации)",
    intro: "Слайды для выступлений и внутренних сессий — сжатая мысль, а не стена текста.",
    items: [
      {
        slug: "ii-dlya-redakcii",
        title: "ИИ для редакции: карта решений",
        type: "Презентация",
        preview:
          "Где подключать модель в пайплайне материалов, а где оставлять человека единственным ответственным.",
      },
      {
        slug: "kak-ne-ubit-golos",
        title: "Как не убить голос бренда",
        type: "Презентация",
        preview:
          "Стиль, запреты, примеры. Короткая сессия для команд, которые уже пишут с ИИ каждый день.",
      },
    ],
  },
];

export function getPublicSection(id: string): PublicSection | undefined {
  return PUBLIC_SECTIONS.find((section) => section.id === id);
}
