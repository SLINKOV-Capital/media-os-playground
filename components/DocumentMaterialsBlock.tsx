import { MaterialAddPanel } from "@/components/MaterialAddPanel";
import { getMaterialTypeIcon } from "@/lib/materialTypes";
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
  const linkedMaterialIds = materials.map((material) => material.id);

  return (
    <section className="doc-section">
      <div className="section-header">
        <h2 className="section-label">Материалы</h2>
      </div>

      {materials.length > 0 && (
        <ul className="material-rows">
          {materials.map((material) => (
            <li key={material.id} className="material-row">
              <Link
                href={`/materials/${material.id}`}
                className="material-row-title material-row-title-with-icon"
              >
                <span className="material-type-icon" aria-hidden="true">
                  {getMaterialTypeIcon(material.material_type)}
                </span>
                {material.title}
              </Link>
              <div className="material-row-meta">
                <span className="material-row-type">{material.material_type}</span>
                {material.file_url_or_path && (
                  <>
                    <span className="material-row-sep" aria-hidden="true">
                      ·
                    </span>
                    <span className="material-row-url">
                      {material.file_url_or_path}
                    </span>
                  </>
                )}
              </div>
              {material.notes && (
                <p className="material-row-notes">{material.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <MaterialAddPanel
        documentId={documentId}
        linkedMaterialIds={linkedMaterialIds}
      />
    </section>
  );
}
