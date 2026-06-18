export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "duplicate_title"
        | "empty"
        | "last_document"
        | "invalid_type"
        | "not_found";
    };

export const ACTION_ERROR_MESSAGES: Record<
  NonNullable<Extract<ActionResult, { ok: false }>["error"]>,
  string
> = {
  duplicate_title: "Такое название уже существует",
  empty: "Название не может быть пустым",
  last_document: "Нельзя оставить материал без документов",
  invalid_type: "Недопустимый тип материала",
  not_found: "Не найдено",
};
