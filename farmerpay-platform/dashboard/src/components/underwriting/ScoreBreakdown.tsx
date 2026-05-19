/**
 * ScoreBreakdown — Side-by-side TRUST and FHS component breakdown.
 *
 * Shown below the DecisioningMatrix. Renders both numeric scores with
 * their bands and component contributions. Each component shows a
 * numeric score. Missing data renders "Not enough data", never 0.
 *
 * Consumes the banker-role readiness response shape directly.
 *
 * Design source: DESIGN-SYSTEM-SCORE-DISPLAY.md § Pattern 3 → ScoreBreakdown
 */

"use client";

import { bandTokens, scoreToBand, type ScoreBand } from "@/lib/design-tokens";
import { AlertTriangle, Clock, HelpCircle } from "lucide-react";

// ─── Types (matches banker readiness response) ────────────────────

export interface TrustData {
  score?: number | null;
  band?: string | null;
  sectionScores?: Record<string, number> | null;
  calculatedAt?: string | null;
}

export interface FhsComponent {
  score: number;
  details?: Record<string, unknown>;
}

export interface FhsData {
  score?: number | null;
  band?: string | null;
  grade?: string | null;
  components?: Record<string, FhsComponent> | null;
  analysisMode?: string | null;
  transactionCount?: number | null;
  createdAt?: string | null;
}

export interface ScoreBreakdownProps {
  trust: TrustData | null;
  financialHealth: FhsData | null;
  /** Optional staleness flags */
  stalenessFlags?: { trust?: boolean | null; fhs?: boolean | null };
}

// ─── Labels ───────────────────────────────────────────────────────

const TRUST_COMPONENTS: { key: string; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "behavioural", label: "Behavioural" },
  { key: "repayment", label: "Repayment History" },
  { key: "attestation", label: "Attestation" },
];

const FHS_COMPONENTS: { key: string; label: string }[] = [
  { key: "cashFlowStability", label: "Income Stability" },
  { key: "balanceAdequacy", label: "Surplus" },
  { key: "incomeDiversity", label: "Income Diversity" },
  { key: "debtDiscipline", label: "Debt Discipline" },
  { key: "govtTransferAccess", label: "Govt Transfer Access" },
  { key: "digitalAdoption", label: "Digital Adoption" },
];

// ─── Component ────────────────────────────────────────────────────

export default function ScoreBreakdown({
  trust,
  financialHealth,
  stalenessFlags,
}: ScoreBreakdownProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
      data-testid="score-breakdown"
    >
      {/* TRUST column */}
      <BreakdownColumn
        title="TRUST Score"
        totalScore={trust?.score}
        band={trust?.band as ScoreBand | undefined}
        components={TRUST_COMPONENTS}
        values={trust?.sectionScores ?? null}
        stale={stalenessFlags?.trust ?? false}
        date={trust?.calculatedAt}
        missing={!trust}
        testId="trust-breakdown"
      />

      {/* FHS column */}
      <BreakdownColumn
        title="Financial Health"
        totalScore={financialHealth?.score}
        band={financialHealth?.band as ScoreBand | undefined}
        grade={financialHealth?.grade}
        components={FHS_COMPONENTS}
        values={extractFhsScores(financialHealth?.components)}
        stale={stalenessFlags?.fhs ?? false}
        date={financialHealth?.createdAt}
        missing={!financialHealth}
        meta={financialHealth ? buildFhsMeta(financialHealth) : null}
        testId="fhs-breakdown"
      />
    </div>
  );
}

// ─── Column component ─────────────────────────────────────────────

interface BreakdownColumnProps {
  title: string;
  totalScore?: number | null;
  band?: ScoreBand;
  grade?: string | null;
  components: { key: string; label: string }[];
  values: Record<string, number> | null;
  stale: boolean | null;
  date?: string | null;
  missing: boolean;
  meta?: string | null;
  testId: string;
}

function BreakdownColumn({
  title,
  totalScore,
  band,
  grade,
  components,
  values,
  stale,
  date,
  missing,
  meta,
  testId,
}: BreakdownColumnProps) {
  const resolvedBand = band ?? (totalScore != null ? scoreToBand(totalScore) : undefined);
  const bandToken = resolvedBand ? bandTokens[resolvedBand] : null;

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5"
      data-testid={testId}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {stale && (
          <span
            className="flex items-center gap-1 text-xs text-amber-600"
            data-testid={`${testId}-stale`}
          >
            <Clock className="w-3.5 h-3.5" />
            Stale
          </span>
        )}
      </div>

      {/* Missing state */}
      {missing ? (
        <div
          className="flex items-center gap-3 py-6 text-slate-400"
          data-testid={`${testId}-missing`}
        >
          <HelpCircle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Not enough data</p>
            <p className="text-xs mt-0.5">
              Data has not been collected yet for this score.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Total score + band */}
          <div className="flex items-baseline gap-3 mb-5">
            {totalScore != null ? (
              <span
                className="text-3xl font-bold"
                style={{ color: bandToken?.light ?? "#64748b" }}
                data-testid={`${testId}-total`}
              >
                {Math.round(totalScore)}
              </span>
            ) : (
              <span
                className="text-lg font-medium text-slate-400"
                data-testid={`${testId}-total`}
              >
                —
              </span>
            )}

            {resolvedBand && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: (bandToken?.light ?? "#64748b") + "18",
                  color: bandToken?.light ?? "#64748b",
                }}
                data-testid={`${testId}-band`}
              >
                {bandToken?.labelEn ?? resolvedBand}
              </span>
            )}

            {grade && (
              <span
                className="text-xs font-semibold text-slate-500"
                data-testid={`${testId}-grade`}
              >
                Grade {grade}
              </span>
            )}
          </div>

          {/* Component rows */}
          <div className="space-y-2.5">
            {components.map(({ key, label }) => {
              const value = values?.[key];
              const hasValue = value != null;

              return (
                <div key={key} data-testid={`${testId}-row-${key}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600">{label}</span>
                    {hasValue ? (
                      <span className="text-xs font-semibold text-slate-800">
                        {Math.round(value)}
                      </span>
                    ) : (
                      <span
                        className="text-xs text-slate-400 italic"
                        data-testid={`${testId}-nodata-${key}`}
                      >
                        No data
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    {hasValue ? (
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, value))}%`,
                          backgroundColor: componentColor(value),
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-100" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meta footer */}
          {(date || meta) && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              {date && <span>Updated: {formatDate(date)}</span>}
              {date && meta && <span> · </span>}
              {meta && <span>{meta}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractFhsScores(
  components: Record<string, FhsComponent> | null | undefined,
): Record<string, number> | null {
  if (!components) return null;
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(components)) {
    if (val && typeof val.score === "number") {
      result[key] = val.score;
    }
  }
  return result;
}

function buildFhsMeta(fhs: FhsData): string | null {
  const parts: string[] = [];
  if (fhs.analysisMode) parts.push(fhs.analysisMode.replace(/_/g, " "));
  if (fhs.transactionCount) parts.push(`${fhs.transactionCount} txns`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function componentColor(score: number): string {
  if (score >= 80) return bandTokens.strong.light;
  if (score >= 50) return bandTokens.building.light;
  return bandTokens.low.light;
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
