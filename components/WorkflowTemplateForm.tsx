import {
  createWorkflowTemplate,
  updateWorkflowTemplate,
} from "@/app/templates/actions";
import type { WorkflowTemplateV2 } from "@/lib/types";
import Link from "next/link";

type WorkflowTemplateFormProps = {
  template?: WorkflowTemplateV2;
};

export function WorkflowTemplateForm({ template }: WorkflowTemplateFormProps) {
  const action = template ? updateWorkflowTemplate : createWorkflowTemplate;
  const actionTitlesValue = template?.action_titles.join("\n") ?? "";

  return (
    <form action={action} className="notion-form template-form">
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="field">
        <label htmlFor="document_type">Тип документа</label>
        <input
          id="document_type"
          name="document_type"
          type="text"
          required
          defaultValue={template?.document_type ?? ""}
          placeholder="article"
        />
      </div>
      <div className="field">
        <label htmlFor="action_titles">Действия (по одному на строку)</label>
        <textarea
          id="action_titles"
          name="action_titles"
          rows={8}
          defaultValue={actionTitlesValue}
          placeholder={"Собрать материалы\nНаписать черновик\nВычитать"}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="primary-button">
          {template ? "Сохранить" : "Создать"}
        </button>
        <Link href="/templates" className="text-link">
          Отмена
        </Link>
      </div>
    </form>
  );
}
