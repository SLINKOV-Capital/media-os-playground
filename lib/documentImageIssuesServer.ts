import { issuesForMarkdown, type DocumentImageIssueInput } from "@/lib/documentMarkdownImages";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function replaceDocumentImageIssues(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  issues: DocumentImageIssueInput[]
) {
  const { error: deleteError } = await supabase
    .from("document_image_issues")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (issues.length === 0) return;
  const { error: insertError } = await supabase.from("document_image_issues").insert(
    issues.map((issue) => ({
      user_id: userId,
      document_id: documentId,
      image_number: issue.imageNumber,
      alt: issue.alt,
      title: issue.title,
      original_src: issue.src,
      reason: issue.reason,
    }))
  );
  if (insertError) throw insertError;
}

export async function syncDocumentImageIssues(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  markdown: string
) {
  await replaceDocumentImageIssues(
    supabase,
    userId,
    documentId,
    issuesForMarkdown(markdown)
  );
}
