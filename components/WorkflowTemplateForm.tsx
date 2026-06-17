import {
  createWorkflowTemplate,
  updateWorkflowTemplate,
} from "@/app/templates/actions";
import { TemplateActionsField } from "@/components/TemplateActionsField";
import type { WorkflowTemplateV2 } from "@/lib/types";
import Link from "next/link";

type WorkflowTemplateFormProps = {
  template?: WorkflowTemplateV2;
  documentTypes: string[];
};

export function WorkflowTemplateForm({
  template,
  documentTypes,
}: WorkflowTemplateFormProps) {
  const action = template ? updateWorkflowTemplate : createWorkflowTemplate;
  const actionTitlesValue = template?.action_titles.join("\n") ?? "";
  const types = [
    ...new Set([
      ...documentTypes,
      ...(template?.document_type ? [template.document_type] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b, "ru"));

  return (
    <form action={action} className="notion-form notion-form-page template-page-form">
      {template && <input type="hidden" name="id" value={template.id} />}

      <div className="notion-property">
        <label htmlFor="document_type" className="notion-property-label">
          Тип документа
          <span className="notion-property-label-hint">один шаблон на тип</span>
        </label>
        <div className="notion-property-value">
          <select
            id="document_type"
            name="document_type"
            required
            defaultValue={template?.document_type ?? ""}
          >
            <option value="" disabled>
              Выберите тип
            </option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <TemplateActionsField defaultValue={actionTitlesValue} />

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
