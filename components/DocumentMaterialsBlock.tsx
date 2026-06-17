import { createMaterial } from "@/app/documents/actions";
import type { Material } from "@/lib/types";
import Link from "next/link";

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
              <Link
                href={`/materials/${material.id}`}
                className="material-card-title"
              >
                {material.title}
              </Link>
              <p className="material-card-type">{material.material_type}</p>
              {material.file_url_or_path && (
                <p className="material-card-meta material-card-meta-muted">
                  {material.file_url_or_path}
                </p>
              )}
              {material.notes && (
                <p className="material-card-notes">{material.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="material-form-panel">
        <h3 className="material-form-title">Добавить материал</h3>

        <form action={createMaterial} className="material-form">
          <input type="hidden" name="document_id" value={documentId} />

          <div className="form-field">
            <label htmlFor={`material-title-${documentId}`} className="form-field-label">
              Название
            </label>
            <input
              id={`material-title-${documentId}`}
              name="title"
              type="text"
              required
              placeholder="Текст, файл, ссылка…"
              className="form-field-control"
            />
          </div>

          <div className="form-field">
            <label htmlFor={`material-type-${documentId}`} className="form-field-label">
              Тип
            </label>
            <p className="form-field-hint">article, pdf, video…</p>
            <input
              id={`material-type-${documentId}`}
              name="material_type"
              type="text"
              required
              placeholder="article"
              className="form-field-control"
            />
          </div>

          <div className="form-field form-field-optional">
            <label
              htmlFor={`material-url-${documentId}`}
              className="form-field-label"
            >
              URL / путь
              <span className="form-field-optional">необязательно</span>
            </label>
            <input
              id={`material-url-${documentId}`}
              name="file_url_or_path"
              type="text"
              placeholder="https://…"
              className="form-field-control"
            />
          </div>

          <div className="form-field form-field-optional">
            <label
              htmlFor={`material-notes-${documentId}`}
              className="form-field-label"
            >
              Заметки
              <span className="form-field-optional">необязательно</span>
            </label>
            <textarea
              id={`material-notes-${documentId}`}
              name="notes"
              rows={2}
              placeholder="Комментарий к материалу"
              className="form-field-control form-field-control-textarea"
            />
          </div>

          <button type="submit" className="ghost-button material-form-submit">
            Добавить материал
          </button>
        </form>
      </div>
    </section>
  );
}
