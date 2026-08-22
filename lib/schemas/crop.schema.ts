export type CropInput = {
  crop_type_id?: string | number;
  name?: string;
  land_area_unit?: string;
  productivity_unit?: string;
  production_unit?: string;
  is_active?: boolean | number | string;
};

export type CropValidationResult =
  | {
      valid: true;
      data: {
        crop_type_id: number;
        name: string;
        land_area_unit: string;
        productivity_unit: string;
        production_unit: string;
        is_active: boolean;
      };
      errors: Record<string, never>;
    }
  | {
      valid: false;
      data: null;
      errors: Record<string, string>;
    };

function normalizeActive(value: unknown) {
  return !(value === "inactive" || value === false || value === 0 || value === "0" || value === "false");
}

function cleanUnit(value: unknown, fallback: string) {
  const unit = String(value ?? "").trim();
  return unit || fallback;
}

function validateUnit(value: string, label: string, errors: Record<string, string>) {
  if (value.length > 50) errors[label] = "Unit may not be greater than 50 characters";
}

export function validateCropInput(input: CropInput): CropValidationResult {
  const cropTypeId = Number(input.crop_type_id);
  const name = String(input.name ?? "").trim();
  const landAreaUnit = cleanUnit(input.land_area_unit, "Ha");
  const productivityUnit = cleanUnit(input.productivity_unit, "Qt/Ha");
  const productionUnit = cleanUnit(input.production_unit, "Qt");
  const errors: Record<string, string> = {};

  if (!cropTypeId || Number.isNaN(cropTypeId)) {
    errors.crop_type_id = "Crop type is required";
  }

  if (!name) {
    errors.name = "Crop name is required";
  } else if (name.length < 2) {
    errors.name = "Crop name must be at least 2 characters";
  } else if (name.length > 191) {
    errors.name = "Crop name may not be greater than 191 characters";
  }

  validateUnit(landAreaUnit, "land_area_unit", errors);
  validateUnit(productivityUnit, "productivity_unit", errors);
  validateUnit(productionUnit, "production_unit", errors);

  if (Object.keys(errors).length > 0) {
    return { valid: false, data: null, errors };
  }

  return {
    valid: true,
    data: {
      crop_type_id: cropTypeId,
      name,
      land_area_unit: landAreaUnit,
      productivity_unit: productivityUnit,
      production_unit: productionUnit,
      is_active: normalizeActive(input.is_active ?? true),
    },
    errors: {},
  };
}
