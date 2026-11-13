const COMMAND_PREFIXES = [
  /^(?:создай(?:те)?|создать)(?:\s+(?:проект|задачу|действие|материал))?\s+(?:(?:мне|нам)\s+)?/iu,
  /^(?:добавь(?:те)?|добавить|запиши(?:те)?|записать|внеси(?:те)?|внести)\s+(?:(?:мне|нам)\s+)?/iu,
  /^(?:напомни(?:те)?|напомнить)(?:\s+(?:мне|нам))?\s*(?:(?:про|о|об|обо)\s+)?/iu,
  /^(?:купи(?:те)?|купить)\s+/iu,
];

function capitalizeFirst(value: string) {
  const first = value.match(/^\p{L}/u)?.[0];
  return first ? value.replace(/^\p{L}/u, first.toLocaleUpperCase("ru")) : value;
}

function restoreNominativeForPurchase(value: string) {
  return value.replace(/\p{L}+/gu, (word) => {
    if (/ую$/iu.test(word)) return `${word.slice(0, -2)}ая`;
    if (/юю$/iu.test(word)) return `${word.slice(0, -2)}яя`;
    if (/у$/iu.test(word)) return `${word.slice(0, -1)}а`;
    if (/ю$/iu.test(word)) return `${word.slice(0, -1)}я`;
    return word;
  });
}

/** Removes only explicit assistant-command wrappers; task verbs stay intact. */
export function normalizeMcpTitle(input: string) {
  let value = input.trim().replace(/^[\s"'«„(\[]+/u, "").replace(/[\s"'»“)}\].,!?;:]+$/u, "").trim();
  let purchaseCommand = false;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of COMMAND_PREFIXES) {
      const match = value.match(prefix);
      if (!match) continue;
      purchaseCommand ||= /^(?:купи|купить)/iu.test(match[0]);
      value = value.slice(match[0].length).trim();
      changed = true;
      break;
    }
  }
  value = value.replace(/^[,.:;—–-]+\s*|\s*[,.:;—–-]+$/gu, "").trim();
  if (purchaseCommand) value = restoreNominativeForPurchase(value);
  return capitalizeFirst(value);
}

export function projectMaterialTitle(content: string) {
  const withoutIdeaPrefix = content.trim().replace(/^идея(?:\s+для\s+[^:—–-]+)?\s*[:—–-]\s*/iu, "");
  return normalizeMcpTitle(withoutIdeaPrefix);
}
