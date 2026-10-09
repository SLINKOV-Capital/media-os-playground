"use client";

import { updateDocumentMedia } from "@/app/documents/actions";
import { formatActionError } from "@/lib/actionResult";
import type { Document } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { MATERIAL_IMAGES_BUCKET, materialImageStoragePath } from "@/lib/storagePaths";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DocumentMediaBlock({ document }: { document: Document }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [posterUrl, setPosterUrl] = useState(document.trailer_poster_url ?? "");
  const [audioUrl, setAudioUrl] = useState(document.original_music_url ?? "");
  const [uploading, setUploading] = useState(false);
  const fields = [
    ["trailer_youtube_url", "YouTube URL трейлера"],
    ["author_audio_url", "URL авторского чтения (MP3 или прямое аудио)"],
    ["yandex_music_url", "Ссылка на Яндекс Музыку"],
    ["spotify_url", "Ссылка на Spotify"],
  ] as const;

  async function uploadAsset(file: File, kind: "poster" | "music") {
    setError("");
    if (kind === "music" && (file.type !== "audio/mpeg" || file.size > 100 * 1024 * 1024)) {
      setError("Для собственной музыки выберите MP3 до 100 МБ");
      return;
    }
    if (kind === "poster" && (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024)) {
      setError("Постер должен быть изображением до 20 МБ");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Войдите в аккаунт, чтобы загружать файлы");
      const extension = kind === "music" ? "mp3" : ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" } as Record<string, string>)[file.type];
      if (!extension) throw new Error("Формат изображения не поддерживается");
      const path = kind === "music" ? `${user.id}/${document.id}/original.mp3` : materialImageStoragePath(user.id, document.id, extension as "avif" | "gif" | "jpg" | "png" | "webp");
      const bucket = kind === "music" ? "document-audio" : MATERIAL_IMAGES_BUCKET;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (kind === "music") setAudioUrl(`${data.publicUrl}?t=${Date.now()}`);
      else {
        setPosterUrl(`${data.publicUrl}?t=${Date.now()}`);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось загрузить файл");
    } finally { setUploading(false); }
  }

  function save(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await updateDocumentMedia(formData);
      if (!result.ok) setError(formatActionError(result));
      else router.refresh();
    });
  }

  return (
    <section className="doc-section doc-media-section">
      <div className="section-header"><h2 className="section-label">Медиа</h2></div>
      <form action={save} className="doc-media-form">
        <input type="hidden" name="id" value={document.id} />
        <label className="doc-media-field"><span>Постер трейлера (отдельное изображение)</span><input className="doc-site-preview-input" type="url" name="trailer_poster_url" value={posterUrl} onChange={(event) => setPosterUrl(event.target.value)} placeholder="https://…" /><input type="file" accept="image/avif,image/gif,image/jpeg,image/png,image/webp" disabled={uploading || pending} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadAsset(file, "poster"); }} /><small>Загрузить или заменить изображение (до 20 МБ)</small></label>
        {fields.map(([name, label]) => (
          <label className="doc-media-field" key={name}>
            <span>{label}</span>
            <input className="doc-site-preview-input" type="url" name={name} defaultValue={document[name] ?? ""} placeholder="https://…" />
          </label>
        ))}
        <label className="doc-media-field"><span>URL собственной музыки (аудиофайл)</span><input className="doc-site-preview-input" type="url" name="original_music_url" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://…" /><input type="file" accept="audio/mpeg,.mp3" disabled={uploading || pending} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadAsset(file, "music"); }} /><small>Загрузить или заменить MP3 (до 100 МБ)</small></label>
        <label className="doc-media-field">
          <span>Связь с книгой «Поговорим без слайдов»</span>
          <select className="form-field-control" name="book_relationship" defaultValue={document.book_relationship ?? "standalone"}>
            <option value="standalone">Самостоятельное произведение</option>
            <option value="included">Входит в книгу</option>
            <option value="excerpt">Опубликованный фрагмент из книги</option>
          </select>
        </label>
        <label className="doc-media-field">
          <span>Отрывок для листалки книги (заполняется автором)</span>
          <textarea className="doc-site-preview-input" name="book_preview_text" maxLength={3000} rows={6} defaultValue={document.book_preview_text ?? ""} />
        </label>
        <div className="doc-media-grid">
          <label className="doc-media-field"><span>Порядок показа отрывка</span><input className="doc-site-preview-input" type="number" min="0" name="book_preview_order" defaultValue={document.book_preview_order ?? ""} /></label>
          <label className="doc-media-field"><span>Текст для карточки соцсетей (до 400 знаков)</span><textarea className="doc-site-preview-input" name="book_card_text" maxLength={400} rows={3} defaultValue={document.book_card_text ?? ""} /></label>
        </div>
        <button className="action-btn" type="submit" disabled={pending || uploading}>{uploading ? "Загружаю файл…" : pending ? "Сохраняю…" : "Сохранить медиа"}</button>
        {error ? <p className="doc-site-error" role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
