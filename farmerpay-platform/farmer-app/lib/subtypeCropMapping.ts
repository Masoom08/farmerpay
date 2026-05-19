/**
 * Sub-crop → primary crop_code mapping (SAGE Phase 2A onboarding).
 *
 * The 5 sub-crop cards in `ACTIVITY_SUBTYPE_CATALOG.CROP.subtypes` are
 * high-level categories. They need to resolve to a specific `crop_code`
 * in `crop_masters` so the variety picker can fetch the right list.
 *
 * For v1 only the 5 crops with full PoP + trigger + pest data (from the
 * Phase 2A seeders) are wired. `pulses` and `oilseeds` resolve directly
 * to their highest-acreage Indian representative:
 *   - pulses   → CHICKPEA (~10-12 mha, largest pulse)
 *   - oilseeds → SOYBEAN  (~12 mha, largest oilseed)
 *
 * When Mustard / Groundnut / Tur get their own PoP seeders later, the
 * oilseeds and pulses cards will need a mini sub-picker before this
 * mapping applies. Documented as deferred in the plan.
 */

export const SUBTYPE_TO_CROP_CODE: Record<string, string> = {
  // CROP sub-types
  rice: "RICE",
  wheat: "WHEAT",
  sugarcane: "SUGARCANE",
  oilseeds: "SOYBEAN",
  pulses: "CHICKPEA",
  // HORTI sub-types
  vegetables: "TOMATO",
  fruits: "MANGO",
  flowers: "MARIGOLD",
};

/**
 * Friendly label for the variety-picker header that tells the farmer what
 * each sub-type resolves to today. Empty for direct 1:1 sub-crops.
 */
export const SUBTYPE_PRIMARY_LABEL: Record<string, string> = {
  rice: "",
  wheat: "",
  sugarcane: "",
  oilseeds: "Soybean (primary oilseed)",
  pulses: "Chickpea (primary pulse)",
  vegetables: "Tomato (primary vegetable)",
  fruits: "Mango (primary fruit)",
  flowers: "Marigold (primary flower)",
};

/**
 * HORTI sub-types that are wired for variety selection. All 3 are now
 * active (Phase 2A added Mango + Marigold seeders).
 */
export const HORTI_SUBTYPES_WIRED: Record<string, boolean> = {
  vegetables: true,
  fruits: true,
  flowers: true,
};

export const resolveCropCodeForSubtype = (subtypeCode: string): string | null =>
  SUBTYPE_TO_CROP_CODE[subtypeCode] || null;
