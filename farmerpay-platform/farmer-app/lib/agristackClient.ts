/**
 * AgriStack Client — thin wrapper over the authenticated backend endpoints
 * for AgriStack lookups. Today only land-lookup is exposed; more endpoints
 * (crop data, scheme eligibility) land here as the persona flows need them.
 */

import { apiPost } from "./api";

export interface AgriStackPlot {
  surveyNumber: string;
  subdivision: string | null;
  areaHectares: number;
  village: string;
  district: string;
  state: string;
  ownershipType: string;
  source: string;
}

export interface LandLookupResult {
  plots: AgriStackPlot[];
  source: "AGRISTACK_LIVE" | "AGRISTACK_MOCK";
}

export async function fetchLandRecords(): Promise<LandLookupResult> {
  const r = await apiPost("/agristack/land-lookup", {});
  if (r?.success && r?.data) {
    return {
      plots: r.data.plots || [],
      source: r.data.source || "AGRISTACK_MOCK",
    };
  }
  return { plots: [], source: "AGRISTACK_MOCK" };
}
