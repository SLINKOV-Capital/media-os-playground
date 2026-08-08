"use client";

import { bulkDeleteMaterials } from "@/app/documents/actions";
import { MaterialImagePreview } from "@/components/MaterialImagePreview";
import { getMaterialPreviewSrc } from "@/lib/materialPreview";
import { getMaterialTypeIcon, getMaterialTypeLabel } from "@/lib/materialTypes";
import type { Material } from "@/lib/types";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

export function MaterialsListEditor({ materials }: { materials: Material[] }) {
  const [items, setItems] = useState(materials);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => setItems(materials), [materials]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const partlySelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = partlySelected;
    }
  }, [partlySelected]);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function leaveEditMode() {
    setIsEditing(false);
    setSelectedIds(new Set());
    setMessage(null);
  }

  function confirmDelete() {
    const ids = [...selectedIds];
    setConfirmOpen(false);
    setMessage(null);

    startTransition(async () => {
      const result = await bulkDeleteMaterials(ids);

      if (!result.ok) {
        if (result.deletedIds?.length) {
          setItems((current) =>
            current.filter(
              (material) => !result.deletedIds?.includes(material.id)
            )
          );
          setSelectedIds((current) => {
            const next = new Set(current);
            result.deletedIds?.forEach((id) => next.delete(id));
            return next;
          });
        }
        setMessage(result.error);
        return;
      }

      setItems((current) =>
        current.filter((material) => !result.deletedIds.includes(material.id))
      );
      setSelectedIds(new Set());
      setIsEditing(false);

      if (result.warning) {
        setMessage(result.warning);
      }
    });
  }

  return (
    <>
      <div className="materials-list-actions">
        {isEditing ? (
          <>
            <button type="button" className="text-button" onClick={leaveEditMode}>
              Отмена
            </button>
            <button
              type="button"
              className="material-bulk-delete-button"
              disabled={selectedIds.size === 0 || isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {isPending ? "Удаление…" : `Удалить ${selectedIds.size || ""}`.trim()}
            </button>
          </>
        ) : items.length > 0 ? (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMessage(null);
              setIsEditing(true);
            }}
          >
            Редактировать
          </button>
        ) : null}
      </div>

      {message && <p className="materials-bulk-message" role="alert">{message}</p>}

      {items.length === 0 ? (
        <div className="empty-state"><p>Пока нет материалов</p></div>
      ) : (
      <div className={`collection-list${isEditing ? " is-editing" : ""}`}>
        <div
          className={`collection-header collection-header-materials${
            isEditing ? " is-editing" : ""
          }`}
        >
          {isEditing && (
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              aria-label="Выбрать все видимые материалы"
              onChange={() =>
                setSelectedIds(
                  allSelected ? new Set() : new Set(items.map((item) => item.id))
                )
              }
            />
          )}
          <span aria-hidden="true" />
          <span>Название</span>
          <span>Тип</span>
        </div>

        {items.map((material) => {
          const previewSrc = getMaterialPreviewSrc(material);
          const rowClass = `collection-row collection-row-materials${
            previewSrc ? " has-image-preview" : ""
          }${isEditing ? " is-editing" : ""}`;
          const content = (
            <>
              {isEditing && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(material.id)}
                  aria-label={`Выбрать ${material.title}`}
                  onChange={() => toggle(material.id)}
                  onClick={(event) => event.stopPropagation()}
                />
              )}
              <span className="collection-material-leading">
                {previewSrc ? (
                  <MaterialImagePreview
                    src={previewSrc}
                    alt={material.title}
                    variant="list"
                    fallback={
                      <span className="material-type-icon" aria-hidden="true">
                        {getMaterialTypeIcon(material.material_type)}
                      </span>
                    }
                  />
                ) : (
                  <span className="material-type-icon" aria-hidden="true">
                    {getMaterialTypeIcon(material.material_type)}
                  </span>
                )}
              </span>
              <span className="collection-primary collection-primary-material">
                {material.title}
              </span>
              <span className="collection-material-type">
                <span
                  aria-label={getMaterialTypeLabel(material.material_type)}
                  title={getMaterialTypeLabel(material.material_type)}
                >
                  {getMaterialTypeIcon(material.material_type)}
                </span>
              </span>
            </>
          );

          return isEditing ? (
            <div
              key={material.id}
              className={rowClass}
              role="button"
              tabIndex={0}
              onClick={() => toggle(material.id)}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  toggle(material.id);
                }
              }}
            >
              {content}
            </div>
          ) : (
            <Link key={material.id} href={`/materials/${material.id}`} className={rowClass}>
              {content}
            </Link>
          );
        })}
      </div>
      )}

      {confirmOpen && (
        <div className="confirm-dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true">
            <p>Удалить выбранные материалы — {selectedIds.size} шт.?</p>
            <div className="confirm-dialog-actions">
              <button type="button" className="text-button" onClick={() => setConfirmOpen(false)}>
                Отмена
              </button>
              <button type="button" className="material-bulk-delete-button" onClick={confirmDelete}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
