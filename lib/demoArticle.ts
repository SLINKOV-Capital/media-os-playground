export type DemoTerm = {
  id: string;
  lemma: string;
  gloss: string;
  explainedIn?: {
    title: string;
    href: string;
  };
};

export const DEMO_ARTICLE = {
  slug: "demo-article",
  title: "Разжёванное сложное: зачем объяснять ИИ человеческим языком",
  preview:
    "Если сложное не разжевать, оно остаётся чужим. Как строить тексты, которые оставляют читателю ясность, а не впечатление.",
  cover: "/brand/chitatel.webp",
  videoYoutubeId: "demo",
  audioLabel: "Прослушать статью",
  presentationLabel: "Презентация",
  content_md: `Сложное пугает не само по себе — пугает ощущение, что тебя оставили за дверью. Хороший текст про ИИ не упрощает до карикатуры. Он проводит читателя так, чтобы на выходе осталось понимание, а не только «вау».

## Что обычно ломается

Авторы либо тонут в терминах, либо сглаживают всё до пустых метафор. Оба пути оставляют читателя без инструмента: он либо не понял, либо понял «как будто», но применить не может. Здесь как раз помогает ясный **промпт** и честный **фактчек**.

## Как разжевать без потери смысла

:::numbered-list
1. Сначала назвать задачу человека, а не модель.
2. Показать один конкретный шаг, который можно повторить.
3. Только потом — ограничения и нюансы.
4. В конце — критерий «получилось / не получилось».
:::

Так текст становится картой, а не витриной. Корпоративный **сторителлинг** работает так же: сначала конфликт и герой, потом слайды.

## Что держать под рукой

- Один живой пример из практики, не абстрактный «кейс отрасли».
- Честный список того, чего модель не умеет.
- Короткий вывод в одно предложение — без пафоса.

ИИ меняет работу быстрее, чем меняется язык, которым мы о нём говорим. Задача автора — сократить этот разрыв, а не увеличить его красивыми словами. Отдельный **вайбкодинг** тут ни при чём — речь о ясности для читателя.
`,
  content_md_en: `Complexity does not scare people by itself — the feeling of being left outside the door does. A good text about AI does not flatten ideas into a cartoon. It walks the reader to understanding, not only to a “wow”.

## What usually breaks

Writers either drown in jargon or smooth everything into empty metaphors. Both leave the reader without a tool. A clear **prompt** and honest **fact-checking** help here.

## How to explain without losing meaning

:::numbered-list
1. Name the human task first, not the model.
2. Show one concrete step the reader can repeat.
3. Only then add limits and nuance.
4. End with a “worked / did not work” criterion.
:::

Then the text becomes a map, not a shop window. Corporate **storytelling** works the same way: conflict and character first, slides later.
`,
  content_md_es: `Lo complejo no asusta por sí mismo: asusta la sensación de quedarte fuera. Un buen texto sobre IA no convierte las ideas en caricatura. Acompaña al lector hasta la comprensión, no solo hasta el “wow”.

## Qué suele romperse

O nos ahogamos en jerga, o suavizamos todo hasta metáforas vacías. En ambos casos el lector se queda sin herramienta. Aquí ayudan un **prompt** claro y un **fact-check** honesto.

## Cómo explicar sin perder sentido

:::numbered-list
1. Nombrar primero la tarea humana, no el modelo.
2. Mostrar un paso concreto que se pueda repetir.
3. Solo después, límites y matices.
4. Cerrar con un criterio de “salió / no salió”.
:::

Así el texto es un mapa, no un escaparate. El **storytelling** corporativo funciona igual: primero conflicto y personaje, después las diapositivas.
`,
} as const;

export const DEMO_TERMS: DemoTerm[] = [
  {
    id: "prompt",
    lemma: "промпт",
    gloss:
      "Запрос к модели: формулировка задачи, контекста и ограничений так, чтобы ответ был полезен и проверяем.",
    explainedIn: {
      title: "Редакция с ИИ: что оставить человеку",
      href: "/p/demo-article",
    },
  },
  {
    id: "factcheck",
    lemma: "фактчек",
    gloss:
      "Проверка утверждений на факты до публикации: цифры, цитаты, ссылки, границы уверенности модели.",
    explainedIn: {
      title: "Редакция с ИИ: что оставить человеку",
      href: "/p/demo-article",
    },
  },
  {
    id: "storytelling",
    lemma: "сторителлинг",
    gloss:
      "Сборка смысла через историю: герой, конфликт, поворот, вывод — вместо перечня преимуществ.",
    explainedIn: {
      title: "Корпоративный сторителлинг без новояза",
      href: "/p/demo-article",
    },
  },
  {
    id: "vibecoding",
    lemma: "вайбкодинг",
    gloss:
      "Сборка продукта в диалоге с ИИ-кодом: быстро, итеративно, с человеком, который держит вкус и ответственность.",
    explainedIn: {
      title: "Одна тема — много форматов",
      href: "/p/demo-article",
    },
  },
];

/** Demo related cards — Medium-style grid until DB related is wired. */
export const DEMO_RELATED_ARTICLES = [
  {
    href: "/p/demo-article",
    title: "Редакция с ИИ: что оставить человеку",
    preview:
      "Черновик, фактчек, тон, публикация — где модель ускоряет, а где решение всё ещё за автором.",
    image: "/brand/maska.webp",
  },
  {
    href: "/p/demo-article",
    title: "Одна тема — много форматов",
    preview:
      "Статья, видео и шортс по одной теме — разные проекты. Как не смешивать каналы и не терять смысл.",
    image: "/brand/orkestr.webp",
  },
  {
    href: "/p/demo-article",
    title: "Разжёванное сложное: зачем объяснять ИИ человеческим языком",
    preview:
      "Если сложное не разжевать, оно остаётся чужим. Как строить тексты, которые оставляют читателю ясность.",
    image: "/brand/chitatel.webp",
  },
  {
    href: "/p/demo-article",
    title: "Корпоративный сторителлинг без новояза",
    preview:
      "Почему одни компании запоминаются, а другие только перечисляют преимущества.",
    image: "/brand/angel.webp",
  },
] as const;

export function extractMarkdownToc(
  markdown: string
): { id: string; text: string; level: 2 | 3 }[] {
  const items: { id: string; text: string; level: 2 | 3 }[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const level = match[1].length as 2 | 3;
    const text = match[2].replace(/\*\*/g, "").trim();
    items.push({ id: slugifyHeading(text), text, level });
  }
  return items;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
