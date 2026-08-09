"use client";

import { MaterialTypeSelect } from "@/components/MaterialTypeSelect";
import { MaterialUrlField } from "@/components/MaterialUrlField";
import { NewMaterialImageUpload } from "@/components/NewMaterialImageUpload";
import type { MaterialTypeValue } from "@/lib/materialTypes";
import { useState } from "react";

type MaterialCreatePropertiesProps = {
  idSuffix: string;
};

export function MaterialCreateProperties({
  idSuffix,
}: MaterialCreatePropertiesProps) {
  const [materialType, setMaterialType] =
    useState<MaterialTypeValue>("other");
  const typeId = `material-type-${idSuffix}`;
  const urlId = `material-url-${idSuffix}`;

  return (
    <>
      <div className="notion-property">
        <label htmlFor={typeId} className="notion-property-label">
          Тип
        </label>
        <div className="notion-property-value">
          <MaterialTypeSelect
            id={typeId}
            name="material_type"
            value={materialType}
            onChange={(event) =>
              setMaterialType(event.target.value as MaterialTypeValue)
            }
            required
          />
        </div>
      </div>

      {materialType === "image" ? <NewMaterialImageUpload /> : null}

      <div className="notion-property notion-property-optional">
        <label htmlFor={urlId} className="notion-property-label">
          <span className="notion-property-label-primary">URL / путь</span>
          <span className="notion-property-optional-tag">необязательно</span>
        </label>
        <div className="notion-property-value">
          <MaterialUrlField
            id={urlId}
            name="file_url_or_path"
          />
        </div>
      </div>
    </>
  );
}
