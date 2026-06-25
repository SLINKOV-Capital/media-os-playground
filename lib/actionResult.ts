export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "duplicate_title"
        | "duplicate_type"
        | "empty"
        | "last_document"
        | "invalid_type"
        | "not_found"
        | "published_locked"
        | "type_in_use";
      count?: number;
    };

export const ACTION_ERROR_MESSAGES: Record<
  NonNullable<Extract<ActionResult, { ok: false }>["error"]>,
  string
> = {
  duplicate_title: "Такое название уже существует",
  duplicate_type: "Такой тип документа уже существует",
  empty: "Название не может быть пустым",
  last_document: "Нельзя оставить материал без документов",
  invalid_type: "Выберите тип из существующих шаблонов",
  not_found: "Не найдено",
  published_locked:
    "Нельзя изменить: документ уже публиковался на сайте",
  type_in_use:
    "Нельзя удалить тип: он используется в документах. Сначала измените тип этих документов.",
};

export function formatActionError(
  result: Extract<ActionResult, { ok: false }>
): string {
  if (result.error === "type_in_use" && result.count != null) {
    return `Нельзя удалить тип: он используется в ${result.count} документах. Сначала измените тип этих документов.`;
  }

  return ACTION_ERROR_MESSAGES[result.error];
}
