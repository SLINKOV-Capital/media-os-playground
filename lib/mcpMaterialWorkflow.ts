export type MaterialChange = { title?: string; notes?: string; append_text?: string };

export function buildMaterialPatch(current: { title: string; notes: string | null }, change: MaterialChange) {
  if (change.notes !== undefined && change.append_text !== undefined) {
    throw new Error("Provide either replacement notes or append_text, not both");
  }
  const patch: { title?: string; notes?: string } = {};
  if (change.title !== undefined) {
    const title = change.title.trim();
    if (!title || title.length > 500) throw new Error("Material title must contain 1 to 500 characters");
    patch.title = title;
  }
  if (change.notes !== undefined) patch.notes = change.notes;
  if (change.append_text !== undefined) {
    const addition = change.append_text.trim();
    if (!addition) throw new Error("append_text must not be empty");
    const previous = current.notes?.trim() ?? "";
    patch.notes = previous ? `${previous}\n\n${addition}` : addition;
  }
  if (!Object.keys(patch).length) throw new Error("Provide a title, notes, or append_text change");
  return patch;
}

export function exactMaterialTitleMatches<T extends { id: string; title: string }>(title: string, materials: T[]) {
  const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  return [...new Map(materials.filter((item) => normalize(item.title) === normalize(title)).map((item) => [item.id, item])).values()];
}
