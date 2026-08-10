"use client";

import {
  addDocumentRecommendation,
  removeDocumentRecommendation,
  reorderDocumentRecommendations,
} from "@/app/documents/publication-metadata-actions";
import type { DocumentRecommendation } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Candidate = { id: string; title: string };

export function DocumentRecommendationsBlock({
  documentId,
  recommendations: initialRecommendations,
  candidates,
}: {
  documentId: string;
  recommendations: DocumentRecommendation[];
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setRecommendations(initialRecommendations), [initialRecommendations]);

  const selected = new Set(recommendations.map((item) => item.recommended_document_id));
  const available = candidates.filter(
    (item) => item.id !== documentId && !selected.has(item.id)
  );

  function finish(result: { ok: boolean; error?: string }) {
    if (!result.ok) {
      setMessage(result.error ?? "Не удалось выполнить действие");
      return;
    }
    setMessage(null);
    router.refresh();
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= recommendations.length) return;
    const next = [...recommendations];
    [next[index], next[target]] = [next[target], next[index]];
    setRecommendations(next.map((item, sort_order) => ({ ...item, sort_order })));
    startTransition(async () => finish(await reorderDocumentRecommendations(documentId, next.map(({ id }) => id))));
  }

  return (
    <section className="doc-section publication-metadata-section">
      <div className="section-header">
        <h2 className="section-label">Рекомендую</h2>
      </div>

      {recommendations.length === 0 ? (
        <p className="empty-text">Рекомендации не выбраны.</p>
      ) : (
        <ol className="publication-metadata-list">
          {recommendations.map((item, index) => (
            <li key={item.id} className="publication-metadata-row">
              <span className="publication-metadata-title">
                {item.recommended_document?.title ?? "Document удалён"}
              </span>
              <span className="publication-metadata-order">{index + 1}</span>
              <button type="button" className="ghost-button" disabled={isPending || index === 0} onClick={() => move(index, -1)} aria-label="Поднять рекомендацию">↑</button>
              <button type="button" className="ghost-button" disabled={isPending || index === recommendations.length - 1} onClick={() => move(index, 1)} aria-label="Опустить рекомендацию">↓</button>
              <button type="button" className="destructive-link" disabled={isPending} onClick={() => startTransition(async () => finish(await removeDocumentRecommendation(documentId, item.id)))}>Удалить</button>
            </li>
          ))}
        </ol>
      )}

      <div className="publication-image-add-row">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={isPending || available.length === 0} aria-label="Document для рекомендации">
          <option value="">Выбрать Document…</option>
          {available.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
        </select>
        <button type="button" className="ghost-button" disabled={isPending || !selectedId} onClick={() => startTransition(async () => {
          const result = await addDocumentRecommendation(documentId, selectedId);
          if (result.ok) setSelectedId("");
          finish(result);
        })}>Добавить</button>
      </div>
      {message ? <p className="materials-bulk-message" role="alert">{message}</p> : null}
    </section>
  );
}
