"use client";

import {
  completeDocumentMarkdownImport,
  getDocumentImageImportUserId,
  processStagedDocumentImage,
} from "@/app/documents/markdown-image-actions";
import {
  normalizeLocalImagePath,
  parseMarkdownImages,
  replaceMarkdownImages,
  type DocumentImageIssueInput,
  type MarkdownImage,
} from "@/lib/documentMarkdownImages";
import { validateMaterialImage, MATERIAL_IMAGE_ACCEPT } from "@/lib/materialImageUploadClient";
import {
  DOCUMENT_IMAGE_IMPORTS_BUCKET,
  documentImageImportStoragePath,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type Props = {
  documentId: string;
  disabled: boolean;
  onImported: (contentMd: string) => void;
};

type ImportStatus = { total: number; processed: number; failed: number };

function matchImageFile(image: MarkdownImage, files: File[]) {
  const source = normalizeLocalImagePath(image.src);
  const exact = files.filter((file) => {
    const path = normalizeLocalImagePath(file.webkitRelativePath || file.name);
    return path === source || path.endsWith(`/${source}`);
  });
  if (exact.length === 1) return { file: exact[0] };
  if (exact.length > 1) return { reason: "Найдено несколько файлов с таким путём" };

  const basename = source.split("/").pop()?.toLocaleLowerCase("ru");
  const byName = files.filter(
    (file) => file.name.toLocaleLowerCase("ru") === basename
  );
  if (byName.length === 1) return { file: byName[0] };
  return {
    reason: byName.length > 1
      ? "Найдено несколько файлов с таким именем"
      : "Файл не найден среди выбранных изображений",
  };
}

export function DocumentMarkdownImport({ documentId, disabled, onImported }: Props) {
  const [markdownFile, setMarkdownFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function runImport(selectedMarkdown = markdownFile, selectedImages = imageFiles) {
    if (!selectedMarkdown) {
      setMessage("Выберите Markdown-файл");
      return;
    }
    setImporting(true);
    setMessage(null);
    try {
      const markdown = await selectedMarkdown.text();
      const images = parseMarkdownImages(markdown);
      const localImages = images.filter((image) => {
        try {
          const url = new URL(image.src);
          return url.protocol !== "http:" && url.protocol !== "https:";
        } catch {
          return true;
        }
      });
      setStatus({ total: localImages.length, processed: 0, failed: 0 });
      const auth = await getDocumentImageImportUserId();
      if (!auth.ok) throw new Error(auth.error);
      const supabase = createClient();
      const replacements = new Map<number, string | null>();
      const issues: DocumentImageIssueInput[] = [];

      for (const image of localImages) {
        const match = matchImageFile(image, selectedImages);
        let reason = "";
        if (!match.file) {
          reason = match.reason ?? "Файл не найден";
        } else {
          try {
            const extension = validateMaterialImage(match.file);
            const assetId = crypto.randomUUID();
            const stagingPath = documentImageImportStoragePath(
              auth.userId,
              documentId,
              assetId,
              extension
            );
            const { error } = await supabase.storage
              .from(DOCUMENT_IMAGE_IMPORTS_BUCKET)
              .upload(stagingPath, match.file, {
                contentType: match.file.type,
                cacheControl: "3600",
                upsert: false,
              });
            if (error) throw error;
            const result = await processStagedDocumentImage({
              documentId,
              assetId,
              imageNumber: image.imageNumber,
              alt: image.alt,
              title: image.title,
              stagingPath,
            });
            if (!result.ok || !result.imageUrl) {
              throw new Error(result.ok ? "Не получен URL изображения" : result.error);
            }
            replacements.set(
              image.imageNumber,
              image.imageNumber === 1 ? null : result.imageUrl
            );
          } catch (error) {
            reason = error instanceof Error ? error.message : "Не удалось обработать изображение";
          }
        }
        if (reason) {
          issues.push({
            imageNumber: image.imageNumber,
            alt: image.alt,
            title: image.title,
            src: image.src,
            reason,
          });
        }
        setStatus((current) => current ? {
          ...current,
          processed: current.processed + 1,
          failed: current.failed + (reason ? 1 : 0),
        } : current);
      }

      const contentMd = replaceMarkdownImages(markdown, replacements);
      const result = await completeDocumentMarkdownImport({ documentId, contentMd, issues });
      if (!result.ok) throw new Error(result.error);
      onImported(contentMd);
      setMessage(
        issues.length === 0
          ? `Импорт завершён: ${replacements.size} изображений загружено`
          : `Импорт завершён: ${replacements.size} загружено, ${issues.length} требуют исправления`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось импортировать Markdown");
    } finally {
      setImporting(false);
    }
  }

  const controlsDisabled = disabled || importing;
  return (
    <div className="document-markdown-import">
      <h3>Импорт Markdown с изображениями</h3>
      <p className="document-import-help">Выберите одним набором `.md` и все изображения из папки статьи.</p>
      <label className="ghost-button document-import-picker">
        {importing ? "Импортирую…" : "Выбрать и импортировать"}
        <input
          className="visually-hidden"
          type="file"
          accept={`.md,text/markdown,text/plain,${MATERIAL_IMAGE_ACCEPT}`}
          multiple
          disabled={controlsDisabled}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            const markdown = files.find(
              (file) => file.name.toLocaleLowerCase("ru").endsWith(".md")
            ) ?? null;
            setMarkdownFile(markdown);
            setImageFiles(files.filter((file) => file !== markdown));
            if (markdown) void runImport(markdown, files.filter((file) => file !== markdown));
            else setMessage("В выбранном наборе нет .md-файла");
          }}
        />
      </label>
      {status && status.total > 0 ? (
        <p className="document-import-progress">
          Обработано {status.processed} из {status.total}, ошибок: {status.failed}
        </p>
      ) : null}
      {message ? <p className="publication-image-message" role="status">{message}</p> : null}
    </div>
  );
}
