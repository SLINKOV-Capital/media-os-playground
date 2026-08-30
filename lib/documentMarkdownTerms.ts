export type ImportedDocumentTerm = {
  term: string;
  definition: string;
};

export type ParsedDocumentTerms = {
  contentMd: string;
  terms: ImportedDocumentTerm[];
  hasTermsSection: boolean;
};

export type ExistingDocumentTermName = {
  id: string;
  term: string;
};

export type DocumentTermSyncPlan = {
  staleIds: string[];
  entries: Array<ImportedDocumentTerm & { id?: string; sort_order: number }>;
};

type MarkdownLine = {
  content: string;
  start: number;
  end: number;
  inFence: boolean;
};

function markdownLines(markdown: string): MarkdownLine[] {
  const chunks = markdown.match(/.*(?:\r\n|\n|$)/g)?.filter(Boolean) ?? [];
  const lines: MarkdownLine[] = [];
  let offset = 0;
  let fence: { marker: "`" | "~"; length: number } | null = null;

  for (const chunk of chunks) {
    const content = chunk.replace(/\r?\n$/, "");
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(content);
    const wasInFence = fence !== null;

    lines.push({ content, start: offset, end: offset + chunk.length, inFence: wasInFence });

    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      if (!fence) {
        fence = { marker, length: fenceMatch[1].length };
      } else if (marker === fence.marker && fenceMatch[1].length >= fence.length) {
        fence = null;
      }
    }

    offset += chunk.length;
  }

  return lines;
}

function heading(line: MarkdownLine, level: 2 | 3): string | null {
  if (line.inFence) return null;
  const match = new RegExp(`^ {0,3}#{${level}}(?!#)[ \\t]+(.+?)[ \\t]*$`).exec(line.content);
  if (!match) return null;
  return match[1].replace(/[ \t]+#+[ \t]*$/, "").trim();
}

export function parseDocumentMarkdownTerms(markdown: string): ParsedDocumentTerms {
  const lines = markdownLines(markdown);
  const sectionStartIndex = lines.findIndex((line) => {
    const title = heading(line, 2);
    return title !== null && /^Термины(?:\s|$)/iu.test(title);
  });

  if (sectionStartIndex === -1) {
    return { contentMd: markdown, terms: [], hasTermsSection: false };
  }

  let sectionEndIndex = lines.length;
  for (let index = sectionStartIndex + 1; index < lines.length; index += 1) {
    if (heading(lines[index], 2) !== null) {
      sectionEndIndex = index;
      break;
    }
  }

  const termHeadings: { index: number; term: string }[] = [];
  for (let index = sectionStartIndex + 1; index < sectionEndIndex; index += 1) {
    const term = heading(lines[index], 3);
    if (term !== null) termHeadings.push({ index, term });
  }

  const seen = new Set<string>();
  const terms = termHeadings.map((item, index) => {
    const normalized = item.term.toLocaleLowerCase("ru");
    if (seen.has(normalized)) {
      throw new Error(`Термин «${item.term}» повторяется в секции терминов`);
    }
    seen.add(normalized);

    const definitionStart = lines[item.index].end;
    const nextHeading = termHeadings[index + 1];
    const definitionEnd = nextHeading
      ? lines[nextHeading.index].start
      : sectionEndIndex < lines.length
        ? lines[sectionEndIndex].start
        : markdown.length;
    const definition = markdown.slice(definitionStart, definitionEnd).trim();
    if (!definition) {
      throw new Error(`Для термина «${item.term}» не указано определение`);
    }
    return { term: item.term, definition };
  });

  const sectionStart = lines[sectionStartIndex].start;
  const sectionEnd = sectionEndIndex < lines.length
    ? lines[sectionEndIndex].start
    : markdown.length;

  return {
    contentMd: `${markdown.slice(0, sectionStart)}${markdown.slice(sectionEnd)}`,
    terms,
    hasTermsSection: true,
  };
}

export function planDocumentTermSync(
  existingTerms: ExistingDocumentTermName[],
  importedTerms: ImportedDocumentTerm[]
): DocumentTermSyncPlan {
  const normalize = (term: string) => term.trim().toLocaleLowerCase("ru");
  const existingByName = new Map(existingTerms.map((item) => [normalize(item.term), item]));
  const importedNames = new Set(importedTerms.map((item) => normalize(item.term)));

  return {
    staleIds: existingTerms
      .filter((item) => !importedNames.has(normalize(item.term)))
      .map((item) => item.id),
    entries: importedTerms.map((item, sort_order) => ({
      ...item,
      id: existingByName.get(normalize(item.term))?.id,
      sort_order,
    })),
  };
}
