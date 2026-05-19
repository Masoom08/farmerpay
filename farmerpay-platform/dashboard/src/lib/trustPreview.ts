/**
 * TRUST preview — read-only, non-persisting score projection.
 *
 * Calls `POST /trust/farmer/:farmerId/preview` with a DRISHTI scenario run UUID.
 * The backend computes what the TRUST score *would be* under the scenario's
 * projected inputs but does NOT persist a new snapshot.
 */

import { apiPost } from "@/lib/api";

export interface TrustPreview {
  /** Projected TRUST score under the scenario */
  projectedScore: number;
  /** Current (persisted) TRUST score for reference */
  currentScore: number;
  /** The scenario run UUID used */
  scenarioRunUuid: string;
}

/**
 * POST /trust/farmer/:farmerId/preview
 *
 * Read-only preview — never persists.
 */
export async function previewTrustScore(
  farmerId: number,
  scenarioRunUuid: string,
  token: string,
): Promise<TrustPreview> {
  const res = await apiPost(
    `/trust/farmer/${farmerId}/preview`,
    { scenarioRunUuid },
    token,
  );
  return res.data;
}
