import type { Document, Material } from "@/lib/types";

type DocumentMaterialRow = {
  material_id: string;
  materials: Material | Material[] | null;
};

type DocumentLinkRow = {
  document_id: string;
  documents: Pick<Document, "id" | "title"> | Pick<Document, "id" | "title">[] | null;
};

export function mapDocumentMaterialsFromRows(
  rows: DocumentMaterialRow[]
): Material[] {
  return rows
    .map((row) => {
      if (!row.materials) {
        return null;
      }

      return Array.isArray(row.materials) ? row.materials[0] : row.materials;
    })
    .filter((material): material is Material => Boolean(material))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export function mapDocumentLinksFromRows(
  rows: DocumentLinkRow[]
): Pick<Document, "id" | "title">[] {
  return rows
    .map((row) => {
      if (!row.documents) {
        return null;
      }

      return Array.isArray(row.documents) ? row.documents[0] : row.documents;
    })
    .filter((document): document is Pick<Document, "id" | "title"> =>
      Boolean(document)
    );
}
