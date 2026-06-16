import { deleteWorkflowTemplate } from "@/app/templates/actions";

type DeleteWorkflowTemplateButtonProps = {
  id: string;
};

export function DeleteWorkflowTemplateButton({
  id,
}: DeleteWorkflowTemplateButtonProps) {
  return (
    <form action={deleteWorkflowTemplate} className="inline-form">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="collection-delete-button">
        Удалить
      </button>
    </form>
  );
}
