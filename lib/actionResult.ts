export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "duplicate_title"
        | "duplicate_slug"
        | "duplicate_type"
        | "empty"
        | "empty_content"
        | "missing_cover"
        | "unresolved_images"
        | "last_document"
        | "invalid_type"
        | "invalid_slug"
        | "not_found"
        | "published_locked"
        | "type_in_use"
        | "invalid_url"
        | "invalid_relationship"
        | "invalid_order"
        | "card_text_too_long"
        | "excerpt_too_long";
      count?: number;
    };

export const ACTION_ERROR_MESSAGES: Record<
  NonNullable<Extract<ActionResult, { ok: false }>["error"]>,
  string
> = {
  duplicate_title: "Такое название уже существует",
  duplicate_slug: "Такой адрес страницы уже занят",
  duplicate_type: "Такой тип документа уже существует",
  empty: "Название не может быть пустым",
  empty_content: "Добавьте текст перед публикацией",
  missing_cover: "Добавьте обложку перед публикацией",
  unresolved_images: "Исправьте проблемные изображения перед публикацией",
  last_document: "Нельзя оставить материал без документов",
  invalid_type: "Выберите тип из существующих шаблонов",
  invalid_slug: "Используйте латинские буквы, цифры и дефисы",
  not_found: "Не найдено",
  published_locked:
    "Нельзя изменить: документ уже публиковался на сайте",
  type_in_use:
    "Нельзя удалить тип: он используется в документах. Сначала измените тип этих документов.",
  invalid_url: "Проверьте URL: укажите полный адрес страницы или файла",
  invalid_relationship: "Выберите доступный тип связи с книгой",
  invalid_order: "Порядок показа должен быть целым числом от нуля",
  card_text_too_long: "Текст карточки не должен превышать 400 знаков",
  excerpt_too_long: "Отрывок для витрины книги не должен превышать 3000 знаков",
};

export function formatActionError(
  result: Extract<ActionResult, { ok: false }>
): string {
  if (result.error === "type_in_use" && result.count != null) {
    return `Нельзя удалить тип: он используется в ${result.count} документах. Сначала измените тип этих документов.`;
  }

  return ACTION_ERROR_MESSAGES[result.error];
}
