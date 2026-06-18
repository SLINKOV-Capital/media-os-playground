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
  const actionTitlesValue = template?.action_titles.join("\n") ?? "";

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

        <div className="doc-section template-actions-section">
          <div className="section-header">
            <h2 className="section-label">Действия</h2>
          </div>
          <textarea
            id="action_titles"
            name="action_titles"
            rows={8}
            className="template-actions-textarea"
            defaultValue={actionTitlesValue}
            placeholder={"Собрать материалы\nНаписать черновик\nВычитать"}
          />
        </div>

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
