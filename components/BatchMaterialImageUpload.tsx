"use client";

import {
  createUploadedImageMaterial,
  getMaterialUploadUserId,
} from "@/app/materials/image-actions";
import {
  MATERIAL_IMAGE_ACCEPT,
  removeUploadedMaterialImageFiles,
  uploadMaterialImageFiles,
  validateMaterialImage,
} from "@/lib/materialImageUploadClient";
import { createClient } from "@/lib/supabase/client";
import type { Document } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

const MAX_FILES = 20;
const CONCURRENCY = 3;

type UploadStatus = "waiting" | "uploading" | "done" | "error";

type UploadItem = {
  id: string;
  file: File;
  title: string;
  status: UploadStatus;
  error?: string;
};

type Props = {
  documents: Pick<Document, "id" | "title">[];
};

const STATUS_LABELS: Record<UploadStatus, string> = {
  waiting: "Ожидает запуска",
  uploading: "Загружается",
  done: "Готово",
  error: "Ошибка",
};

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || "Изображение";
}

function errorMessage(failure: unknown) {
  return failure instanceof Error && failure.message !== "auth_required"
    ? failure.message
    : "Не удалось загрузить изображение";
}

export function BatchMaterialImageUpload({ documents }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentId, setDocumentId] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const doneCount = items.filter((item) => item.status === "done").length;
  const errorCount = items.filter((item) => item.status === "error").length;
  const processedCount = doneCount + errorCount;
  const progress = items.length > 0
    ? Math.round((processedCount / items.length) * 100)
    : 0;
  const hasWaiting = items.some((item) => item.status === "waiting");

  const summary = useMemo(() => {
    if (!finished) return null;
    return `${doneCount} загружено, ${errorCount} с ошибкой`;
  }, [doneCount, errorCount, finished]);

  function addFiles(fileList: FileList | File[]) {
    if (isUploading) return;

    const incoming = Array.from(fileList);
    const available = MAX_FILES - items.length;
    if (available <= 0) {
      setSelectionError("Можно выбрать не более 20 файлов");
      return;
    }

    const accepted = incoming.slice(0, available).map((file): UploadItem => {
      try {
        validateMaterialImage(file);
        return {
          id: crypto.randomUUID(),
          file,
          title: titleFromFileName(file.name),
          status: "waiting",
        };
      } catch (failure) {
        return {
          id: crypto.randomUUID(),
          file,
          title: titleFromFileName(file.name),
          status: "error",
          error: errorMessage(failure),
        };
      }
    });

    setItems((current) => [...current, ...accepted]);
    setFinished(false);
    setSelectionError(
      incoming.length > available ? "Добавлены первые 20 файлов" : null
    );
  }

  function updateItem(id: string, updates: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item) => item.id === id ? { ...item, ...updates } : item)
    );
  }

  async function uploadOne(item: UploadItem, userId: string) {
    updateItem(item.id, { status: "uploading", error: undefined });
    const materialId = crypto.randomUUID();
    const supabase = createClient();
    let uploadedPaths: Awaited<ReturnType<typeof uploadMaterialImageFiles>> | null = null;

    try {
      uploadedPaths = await uploadMaterialImageFiles({
        supabase,
        userId,
        materialId,
        file: item.file,
      });
      const result = await createUploadedImageMaterial({
        materialId,
        documentId,
        title: item.title,
        extension: uploadedPaths.extension,
      });
      if (!result.ok) throw new Error(result.error);
      updateItem(item.id, { status: "done" });
    } catch (failure) {
      if (uploadedPaths) {
        await removeUploadedMaterialImageFiles({ supabase, ...uploadedPaths });
      }
      updateItem(item.id, { status: "error", error: errorMessage(failure) });
    }
  }

  async function startUpload() {
    if (!documentId) {
      setSelectionError("Сначала выберите документ");
      return;
    }

    const pending = items.filter((item) => item.status === "waiting");
    if (pending.length === 0) return;

    setIsUploading(true);
    setFinished(false);
    setSelectionError(null);

    const uploadUser = await getMaterialUploadUserId();

    if (!uploadUser.ok) {
      pending.forEach((item) =>
        updateItem(item.id, { status: "error", error: uploadUser.error })
      );
      setIsUploading(false);
      setFinished(true);
      return;
    }

    const userId = uploadUser.userId;

    let cursor = 0;
    async function worker() {
      while (cursor < pending.length) {
        const item = pending[cursor];
        cursor += 1;
        await uploadOne(item, userId);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => worker())
    );
    setIsUploading(false);
    setFinished(true);
    router.refresh();
  }

  return (
    <div className="batch-upload">
      <div className="notion-property">
        <label htmlFor="batch-document" className="notion-property-label">
          Документ
        </label>
        <div className="notion-property-value">
          <select
            id="batch-document"
            value={documentId}
            disabled={isUploading}
            onChange={(event) => setDocumentId(event.target.value)}
          >
            <option value="" disabled>Выберите документ</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>{document.title}</option>
            ))}
          </select>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={MATERIAL_IMAGE_ACCEPT}
        className="material-preview-file-input"
        disabled={isUploading || items.length >= MAX_FILES}
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div
        className={`batch-upload-dropzone${isDragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <p>Перетащите сюда до 20 изображений</p>
        <button
          type="button"
          className="ghost-button"
          disabled={isUploading || items.length >= MAX_FILES}
          onClick={() => inputRef.current?.click()}
        >
          Выбрать с диска
        </button>
        <span>AVIF, GIF, JPEG, PNG или WebP · до 20 МБ каждый</span>
      </div>

      {selectionError ? <p className="material-preview-error" role="alert">{selectionError}</p> : null}

      {items.length > 0 ? (
        <>
          <div className="batch-upload-actions">
            <button
              type="button"
              className="primary-button"
              disabled={isUploading || !hasWaiting || !documentId}
              onClick={() => void startUpload()}
            >
              {isUploading ? "Загрузка…" : `Загрузить ${items.length}`}
            </button>
            {!isUploading ? (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setItems([]);
                  setFinished(false);
                  setSelectionError(null);
                }}
              >
                Очистить список
              </button>
            ) : null}
          </div>
          {!documentId ? (
            <p className="batch-upload-start-hint" role="status">
              Выберите Document выше, чтобы запустить загрузку.
            </p>
          ) : null}

          <div className="batch-upload-progress" aria-label={`Обработано ${processedCount} из ${items.length}`}>
            <div className="batch-upload-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="batch-upload-progress-label">{processedCount} из {items.length}</p>

          <ul className="batch-upload-files">
            {items.map((item) => (
              <li key={item.id}>
                <span className="batch-upload-file-name">{item.file.name}</span>
                <span className={`batch-upload-status is-${item.status}`}>
                  {STATUS_LABELS[item.status]}
                </span>
                {item.error ? <span className="batch-upload-file-error">{item.error}</span> : null}
              </li>
            ))}
          </ul>

        </>
      ) : null}

      {summary ? <p className="batch-upload-summary" role="status">{summary}</p> : null}
    </div>
  );
}
