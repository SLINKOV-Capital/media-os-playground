import type { Action, Material } from "@/lib/types";

type ActionMaterialRow = {
  material_id: string;
  materials: Pick<Material, "id" | "title"> | Pick<Material, "id" | "title">[] | null;
};

type ActionRowWithMaterials = Action & {
  action_materials?: ActionMaterialRow[] | null;
};

export function mapActionMaterials(
  action: ActionRowWithMaterials
): Action {
  const { action_materials, ...rest } = action;

  const materials = (action_materials ?? [])
    .map((row) => {
      if (!row.materials) {
        return null;
      }

      return Array.isArray(row.materials) ? row.materials[0] : row.materials;
    })
    .filter((material): material is Pick<Material, "id" | "title"> =>
      Boolean(material)
    );

  return {
    ...rest,
    materials,
  };
}

export function mapActionsMaterials(
  actions: ActionRowWithMaterials[]
): Action[] {
  return actions.map(mapActionMaterials);
}
