/**
 * DRISHTI API Service — Farmer App
 * Typed API functions for all DRISHTI scenario engines.
 */

import { apiGet, apiPost, formatRupees, getUser } from "./api";

// ─── Farmer Context (reads from auth + activity subscriptions) ──────

export interface FarmerContext {
  farmerId: number;
  name: string;
  activeCrops: Array<{ activityCode: string; cropId?: string; season?: string }>;
  hasDairy: boolean;
  hasFishery: boolean;
  hasHorti: boolean;
  activeLoans: Array<{ applicationId: number; productName?: string; amount?: number }>;
  districtId?: number;
}

/**
 * Load the logged-in farmer's context for DRISHTI screens.
 * Pulls user ID from auth cache, then fetches activity subscriptions + active loans.
 */
export async function getFarmerContext(): Promise<FarmerContext> {
  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("Not logged in — please log in first");
  }

  // Parallel fetch: subscriptions + loans
  const [subsRes, loansRes] = await Promise.all([
    apiGet("/farmer/activity-subscriptions").catch(() => null),
    apiGet("/dice/applications/me?status=active,disbursed,approved").catch(() => null),
  ]);

  const subs: Array<{ activityCode: string; status: string; cropId?: string; season?: string }> =
    (subsRes?.data?.items || []).filter((s: any) => s.status === "ACTIVE");

  const loans: Array<{ id: number; applicationUuid: string; productName?: string; applyForAmount?: number }> =
    loansRes?.data?.items || loansRes?.data || [];

  return {
    farmerId: user.id,
    name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Farmer",
    activeCrops: subs
      .filter(s => ["CROP", "HORTI"].includes(s.activityCode))
      .map(s => ({ activityCode: s.activityCode, cropId: s.cropId, season: s.season })),
    hasDairy: subs.some(s => s.activityCode === "DAIRY"),
    hasFishery: subs.some(s => s.activityCode === "FISHERY"),
    hasHorti: subs.some(s => s.activityCode === "HORTI"),
    activeLoans: loans.map(l => ({ applicationId: l.id, productName: l.productName, amount: l.applyForAmount })),
  };
}

// ─── Types ──────────────────────────────────────────────────────────

export interface ScenarioProjection {
  total_revenue: number;
  total_cost: number;
  net_farm_income: number;
  total_income_with_other: number;
  emi_burden_monthly: number;
  emi_to_income_ratio: number;
  breakeven_yield_kg_per_hectare: number | null;
  projected_yield_kg_per_hectare: number | null;
  yield_safety_margin_pct: number | null;
  health_status: "good" | "watch" | "stressed" | "npa";
  sma_classification: string;
  income_adequacy: string;
  risk_score: number | null;
}

export interface CashFlowMonth {
  month: string;
  monthName: string;
  inflows: { farm: { crop: number; dairy: number; fishery: number; subtotal: number }; non_farm: Record<string, number> & { subtotal: number }; total: number };
  outflows: { farm: { crop_inputs: number; dairy_feed: number; fishery_inputs: number; subtotal: number }; household: Record<string, number> & { subtotal: number }; loans: { emi: number; subtotal: number }; total: number };
  net: number;
  cumulative: number;
  is_negative: boolean;
}

export interface Scenario {
  label: string;
  label_key: string;
  description: string;
  assumptions: Record<string, any>;
  projections: ScenarioProjection;
  monthly_cashflow: CashFlowMonth[];
}

export interface Recommendation {
  type: "verdict" | "warning" | "action" | "info" | "strength";
  message_key: string;
  message: string;
}

export interface RiskFactor {
  factor: string;
  impact: "high" | "medium" | "low";
  message_key: string;
  message: string;
}

export interface LoanTerms {
  amount: number;
  interest_rate: number;
  tenure_months: number;
  monthly_emi: number;
  total_repayable: number;
  total_interest: number;
  processing_fee: number;
}

export interface PreLoanResult {
  run_uuid: string;
  engine_type: string;
  farmer_summary: Record<string, any>;
  loan_terms: LoanTerms;
  scenarios: Scenario[];
  insurance_comparison: { without_insurance: { worst_case_loss: number }; with_pmfby: { premium: number; expected_payout: number; worst_case_loss: number } } | null;
  risk_factors: RiskFactor[];
  recommendations: Recommendation[];
}

export interface HouseholdPortfolioResult {
  run_uuid: string;
  household_profile: Record<string, any>;
  income_summary: { total_projected_annual: number; farm_income_annual: number; non_farm_income_annual: number; farm_income_pct: number; non_farm_income_pct: number; income_streams: Array<{ source: string; type: string; annual: number; pct: number }>; income_diversification_index: number; income_diversification_rating: string };
  expense_summary: { total_annual_household: number; total_annual_farm_operations: number; grand_total_annual: number };
  net_household_position: { annual_surplus: number; surplus_months: number; deficit_months: number; working_capital_gap: number };
  financial_resilience: { resilience_score: number; resilience_rating: string; months_survivable_without_farm_income: number };
  stress_scenarios: Array<{ label: string; description: string; income_change: number; household_can_survive: boolean }>;
  comparison_to_current: { income_change_pct: number; risk_change: string };
  recommendations: Recommendation[];
  scenarios: Scenario[];
}

export interface ClimateStressResult {
  run_uuid: string;
  climate_scenario: { scenario_type: string; severity: string; rainfall_deviation_pct: number; temperature_deviation_celsius: number };
  impact_cascade: Record<string, any>;
  scenarios: Scenario[];
  monte_carlo: { probability_profitable: number; probability_sma_stress: number; income_p10: number; income_p50: number; income_p90: number } | null;
  risk_factors: RiskFactor[];
  recommendations: Recommendation[];
}

export interface InsuranceResult {
  run_uuid: string;
  insurance_terms: { insurance_type: string; sum_insured: number; premium_per_season: number; premium_as_pct_of_sum: number };
  recommendation: { verdict: "ENROLL" | "OPTIONAL" | "SKIP"; confidence: string; reasoning: string };
  five_year_analysis: { five_year_roi_pct: number; annual_claim_probability: number };
  break_even: { break_even_claim_frequency: number; historical_claim_frequency: number };
  stress_comparisons: Array<{ scenario: any; without_insurance: { net_income: number }; with_insurance: { net_income: number }; insurance_payout: number }>;
  recommendations: Recommendation[];
  scenarios: Scenario[];
}

export interface MarketTimingResult {
  run_uuid: string;
  commodity: { commodity_id: string; quantity_quintals: number; current_price_per_quintal: number };
  sell_now: { price_per_quintal: number; net_proceeds: number };
  storage_scenarios: Array<{ months: number; projected_price: number; storage_cost: number; net_proceeds: number; net_gain_vs_sell_now: number; storage_roi_pct: number; probability_of_gain: number | null }>;
  optimal_window: { recommended_action: string; recommended_months: number; gain_vs_sell_now: number; confidence: string };
  price_trajectory: { monthly_prices: number[] };
  recommendations: Recommendation[];
  scenarios: Scenario[];
}

export interface ScenarioTemplate {
  id: number;
  template_uuid: string;
  engine_type: string;
  template_name: string;
  description: string;
  default_variables: Record<string, any>;
  variable_ranges: Record<string, any>;
  activity_types: string[];
}

export interface ShareableSummary {
  run_uuid: string;
  engine_type: string;
  summary_text: string;
  sms_text: string;
  whatsapp_text: string;
  key_metrics: Record<string, any>;
}

// ─── API Functions ──────────────────────────────────────────────────

export async function getTemplates(engineType?: string): Promise<ScenarioTemplate[]> {
  const path = engineType ? `/drishti/templates/${engineType}` : "/drishti/templates";
  const res = await apiGet(path);
  return res?.data || [];
}

export async function getBenchmarks(districtId: number) {
  const res = await apiGet(`/drishti/benchmarks/${districtId}`);
  return res?.data || [];
}

export async function runPreLoan(input: {
  farmer_id: number; loan_product_id: number; loan_amount: number;
  loan_tenure_months: number; repayment_type: string;
  activity: { type: string; crop_id?: string; acreage_hectares?: number; season?: string; irrigation_type?: string };
  include_insurance_comparison?: boolean;
}): Promise<PreLoanResult> {
  const res = await apiPost("/drishti/scenarios/pre-loan", input);
  return res?.data;
}

export async function runHouseholdPortfolio(input: {
  farmer_id: number;
  proposed_farm_activities?: Record<string, any>;
  household_income?: Record<string, any>;
  household_expenses?: Record<string, any>;
  time_horizon_months?: number;
  include_stress_scenarios?: boolean;
}): Promise<HouseholdPortfolioResult> {
  const res = await apiPost("/drishti/scenarios/household-portfolio", input);
  return res?.data;
}

export async function runClimateStress(input: {
  farmer_id: number;
  climate_scenario: { rainfall_deviation_pct: number; temperature_deviation_celsius?: number; delayed_monsoon_weeks?: number };
  computation_mode?: string;
}): Promise<ClimateStressResult> {
  const res = await apiPost("/drishti/scenarios/climate-stress", input);
  return res?.data;
}

export async function runInsurance(input: {
  farmer_id: number; insurance_type: string; sum_insured: number;
  activity: { type: string; crop_id?: string; acreage_hectares?: number; season?: string };
}): Promise<InsuranceResult> {
  const res = await apiPost("/drishti/scenarios/insurance", input);
  return res?.data;
}

export async function runMarketTiming(input: {
  farmer_id: number; commodity_id: string; quantity_quintals: number;
  current_price_per_quintal?: number;
  storage_options?: { warehousing_cost_per_quintal_month?: number; storage_duration_months?: number[] };
  include_topup_loan_simulation?: boolean;
}): Promise<MarketTimingResult> {
  const res = await apiPost("/drishti/scenarios/market-timing", input);
  return res?.data;
}

export async function getScenarioResult(runUuid: string) {
  const res = await apiGet(`/drishti/scenarios/${runUuid}`);
  return res?.data;
}

export async function getFarmerScenarios(farmerId: number, query?: { engine_type?: string }) {
  const params = query?.engine_type ? `?engine_type=${query.engine_type}` : "";
  const res = await apiGet(`/drishti/scenarios/farmer/${farmerId}${params}`);
  return res?.data || [];
}

export async function getShareableSummary(runUuid: string, sendSms = false, phone?: string): Promise<ShareableSummary> {
  let path = `/drishti/scenarios/${runUuid}/share`;
  if (sendSms && phone) path += `?send_sms=true&phone=${encodeURIComponent(phone)}`;
  const res = await apiGet(path);
  return res?.data;
}

export async function compareScenarios(runUuids: string[], label?: string) {
  const res = await apiPost("/drishti/scenarios/compare", { run_uuids: runUuids, comparison_label: label });
  return res?.data;
}

// ─── Helpers ────────────────────────────────────────────────────────

export function healthColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case "good": return { bg: "#e8f5e9", fg: "#2e7d32" };
    case "watch": return { bg: "#fff3e0", fg: "#e65100" };
    case "stressed": return { bg: "#ffebee", fg: "#c62828" };
    case "npa": return { bg: "#ffcdd2", fg: "#b71c1c" };
    default: return { bg: "#f5f5f5", fg: "#666" };
  }
}

export function verdictColor(verdict: string): { bg: string; fg: string } {
  switch (verdict) {
    case "SAFE": case "ENROLL": return { bg: "#e8f5e9", fg: "#2e7d32" };
    case "CAUTION": case "OPTIONAL": return { bg: "#fff3e0", fg: "#e65100" };
    case "RISKY": case "SKIP": return { bg: "#ffebee", fg: "#c62828" };
    default: return { bg: "#f5f5f5", fg: "#666" };
  }
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null) return "-";
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}
