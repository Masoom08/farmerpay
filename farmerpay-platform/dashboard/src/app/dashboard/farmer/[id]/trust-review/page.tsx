import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import TrustReviewShell from "./TrustReviewShell";
import type {
  TrustSnapshot,
  FarmerProfile,
  AuditEntry,
  TrustEvidence,
} from "@/lib/trust";

// ─── Server-side data fetching ──────────────────────────────────

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000";

async function serverFetch<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status}`);
    const body = await res.json();
    return body.data ?? body;
  } catch {
    return null;
  }
}

// ─── Page Component (RSC) ───────────────────────────────────────

export default async function TrustReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const farmerId = parseInt(id, 10);

  if (isNaN(farmerId)) notFound();

  // Read JWT from cookie (server-side) — falls back to empty string
  const cookieStore = await cookies();
  const token = cookieStore.get("fp_token")?.value ?? "";

  // Parallel data fetch — all 4 blocks
  const [farmer, snapshot, audit, evidence] = await Promise.all([
    serverFetch<FarmerProfile>(`/banker/portfolio/farmers/${farmerId}`, token),
    serverFetch<TrustSnapshot>(`/trust/farmer/${farmerId}/snapshot`, token),
    serverFetch<AuditEntry[]>(`/trust/farmer/${farmerId}/audit`, token),
    serverFetch<TrustEvidence[]>(`/trust/farmer/${farmerId}/evidence`, token),
  ]);

  if (!farmer) notFound();

  return (
    <Suspense>
      <TrustReviewShell
        farmerId={farmerId}
        farmer={farmer}
        snapshot={snapshot}
        audit={audit ?? []}
        evidence={evidence ?? []}
      />
    </Suspense>
  );
}
