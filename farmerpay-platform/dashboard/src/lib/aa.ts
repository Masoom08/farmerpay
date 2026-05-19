/**
 * AA (Account Aggregator) API Service — Banker Dashboard
 * Typed functions for AA admin stats and farmer analysis.
 */

import { apiGet, apiPost } from "./api";

// ─── Types ─────────────────────────────────────────────────────

export interface AAAdminStats {
  consents: {
    total_consents: number;
    approved: number;
    pending: number;
    rejected: number;
    revoked: number;
    expired: number;
  };
  analyses: {
    total_analyses: number;
    avg_score: number;
    farmers_analyzed: number;
    full_analyses: number;
    summary_analyses: number;
  };
  gradeDistribution: Array<{ health_grade: string; count: number }>;
}

export interface ScoreComponent {
  score: number;
  details: Record<string, any>;
}

export interface FarmerAnalysis {
  analysisUuid: string;
  score: number;
  grade: string;
  components: Record<string, ScoreComponent>;
  seasonality: Record<string, any> | null;
  drishtiInputs: Record<string, any> | null;
  trustInputs: Record<string, any> | null;
  sentinelInputs: Record<string, any> | null;
  analysisMode: string;
  transactionCount: number;
  createdAt: string;
  stale?: boolean;
}

export interface ClassifiedTransaction {
  transactionUuid: string;
  txnDate: string;
  txnType: "credit" | "debit";
  amount: number;
  balanceAfter: number | null;
  narration: string;
  mode: string | null;
  incomeCategory: string | null;
  expenseCategory: string | null;
  classificationConfidence: number | null;
}

export interface RiskFlag {
  type: string;
  severity: "high" | "medium" | "low";
  detail: string;
}

// ─── API Functions ─────────────────────────────────────────────

export async function getAdminStats(token: string): Promise<AAAdminStats> {
  const res = await apiGet("/aa/admin/stats", token);
  return res.data;
}

export async function getFarmerAnalysis(farmerId: number, token: string): Promise<FarmerAnalysis | null> {
  const res = await apiGet(`/aa/admin/farmer/${farmerId}/analysis`, token);
  return res.data || null;
}

export async function refreshFarmerAnalysis(farmerId: number, token: string): Promise<FarmerAnalysis> {
  const res = await apiPost(`/aa/analysis/refresh`, { force: true }, token);
  return res.data;
}

export async function getFarmerTransactions(
  farmerId: number, token: string, params: { page?: number; type?: string; category?: string } = {}
): Promise<{ data: ClassifiedTransaction[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.type) query.set("type", params.type);
  if (params.category) query.set("category", params.category);
  const qs = query.toString();
  const res = await apiGet(`/aa/analysis/transactions${qs ? `?${qs}` : ""}`, token);
  return { data: res.data || [], meta: res.meta || { page: 1, limit: 20, total: 0 } };
}

// ─── Helpers ───────────────────────────────────────────────────

export function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#16a34a";
    case "B": return "#65a30d";
    case "C": return "#ca8a04";
    case "D": return "#ea580c";
    case "E": return "#dc2626";
    default: return "#94a3b8";
  }
}

export function gradeBg(grade: string): string {
  switch (grade) {
    case "A": return "bg-green-50 text-green-700";
    case "B": return "bg-lime-50 text-lime-700";
    case "C": return "bg-yellow-50 text-yellow-700";
    case "D": return "bg-orange-50 text-orange-700";
    case "E": return "bg-red-50 text-red-700";
    default: return "bg-slate-50 text-slate-500";
  }
}

export const COMPONENT_LABELS: Record<string, { label: string; weight: number }> = {
  cashFlowStability: { label: "Cash Flow Stability", weight: 25 },
  balanceAdequacy: { label: "Balance Adequacy", weight: 20 },
  incomeDiversity: { label: "Income Diversity", weight: 15 },
  debtDiscipline: { label: "Debt Discipline", weight: 20 },
  govtTransferAccess: { label: "Govt Scheme Access", weight: 10 },
  digitalAdoption: { label: "Digital Adoption", weight: 10 },
};

export const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};
