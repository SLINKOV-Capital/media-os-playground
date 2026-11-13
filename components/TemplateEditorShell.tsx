"use client";

import {
  createWorkflowTemplate,
  updateTemplateTitle,
  updateWorkflowTemplate,
} from "@/app/templates/actions";
import { PageTitle } from "@/components/PageTitle";
import type { WorkflowTemplateV2 } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

type TemplateEditorShellProps = {
  template?: WorkflowTemplateV2;
};

export function TemplateEditorShell({ template }: TemplateEditorShellProps) {
  const [title, setTitle] = useState(template?.document_type ?? "");
  const action = template ? updateWorkflowTemplate : createWorkflowTemplate;

  async function handleSaveTitle(nextTitle: string) {
    setTitle(nextTitle);

    if (!template) {
      return { ok: true as const };
    }

    const formData = new FormData();
    formData.set("id", template.id);
    formData.set("title", nextTitle);
    return updateTemplateTitle(formData);
  }

  return (
    <div className="doc-page-stack">
      <header className="page-header">
        <PageTitle
          value={template?.document_type ?? ""}
          onSave={handleSaveTitle}
          onDraftChange={setTitle}
          placeholder="Название шаблона"
        />
      </header>

      <form action={action} className="notion-form notion-form-page template-page-form">
        {template && <input type="hidden" name="id" value={template.id} />}
        <input type="hidden" name="document_type" value={title.trim()} />

        <div className="page-form-footer">
          <button type="submit" className="primary-button">
            {template ? "Сохранить" : "Создать"}
          </button>
          <Link href="/templates" className="text-link">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
