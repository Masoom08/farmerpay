/**
 * Activity Subtype Catalog — TS mirror of
 * src/modules/farmer/constants/activitySubtypeCatalog.js
 *
 * Shape must stay in sync with the backend JS version. Used by the
 * farm.tsx inline sub-type picker cards to render options and validate
 * user selections before POSTing /farmer/activity-subtypes.
 */

export type SubtypeActivityCode = "CROP" | "HORTI" | "POULTRY" | "GOATERY";

export type SubtypeDef = {
  code: string;
  labelEn: string;
  labelHi: string;
  icon: string;
};

export type SubtypeCategory = {
  multiSelect: boolean;
  minRequired: number;
  subtypes: SubtypeDef[];
};

export const ACTIVITY_SUBTYPE_CATALOG: Record<SubtypeActivityCode, SubtypeCategory> = {
  CROP: {
    multiSelect: true,
    minRequired: 1,
    subtypes: [
      { code: "rice",      labelEn: "Rice",      labelHi: "धान",    icon: "🌾" },
      { code: "wheat",     labelEn: "Wheat",     labelHi: "गेहूं",    icon: "🌾" },
      { code: "sugarcane", labelEn: "Sugarcane", labelHi: "गन्ना",   icon: "🎋" },
      { code: "oilseeds",  labelEn: "Oilseeds",  labelHi: "तिलहन",  icon: "🌻" },
      { code: "pulses",    labelEn: "Pulses",    labelHi: "दलहन",    icon: "🫘" },
    ],
  },
  HORTI: {
    multiSelect: true,
    minRequired: 1,
    subtypes: [
      { code: "fruits",     labelEn: "Fruits",     labelHi: "फल",       icon: "🍎" },
      { code: "vegetables", labelEn: "Vegetables", labelHi: "सब्जियां",  icon: "🥬" },
      { code: "flowers",    labelEn: "Flowers",    labelHi: "फूल",      icon: "🌸" },
    ],
  },
  POULTRY: {
    multiSelect: true,
    minRequired: 1,
    subtypes: [
      { code: "broiler", labelEn: "Broiler", labelHi: "ब्रॉयलर", icon: "🍗" },
      { code: "layer",   labelEn: "Layer",   labelHi: "लेयर",   icon: "🥚" },
    ],
  },
  GOATERY: {
    multiSelect: true,
    minRequired: 1,
    subtypes: [
      { code: "stall_fed", labelEn: "Stall-fed", labelHi: "बाड़े में", icon: "🏠" },
      { code: "grazing",   labelEn: "Grazing",   labelHi: "चराई",     icon: "🌿" },
    ],
  },
};

/** Activity keys from the farm.tsx tab state → uppercase subtype activity codes. */
export const FARM_TAB_TO_SUBTYPE_CODE: Record<string, SubtypeActivityCode> = {
  crop: "CROP",
  horticulture: "HORTI",
  poultry: "POULTRY",
  goatery: "GOATERY",
};

export const isSubtypeActivity = (farmTab: string): farmTab is keyof typeof FARM_TAB_TO_SUBTYPE_CODE =>
  farmTab in FARM_TAB_TO_SUBTYPE_CODE;

export const getSubtypeLabel = (activityCode: SubtypeActivityCode, code: string): SubtypeDef | undefined =>
  ACTIVITY_SUBTYPE_CATALOG[activityCode]?.subtypes.find((s) => s.code === code);
