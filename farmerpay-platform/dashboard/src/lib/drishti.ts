/**
 * DRISHTI API Service — Next.js Dashboard
 * Typed API functions for all DRISHTI scenario engines.
 */

import { apiGet, apiPost, formatRupees, formatRupeesCompact } from "./api";

// ─── Types (shared across all dashboard pages) ──────────────────────

export interface ScenarioProjection {
  total_revenue: number;
  total_cost: number;
  net_farm_income: number;
  total_income_with_other: number;
  emi_to_income_ratio: number;
  health_status: "good" | "watch" | "stressed" | "npa";
  sma_classification: string;
  income_adequacy: string;
  risk_score: number | null;
  breakeven_yield_kg_per_hectare: number | null;
  projected_yield_kg_per_hectare: number | null;
  yield_safety_margin_pct: number | null;
}

export interface CashFlowMonth {
  month: string;
  monthName: string;
  inflows: { farm: { subtotal: number }; non_farm: { subtotal: number }; total: number };
  outflows: { farm: { subtotal: number }; household: { subtotal: number }; loans: { subtotal: number }; total: number };
  net: number;
  cumulative: number;
}

export interface Scenario {
  label: string;
  label_key: string;
  description: string;
  assumptions: Record<string, any>;
  projections: ScenarioProjection;
  monthly_cashflow: CashFlowMonth[];
}

export interface Recommendation { type: string; message_key: string; message: string }
export interface RiskFactor { factor: string; impact: string; message_key: string; message: string }

export interface LoanTerms {
  amount: number; interest_rate: number; tenure_months: number;
  monthly_emi: number; total_repayable: number; total_interest: number; processing_fee: number;
}

export interface ScenarioTemplate {
  id: number; template_uuid: string; engine_type: string; template_name: string;
  description: string; default_variables: Record<string, any>;
  variable_ranges: Record<string, any>; activity_types: string[];
}

export interface SmaMigration {
  good_to_watch: number; good_to_stressed: number; good_to_npa: number;
  watch_to_stressed: number; watch_to_npa: number; stressed_to_npa: number;
  improved: number; no_change: number;
}

export interface InterventionCandidate {
  farmer_id: number; outstanding: number; current_status: string;
  projected_status: string; risk_score: number; income_change: number; primary_risk: string;
}

export interface PortfolioStressResult {
  portfolio_run_uuid: string; status: string; farmer_count: number;
  total_farmers: number; total_outstanding: number;
  stress_impact: {
    projected_npa_count: number; projected_npa_amount: number;
    additional_npa_count: number; portfolio_at_risk_pct: number;
    sma_migration: SmaMigration;
  };
  portfolio_var_95: number;
  intervention_list: InterventionCandidate[];
  risk_factors: RiskFactor[];
  recommendations: Recommendation[];
}

export interface ShareableSummary {
  run_uuid: string; engine_type: string;
  summary_text: string; sms_text: string; whatsapp_text: string;
  key_metrics: Record<string, any>;
}

// ─── API Functions ──────────────────────────────────────────────────

export async function getTemplates(token: string, engineType?: string): Promise<ScenarioTemplate[]> {
  const path = engineType ? `/drishti/templates/${engineType}` : "/drishti/templates";
  const res = await apiGet(path, token);
  return res?.data || [];
}

export async function getBenchmarks(token: string, districtId: number) {
  const res = await apiGet(`/drishti/benchmarks/${districtId}`, token);
  return res?.data || [];
}

export async function runPreLoan(token: string, input: Record<string, any>) {
  return (await apiPost("/drishti/scenarios/pre-loan", input, token))?.data;
}

export async function runHouseholdPortfolio(token: string, input: Record<string, any>) {
  return (await apiPost("/drishti/scenarios/household-portfolio", input, token))?.data;
}

export async function runClimateStress(token: string, input: Record<string, any>) {
  return (await apiPost("/drishti/scenarios/climate-stress", input, token))?.data;
}

export async function runInsurance(token: string, input: Record<string, any>) {
  return (await apiPost("/drishti/scenarios/insurance", input, token))?.data;
}

export async function runMarketTiming(token: string, input: Record<string, any>) {
  return (await apiPost("/drishti/scenarios/market-timing", input, token))?.data;
}

export async function runBankerPortfolio(token: string, input: {
  scope: { district_id?: number; loan_product_id?: number; farmer_ids?: number[] };
  shock_variables: { rainfall_deviation_pct: number; price_change_pct: number; temperature_deviation_celsius: number };
  computation_mode?: string; monte_carlo_runs?: number;
}): Promise<PortfolioStressResult> {
  return (await apiPost("/drishti/scenarios/banker-portfolio", input, token))?.data;
}

export async function getScenarioResult(token: string, runUuid: string) {
  return (await apiGet(`/drishti/scenarios/${runUuid}`, token))?.data;
}

export async function getFarmerScenarios(token: string, farmerId: number) {
  const res = await apiGet(`/drishti/scenarios/farmer/${farmerId}`, token);
  return res?.data || [];
}

export async function compareScenarios(token: string, runUuids: string[], label?: string) {
  return (await apiPost("/drishti/scenarios/compare", { run_uuids: runUuids, comparison_label: label }, token))?.data;
}

export async function getComparison(token: string, compUuid: string) {
  return (await apiGet(`/drishti/scenarios/comparison/${compUuid}`, token))?.data;
}

export async function getShareableSummary(token: string, runUuid: string): Promise<ShareableSummary> {
  return (await apiGet(`/drishti/scenarios/${runUuid}/share`, token))?.data;
}

// Household CRUD
export async function getHouseholdIncome(token: string, farmerId: number) {
  return (await apiGet(`/drishti/household/${farmerId}/income`, token))?.data || [];
}
export async function upsertHouseholdIncome(token: string, farmerId: number, data: Record<string, any>) {
  return (await apiPost(`/drishti/household/${farmerId}/income`, data, token))?.data;
}
export async function getHouseholdExpenses(token: string, farmerId: number) {
  return (await apiGet(`/drishti/household/${farmerId}/expenses`, token))?.data || [];
}
export async function upsertHouseholdExpense(token: string, farmerId: number, data: Record<string, any>) {
  return (await apiPost(`/drishti/household/${farmerId}/expenses`, data, token))?.data;
}
export async function getHouseholdSummary(token: string, farmerId: number) {
  return (await apiGet(`/drishti/household/${farmerId}/summary`, token))?.data;
}

// ─── Helpers ────────────────────────────────────────────────────────

export const HEALTH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  good: { bg: "bg-green-50", text: "text-green-700", border: "border-green-500" },
  watch: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-500" },
  stressed: { bg: "bg-red-50", text: "text-red-700", border: "border-red-500" },
  npa: { bg: "bg-red-100", text: "text-red-900", border: "border-red-700" },
};

export const VERDICT_COLORS: Record<string, { bg: string; text: string }> = {
  SAFE: { bg: "bg-green-50", text: "text-green-700" },
  ENROLL: { bg: "bg-green-50", text: "text-green-700" },
  CAUTION: { bg: "bg-amber-50", text: "text-amber-700" },
  OPTIONAL: { bg: "bg-amber-50", text: "text-amber-700" },
  RISKY: { bg: "bg-red-50", text: "text-red-700" },
  SKIP: { bg: "bg-red-50", text: "text-red-700" },
};

export const ENGINE_LABELS: Record<string, string> = {
  pre_loan: "Pre-Loan Analysis",
  household_portfolio: "Household Portfolio",
  climate_stress: "Climate Stress Test",
  insurance: "Insurance Decision",
  market_timing: "Market Timing",
  banker_portfolio: "Portfolio Stress Test",
};

export function formatCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return "-";
  return formatRupeesCompact(n as number);
}
