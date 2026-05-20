export type Season = "kharif" | "rabi" | "zaid";

/**
 * Auto-detect agricultural season based on current month.
 *
 * Kharif: June to October
 * Rabi: November to March
 * Zaid: April to May
 */
export const detectSeason = (): Season => {
  const month = new Date().getMonth() + 1; // 1-12

  if (month >= 6 && month <= 10) {
    return "kharif";
  }

  if (month >= 11 || month <= 3) {
    return "rabi";
  }

  return "zaid";
};

/**
 * Convert season to user-friendly label.
 */
export const getSeasonLabel = (season: Season): string => {
  switch (season) {
    case "kharif":
      return "Kharif";
    case "rabi":
      return "Rabi";
    case "zaid":
      return "Zaid";
    default:
      return season;
  }
};