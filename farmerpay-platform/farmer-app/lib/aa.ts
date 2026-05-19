/**
 * AA (Account Aggregator) API Service
 * Financial intelligence via bank statement analysis.
 */

import { apiGet, apiPost } from "./api";

// ─── Types ─────────────────────────────────────────────────────

export interface ConsentResult {
  consentUuid: string;
  consentHandle?: string;
  redirectUrl?: string;
  status: string;
  provider?: string;
  message?: string;
}

export interface ConsentStatus {
  consentUuid?: string;
  provider?: string;
  status: string;
  purpose?: string;
  dataFrom?: string;
  dataTo?: string;
  createdAt?: string;
  providers?: Array<{ name: string; status: string }>;
}

export interface ScoreComponent {
  score: number;
  details: Record<string, any>;
}

export interface HealthScore {
  score: number;
  grade: string;
  components: {
    cashFlowStability: ScoreComponent;
    balanceAdequacy: ScoreComponent;
    incomeDiversity: ScoreComponent;
    debtDiscipline: ScoreComponent;
    govtTransferAccess: ScoreComponent;
    digitalAdoption: ScoreComponent;
  };
  available: boolean;
}

export interface AnalysisResult {
  analysisUuid?: string;
  score: number;
  grade: string;
  components: Record<string, ScoreComponent>;
  seasonality?: {
    seasonPattern?: { type: string; confidence: number; peakMonths: number[] };
    peakIncomeMonths?: Array<{ month: number; monthName: string }>;
    cashThinMonths?: Array<{ month: number; monthName: string }>;
    recommendedEmiSchedule?: { type: string; skipMonths?: number[]; collectMonths?: number[] };
    incomeRegularity?: number;
    deficitMonthCount?: number;
  };
  drishtiInputs?: Record<string, any>;
  trustInputs?: Record<string, any>;
  sentinelInputs?: Record<string, any>;
  analysisMode?: string;
  transactionCount?: number;
  createdAt?: string;
  accounts?: Array<{ bankName: string; accountType: string; avgMonthlyCredit: number; avgMonthlyDebit: number; avgBalance: number }>;
  totalAvgMonthlyIncome?: number;
  totalAvgMonthlyExpense?: number;
}

export interface Transaction {
  transactionUuid: string;
  txnDate: string;
  txnType: "credit" | "debit";
  amount: number;
  balanceAfter: number | null;
  narration: string;
  reference: string | null;
  mode: string | null;
  incomeCategory: string | null;
  expenseCategory: string | null;
  classificationConfidence: number | null;
}

export interface AnalysisHistoryItem {
  analysisUuid: string;
  score: number;
  grade: string;
  analysisType: string;
  analysisMode: string;
  transactionCount: number;
  periodFrom: string | null;
  periodTo: string | null;
  isLatest: boolean;
  createdAt: string;
}

// ─── API Functions ─────────────────────────────────────────────

export async function initiateConsent(params: {
  provider?: string;
  purposeText?: string;
  monthsBack?: number;
} = {}): Promise<ConsentResult> {
  const res = await apiPost("/aa/consent", params);
  return res?.data;
}

export async function getConsentStatus(): Promise<ConsentStatus> {
  const res = await apiGet("/aa/consent");
  return res?.data;
}

export async function checkConsent(consentUuid: string): Promise<ConsentStatus> {
  const res = await apiGet(`/aa/consent/${consentUuid}`);
  return res?.data;
}

export async function revokeConsent(): Promise<{ consentUuid: string; status: string }> {
  const res = await apiPost("/aa/consent/revoke", {});
  return res?.data;
}

export async function getAnalysis(): Promise<AnalysisResult | null> {
  const res = await apiGet("/aa/analysis");
  return res?.data || null;
}

export async function getHealthScore(): Promise<HealthScore> {
  const res = await apiGet("/aa/analysis/health-score");
  return res?.data;
}

export async function refreshAnalysis(): Promise<AnalysisResult> {
  const res = await apiPost("/aa/analysis/refresh", { force: true });
  return res?.data;
}

export async function getTransactions(params: {
  page?: number;
  limit?: number;
  type?: "credit" | "debit";
  category?: string;
} = {}): Promise<{ data: Transaction[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.type) query.set("type", params.type);
  if (params.category) query.set("category", params.category);
  const qs = query.toString();
  const res = await apiGet(`/aa/analysis/transactions${qs ? `?${qs}` : ""}`);
  return { data: res?.data || [], meta: res?.meta || { page: 1, limit: 20, total: 0 } };
}

export async function getAnalysisHistory(page = 1): Promise<{ items: AnalysisHistoryItem[]; meta: any }> {
  const res = await apiGet(`/aa/analysis/history?page=${page}`);
  return { items: res?.data || [], meta: res?.meta };
}

// ─── Helpers ───────────────────────────────────────────────────

export function gradeColor(grade: string): { bg: string; fg: string } {
  switch (grade) {
    case "A": return { bg: "#e8f5e9", fg: "#2e7d32" };
    case "B": return { bg: "#f1f8e9", fg: "#558b2f" };
    case "C": return { bg: "#fff8e1", fg: "#f9a825" };
    case "D": return { bg: "#fff3e0", fg: "#e65100" };
    case "E": return { bg: "#ffebee", fg: "#c62828" };
    default: return { bg: "#f5f5f5", fg: "#666" };
  }
}

export function scoreColor(score: number): string {
  if (score >= 80) return "#2e7d32";
  if (score >= 65) return "#558b2f";
  if (score >= 50) return "#f9a825";
  if (score >= 35) return "#e65100";
  return "#c62828";
}

export const SEASON_LABELS: Record<string, string> = {
  kharif_dominant: "Kharif Farmer",
  rabi_dominant: "Rabi Farmer",
  dual_season: "Dual Season",
  perennial_or_non_farm: "Year-round Income",
  mixed: "Mixed Pattern",
  insufficient_data: "Not enough data",
};

export const COMPONENT_LABELS: Record<string, { label: string; weight: number; icon: string }> = {
  cashFlowStability: { label: "Cash Flow Stability", weight: 25, icon: "trending-up" },
  balanceAdequacy: { label: "Balance Adequacy", weight: 20, icon: "wallet-outline" },
  incomeDiversity: { label: "Income Diversity", weight: 15, icon: "grid-outline" },
  debtDiscipline: { label: "Debt Discipline", weight: 20, icon: "shield-checkmark-outline" },
  govtTransferAccess: { label: "Govt Scheme Access", weight: 10, icon: "flag-outline" },
  digitalAdoption: { label: "Digital Adoption", weight: 10, icon: "phone-portrait-outline" },
};

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
