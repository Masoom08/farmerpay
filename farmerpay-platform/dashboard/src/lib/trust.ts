/**
 * TRUST v2 API — Thin fetch wrappers around B4 endpoints.
 *
 * Every function accepts a JWT token and returns the parsed response body.
 * Errors are thrown with the status code so the RSC can handle them.
 */

import { apiGet, apiPost } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────

export interface TrustPillar {
  code: string;
  name: string;
  weight: number;
  score: number;
  rawPoints: number;
  maxPoints: number;
  contribution: number;
}

export interface TrustGroup {
  groupCode: string;
  groupLabel: string;
  score: number;
  deltaVsBenchmark: number | null;
}

export interface TrustEvidence {
  pillarCode: string;
  featureCode: string;
  source: string;
  confidence: string;
}

export interface CibilInfo {
  flag: boolean;
  overdueInr: number | null;
  issuer: string | null;
}

export interface TrustSnapshot {
  snapshotUuid: string;
  farmerId: number;
  score: number;
  decision: "SANCTION" | "RECONSIDER" | "REJECT";
  scoreBand: string;
  computedAt: string;
  pillars: TrustPillar[];
  groups: TrustGroup[];
  evidence: TrustEvidence[];
  cibil: CibilInfo;
  farmer: {
    name: string;
    farmerId: number;
    village: string;
  };
}

export interface AuditEntry {
  id: number;
  action: string;
  actorType: string;
  actorId: number | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface FarmerProfile {
  id: number;
  firstName: string;
  lastName: string;
  village: string;
  phone?: string;
}

// ─── API Functions ──────────────────────────────────────────────

/**
 * GET /trust/farmer/:farmerId/snapshot
 * Returns the latest active TRUST snapshot for a farmer.
 */
export async function getSnapshot(
  farmerId: number,
  token: string
): Promise<TrustSnapshot> {
  const res = await apiGet(`/trust/farmer/${farmerId}/snapshot`, token);
  return res.data;
}

/**
 * GET /banker/portfolio/farmers/:farmerId
 * Returns the farmer profile for the header card.
 */
export async function getFarmer(
  farmerId: number,
  token: string
): Promise<FarmerProfile> {
  const res = await apiGet(`/banker/portfolio/farmers/${farmerId}`, token);
  return res.data;
}

/**
 * GET /trust/farmer/:farmerId/audit
 * Returns the audit trail for this farmer's TRUST snapshots.
 */
export async function getAuditTrail(
  farmerId: number,
  token: string
): Promise<AuditEntry[]> {
  const res = await apiGet(`/trust/farmer/${farmerId}/audit`, token);
  return res.data?.items ?? res.data ?? [];
}

/**
 * GET /trust/farmer/:farmerId/evidence
 * Returns evidence sources for the latest snapshot.
 */
export async function getEvidence(
  farmerId: number,
  token: string
): Promise<TrustEvidence[]> {
  const res = await apiGet(`/trust/farmer/${farmerId}/evidence`, token);
  return res.data?.items ?? res.data ?? [];
}

/**
 * POST /trust/farmer/:farmerId/recompute
 * Triggers an async recomputation of the TRUST snapshot.
 */
export async function recomputeSnapshot(
  farmerId: number,
  reason: string,
  token: string
): Promise<{ correlationId: string }> {
  const res = await apiPost(
    `/trust/farmer/${farmerId}/recompute`,
    { reason },
    token
  );
  return res.data;
}

/**
 * POST /trust/decision
 * Records a banker's sanction/reconsider/reject decision.
 */
export async function recordDecision(
  payload: {
    snapshotUuid: string;
    farmerId: number;
    decision: string;
    notes?: string;
  },
  token: string
): Promise<{ decisionId: number }> {
  const res = await apiPost("/trust/decision", payload, token);
  return res.data;
}

/**
 * POST /trust/export/pdf
 * Exports a snapshot as PDF. Returns the raw blob.
 */
export async function exportPdf(
  snapshotUuid: string,
  token: string
): Promise<Blob> {
  const response = await fetch(`/api/v1/trust/export/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ snapshotUuid }),
  });
  if (!response.ok) throw new Error(`PDF export failed: ${response.status}`);
  return response.blob();
}
