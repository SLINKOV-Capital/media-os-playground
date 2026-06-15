import { createMaterial } from "@/app/documents/actions";
import type { Material } from "@/lib/types";

type DocumentMaterialsBlockProps = {
  documentId: string;
  materials: Material[];
};

export function DocumentMaterialsBlock({
  documentId,
  materials,
}: DocumentMaterialsBlockProps) {
  return (
    <section className="doc-section">
      <div className="section-header">
        <h2 className="section-label">Материалы</h2>
      </div>

      {materials.length > 0 && (
        <ul className="material-cards">
          {materials.map((material) => (
            <li key={material.id} className="material-card">
              <p className="material-card-title">{material.title}</p>
              <p className="material-card-meta">{material.material_type}</p>
              {material.file_url_or_path && (
                <p className="material-card-meta">{material.file_url_or_path}</p>
              )}
              {material.notes && (
                <p className="material-card-notes">{material.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={createMaterial} className="material-form">
        <input type="hidden" name="document_id" value={documentId} />
        <p className="material-form-heading">Добавить материал</p>

        <label className="notion-property">
          <span className="notion-property-label">Название</span>
          <span className="notion-property-value">
            <input name="title" type="text" required placeholder="Текст, файл, ссылка…" />
          </span>
        </label>

        <label className="notion-property">
          <span className="notion-property-label">Тип</span>
          <span className="notion-property-value">
            <input name="material_type" type="text" required placeholder="article, pdf…" />
          </span>
        </label>

        <label className="notion-property">
          <span className="notion-property-label">URL / путь</span>
          <span className="notion-property-value">
            <input name="file_url_or_path" type="text" placeholder="Необязательно" />
          </span>
        </label>

        <label className="notion-property notion-property-textarea">
          <span className="notion-property-label">Заметки</span>
          <span className="notion-property-value">
            <textarea name="notes" rows={2} placeholder="Необязательно" />
          </span>
        </label>

        <button type="submit" className="ghost-button material-form-submit">
          Добавить материал
        </button>
      </form>
    </section>
  );
}
