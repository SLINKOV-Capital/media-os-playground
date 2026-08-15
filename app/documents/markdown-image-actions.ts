"use server";

import { downloadPublicationImage } from "@/lib/documentPublicationImage";
import {
  parseMarkdownImages,
  replaceMarkdownImage,
  type DocumentImageIssueInput,
} from "@/lib/documentMarkdownImages";
import { replaceDocumentImageIssues, syncDocumentImageIssues } from "@/lib/documentImageIssuesServer";
import {
  DOCUMENT_IMAGE_IMPORTS_BUCKET,
  DOCUMENT_IMAGES_BUCKET,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/server";
import { publicCandidateDocumentPaths } from "@/lib/site";
import { revalidatePath } from "next/cache";
import { uploadPreparedImage } from "@/app/documents/publication-image-actions";

type Result = { ok: true; imageUrl?: string; contentMd?: string } | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getContext(documentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: document } = await supabase
    .from("documents")
    .select("id, content_md, site_slug")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  return document ? { supabase, user, document } : null;
}

function refresh(documentId: string, siteSlug: string | null) {
  revalidatePath(`/documents/${documentId}`);
  if (siteSlug) {
    for (const path of publicCandidateDocumentPaths(siteSlug)) revalidatePath(path);
  }
}

async function savePublicationImage({
  context,
  assetId,
  imageNumber,
  alt,
  title,
  input,
  sourceMaterialId = null,
}: {
  context: NonNullable<Awaited<ReturnType<typeof getContext>>>;
  assetId: string;
  imageNumber: number;
  alt: string;
  title: string | null;
  input: Buffer | ArrayBuffer;
  sourceMaterialId?: string | null;
}) {
  const prepared = await uploadPreparedImage({
    documentId: context.document.id,
    userId: context.user.id,
    assetId,
    input,
  });
  const role = imageNumber === 1 ? "cover" : "illustration";
  let previousPath: string | null = null;
  let error;

  if (role === "cover") {
    const { data: existing } = await context.supabase
      .from("document_publication_images")
      .select("id, storage_path")
      .eq("document_id", context.document.id)
      .eq("user_id", context.user.id)
      .eq("role", "cover")
      .maybeSingle();
    previousPath = existing?.storage_path ?? null;
    const values = {
      source_material_id: sourceMaterialId,
      alt,
      title,
      storage_path: prepared.storagePath,
      image_url: prepared.imageUrl,
      width: prepared.width,
      height: prepared.height,
      status: "ready",
      error: null,
      sort_order: 0,
    };
    ({ error } = existing
      ? await context.supabase.from("document_publication_images").update(values).eq("id", existing.id).eq("user_id", context.user.id)
      : await context.supabase.from("document_publication_images").insert({
          id: assetId,
          user_id: context.user.id,
          document_id: context.document.id,
          role,
          ...values,
        }));
  } else {
    ({ error } = await context.supabase.from("document_publication_images").insert({
      id: assetId,
      user_id: context.user.id,
      document_id: context.document.id,
      source_material_id: sourceMaterialId,
      role,
      title,
      alt,
      sort_order: imageNumber - 2,
      storage_path: prepared.storagePath,
      image_url: prepared.imageUrl,
      width: prepared.width,
      height: prepared.height,
      status: "ready",
      error: null,
    }));
  }

  if (error) {
    await context.supabase.storage.from(DOCUMENT_IMAGES_BUCKET).remove([prepared.storagePath]);
    throw error;
  }
  if (previousPath && previousPath !== prepared.storagePath) {
    await context.supabase.storage.from(DOCUMENT_IMAGES_BUCKET).remove([previousPath]);
  }
  return prepared.imageUrl;
}

export async function getDocumentImageImportUserId(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { ok: true, userId: user.id } : { ok: false, error: "Требуется авторизация" };
}

export async function processStagedDocumentImage(input: {
  documentId: string;
  assetId: string;
  imageNumber: number;
  alt: string;
  title: string | null;
  stagingPath: string;
}): Promise<Result> {
  const context = await getContext(input.documentId);
  if (!context || !UUID_PATTERN.test(input.assetId) || input.imageNumber < 1) {
    return { ok: false, error: "Некорректные данные изображения" };
  }
  const expectedPrefix = `${context.user.id}/${input.documentId}/${input.assetId}/`;
  if (!input.stagingPath.startsWith(expectedPrefix)) {
    return { ok: false, error: "Некорректный путь изображения" };
  }

  try {
    const { data, error } = await context.supabase.storage
      .from(DOCUMENT_IMAGE_IMPORTS_BUCKET)
      .download(input.stagingPath);
    if (error || !data) throw error ?? new Error("staging_download_failed");
    const imageUrl = await savePublicationImage({
      context,
      assetId: input.assetId,
      imageNumber: input.imageNumber,
      alt: input.alt,
      title: input.title,
      input: await data.arrayBuffer(),
    });
    return { ok: true, imageUrl };
  } catch (error) {
    console.error("Failed to process staged Document image:", error);
    return { ok: false, error: "Не удалось обработать изображение" };
  } finally {
    await context.supabase.storage.from(DOCUMENT_IMAGE_IMPORTS_BUCKET).remove([input.stagingPath]);
  }
}

export async function completeDocumentMarkdownImport(input: {
  documentId: string;
  contentMd: string;
  issues: DocumentImageIssueInput[];
}): Promise<Result> {
  const context = await getContext(input.documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  const parsed = parseMarkdownImages(input.contentMd);
  const validNumbers = new Set(parsed.map((image) => image.imageNumber));
  const issues = input.issues.filter((issue) => validNumbers.has(issue.imageNumber));
  try {
    const { error } = await context.supabase
      .from("documents")
      .update({ content_md: input.contentMd })
      .eq("id", input.documentId)
      .eq("user_id", context.user.id);
    if (error) throw error;
    await replaceDocumentImageIssues(context.supabase, context.user.id, input.documentId, issues);

    const referencedUrls = new Set(parseMarkdownImages(input.contentMd).map((image) => image.src));
    const { data: staleAssets } = await context.supabase
      .from("document_publication_images")
      .select("id, role, storage_path, image_url")
      .eq("document_id", input.documentId)
      .eq("user_id", context.user.id);
    const stale = (staleAssets ?? []).filter(
      (asset) => asset.role !== "cover" && !referencedUrls.has(asset.image_url)
    );
    if (stale.length > 0) {
      const { error: staleDeleteError } = await context.supabase
        .from("document_publication_images")
        .delete()
        .in("id", stale.map((asset) => asset.id))
        .eq("user_id", context.user.id);
      if (staleDeleteError) throw staleDeleteError;
      await context.supabase.storage
        .from(DOCUMENT_IMAGES_BUCKET)
        .remove(stale.map((asset) => asset.storage_path));
    }
    refresh(input.documentId, context.document.site_slug);
    return { ok: true, contentMd: input.contentMd };
  } catch (error) {
    console.error("Failed to finish Markdown import:", error);
    return { ok: false, error: "Не удалось сохранить импортированный Markdown" };
  }
}

async function replaceIssueSource(
  context: NonNullable<Awaited<ReturnType<typeof getContext>>>,
  imageNumber: number,
  expectedSrc: string,
  imageUrl: string
): Promise<Result> {
  const markdown = context.document.content_md ?? "";
  const image = parseMarkdownImages(markdown).find((item) => item.imageNumber === imageNumber);
  if (!image || image.src !== expectedSrc) {
    return { ok: false, error: "Позиция изображения изменилась. Сохраните текст ещё раз" };
  }
  const contentMd = imageNumber === 1
    ? `${markdown.slice(0, image.start)}${markdown.slice(image.end)}`
    : replaceMarkdownImage(markdown, image, imageUrl);
  const { error } = await context.supabase
    .from("documents")
    .update({ content_md: contentMd })
    .eq("id", context.document.id)
    .eq("user_id", context.user.id);
  if (error) return { ok: false, error: "Не удалось обновить Markdown" };
  await syncDocumentImageIssues(context.supabase, context.user.id, context.document.id, contentMd);
  refresh(context.document.id, context.document.site_slug);
  return { ok: true, contentMd };
}

export async function resolveDocumentImageIssueFromUpload(input: {
  documentId: string;
  assetId: string;
  imageNumber: number;
  expectedSrc: string;
  alt: string;
  title: string | null;
  stagingPath: string;
}): Promise<Result> {
  const processed = await processStagedDocumentImage(input);
  if (!processed.ok || !processed.imageUrl) return processed;
  const context = await getContext(input.documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  return replaceIssueSource(context, input.imageNumber, input.expectedSrc, processed.imageUrl);
}

export async function resolveDocumentImageIssueFromMaterial(input: {
  documentId: string;
  materialId: string;
  imageNumber: number;
  expectedSrc: string;
  alt: string;
  title: string | null;
}): Promise<Result> {
  const context = await getContext(input.documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  const { data: link } = await context.supabase
    .from("document_materials")
    .select("materials(id, material_type, file_url_or_path)")
    .eq("document_id", input.documentId)
    .eq("material_id", input.materialId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  const embedded = link?.materials;
  const material = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!material || material.material_type !== "image" || !material.file_url_or_path) {
    return { ok: false, error: "Выберите связанный Material типа image" };
  }
  try {
    const imageUrl = await savePublicationImage({
      context,
      assetId: crypto.randomUUID(),
      imageNumber: input.imageNumber,
      alt: input.alt,
      title: input.title,
      input: await downloadPublicationImage(material.file_url_or_path),
      sourceMaterialId: input.materialId,
    });
    return replaceIssueSource(context, input.imageNumber, input.expectedSrc, imageUrl);
  } catch (error) {
    console.error("Failed to resolve image from Material:", error);
    return { ok: false, error: "Не удалось обработать изображение Material" };
  }
}
