"use client";

import {
  addDocumentTerm,
  removeDocumentTerm,
  reorderDocumentTerms,
  updateDocumentTerm,
} from "@/app/documents/publication-metadata-actions";
import type { DocumentTerm } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Candidate = { id: string; title: string };

export function DocumentTermsBlock({ documentId, terms: initialTerms, candidates, contentMd }: {
  documentId: string;
  terms: DocumentTerm[];
  candidates: Candidate[];
  contentMd: string;
}) {
  const router = useRouter();
  const [terms, setTerms] = useState(initialTerms);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const knownTerms = new Set(
    terms.map((item) => item.term.toLocaleLowerCase("ru"))
  );
  const directivePattern = /:term\[[^\]]*\]\{name="([^"]+)"\}/g;
  const unknownDirectiveTerms = [...contentMd.matchAll(directivePattern)]
    .map((match) => match[1].trim())
    .filter(
      (termName, index, all) =>
        !knownTerms.has(termName.toLocaleLowerCase("ru")) &&
        all.indexOf(termName) === index
    );

  useEffect(() => setTerms(initialTerms), [initialTerms]);

  function finish(result: { ok: boolean; error?: string }, form?: HTMLFormElement) {
    if (!result.ok) {
      setMessage(result.error ?? "Не удалось выполнить действие");
      return;
    }
    setMessage(null);
    form?.reset();
    router.refresh();
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= terms.length) return;
    const next = [...terms];
    [next[index], next[target]] = [next[target], next[index]];
    setTerms(next.map((item, sort_order) => ({ ...item, sort_order })));
    startTransition(async () => finish(await reorderDocumentTerms(documentId, next.map(({ id }) => id))));
  }

  return (
    <section className="doc-section publication-metadata-section">
      <div className="section-header"><h2 className="section-label">Термины</h2></div>
      {unknownDirectiveTerms.length > 0 ? (
        <p className="document-term-directive-warning" role="status">
          В тексте есть разметка для отсутствующих терминов: {unknownDirectiveTerms.join(", ")}.
        </p>
      ) : null}
      {terms.length === 0 ? <p className="empty-text">Термины не добавлены.</p> : (
        <ol className="document-terms-list">
          {terms.map((item, index) => (
            <li key={item.id} className="document-term-card">
              <form onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                data.set("document_id", documentId);
                data.set("id", item.id);
                startTransition(async () => finish(await updateDocumentTerm(data)));
              }}>
                <label><span>Термин</span><input name="term" defaultValue={item.term} required /></label>
                <label><span>Краткое определение</span><textarea name="definition" defaultValue={item.definition} rows={3} required /></label>
                <label><span>Объясняется в</span><select name="explained_in_document_id" defaultValue={item.explained_in_document_id ?? ""}>
                  <option value="">Не выбрано</option>
                  {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
                </select></label>
                <div className="document-term-actions">
                  <span>Порядок: {index + 1}</span>
                  <button type="button" className="ghost-button" disabled={isPending || index === 0} onClick={() => move(index, -1)} aria-label="Поднять термин">↑</button>
                  <button type="button" className="ghost-button" disabled={isPending || index === terms.length - 1} onClick={() => move(index, 1)} aria-label="Опустить термин">↓</button>
                  <button type="submit" className="ghost-button" disabled={isPending}>Сохранить</button>
                  <button type="button" className="destructive-link" disabled={isPending} onClick={() => startTransition(async () => finish(await removeDocumentTerm(documentId, item.id)))}>Удалить</button>
                </div>
              </form>
            </li>
          ))}
        </ol>
      )}

      <form className="document-term-add" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        data.set("document_id", documentId);
        startTransition(async () => finish(await addDocumentTerm(data), form));
      }}>
        <h3>🏷️ Добавить термин</h3>
        <label><span>Термин</span><input name="term" required /></label>
        <label><span>Краткое определение</span><textarea name="definition" rows={3} required /></label>
        <label><span>Объясняется в</span><select name="explained_in_document_id" defaultValue="">
          <option value="">Не выбрано</option>
          {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
        </select></label>
        <button type="submit" className="ghost-button" disabled={isPending}>Добавить термин</button>
      </form>
      {message ? <p className="materials-bulk-message" role="alert">{message}</p> : null}
    </section>
  );
}
