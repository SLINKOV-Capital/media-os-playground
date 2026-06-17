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
    <form action={action} className="notion-form notion-form-page template-page-form">
      {template && <input type="hidden" name="id" value={template.id} />}

      <div className="notion-property">
        <label htmlFor="document_type" className="notion-property-label">
          Тип документа
        </label>
        <div className="notion-property-value">
          <input
            id="document_type"
            name="document_type"
            type="text"
            required
            defaultValue={template?.document_type ?? ""}
            placeholder="статья"
          />
        </div>
      </div>
      <p className="notion-field-caption">Один шаблон на тип документа</p>

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
  );
}
