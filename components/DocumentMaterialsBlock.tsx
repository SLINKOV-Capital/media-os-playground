import { MaterialAddPanel } from "@/components/MaterialAddPanel";
import { MaterialImagePreview } from "@/components/MaterialImagePreview";
import { getMaterialTypeIcon } from "@/lib/materialTypes";
import { getMaterialPreviewSrc } from "@/lib/materialPreview";
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
          {materials.map((material) => {
            const previewSrc = getMaterialPreviewSrc(material);

            return (
              <li
                key={material.id}
                className={`material-row${previewSrc ? " has-image-preview" : ""}`}
              >
                <span className="material-row-leading" aria-hidden="true">
                  {previewSrc ? (
                    <MaterialImagePreview
                      src={previewSrc}
                      alt={material.title}
                      variant="thumb"
                    />
                  ) : (
                    <span className="material-type-icon material-type-icon-thumb">
                      {getMaterialTypeIcon(material.material_type)}
                    </span>
                  )}
                </span>

                <div className="material-row-body">
                  <Link
                    href={`/materials/${material.id}`}
                    className="material-row-title"
                  >
                    {material.title}
                  </Link>
                  <div className="material-row-meta">
                    <span className="material-row-type">
                      {material.material_type}
                    </span>
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
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <MaterialAddPanel
        documentId={documentId}
        linkedMaterialIds={linkedMaterialIds}
      />
    </section>
  );
}
