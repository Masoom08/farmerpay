/**
 * DrishtiStressLens — Overlay that plots DRISHTI scenario stress shifts
 * on the DecisioningMatrix.
 *
 * Receives baseline {trust, fhs} and a list of DRISHTI scenarios.
 * For each enabled scenario, renders an arrow from baseline to the
 * stressed position. Updates the recommended action label to reflect
 * the worst-case cell across all enabled scenarios.
 *
 * Design source: DESIGN-SYSTEM-SCORE-DISPLAY.md § Pattern 3 → DrishtiStressLens
 */

"use client";

import { useMemo, useState } from "react";
import { decisionTokens, type DecisionAction } from "@/lib/design-tokens";
import type { ScenarioProjection } from "@/lib/drishti";

// ─── Types ────────────────────────────────────────────────────────

export interface StressScenario {
  /** Unique ID */
  id: string;
  /** Display name */
  label: string;
  /** Short description */
  description: string;
  /** DRISHTI scenario projections */
  projections: ScenarioProjection;
  /** Pre-computed stressed FHS score (if available from backend) */
  stressedFhs?: number;
}

export interface DrishtiStressLensProps {
  /** Baseline TRUST score 0-100 */
  trust: number;
  /** Baseline FHS score 0-100 */
  fhs: number;
  /** TRUST threshold */
  trustCutoff: number;
  /** FHS threshold */
  fhsCutoff: number;
  /** Current baseline cell */
  baselineCell: DecisionAction;
  /** Available DRISHTI scenarios */
  scenarios: StressScenario[];
  /** SVG width (matches DecisioningMatrix) */
  width?: number;
}

// ─── Cell computation ─────────────────────────────────────────────

function computeCell(
  trust: number,
  fhs: number,
  trustCutoff: number,
  fhsCutoff: number,
): DecisionAction {
  const highTrust = trust >= trustCutoff;
  const highFhs = fhs >= fhsCutoff;
  if (highTrust && highFhs) return "approve";
  if (highTrust && !highFhs) return "conditional";
  if (!highTrust && highFhs) return "refer";
  return "decline";
}

const CELL_SEVERITY: Record<DecisionAction, number> = {
  approve: 0,
  conditional: 1,
  refer: 2,
  decline: 3,
};

const ACTION_LABELS: Record<DecisionAction, string> = {
  approve: "Approve",
  conditional: "Conditional Approve",
  refer: "Refer for Review",
  decline: "Decline",
};

// ─── FHS stress estimation ────────────────────────────────────────

/**
 * Estimate stressed FHS from DRISHTI scenario projections.
 *
 * If the scenario provides a pre-computed stressedFhs, use that.
 * Otherwise, estimate from health_status + emi_to_income_ratio:
 *   - good → FHS stays near baseline
 *   - watch → FHS drops ~15-25 pts
 *   - stressed → FHS drops ~30-45 pts
 *   - npa → FHS drops to near-zero
 *
 * TRUST is not affected by DRISHTI scenarios (TRUST measures
 * behavioural reliability, not cash flow).
 */
function estimateStressedFhs(
  baselineFhs: number,
  scenario: StressScenario,
): number {
  if (scenario.stressedFhs != null) return scenario.stressedFhs;

  const { health_status, emi_to_income_ratio } = scenario.projections;

  // Base degradation from health status
  let degradation = 0;
  switch (health_status) {
    case "good":
      degradation = 5;
      break;
    case "watch":
      degradation = 20;
      break;
    case "stressed":
      degradation = 38;
      break;
    case "npa":
      degradation = Math.min(baselineFhs - 5, 55);
      break;
  }

  // Additional degradation from high EMI burden
  if (emi_to_income_ratio > 0.4) degradation += 10;
  else if (emi_to_income_ratio > 0.3) degradation += 5;

  return Math.max(0, Math.min(100, baselineFhs - degradation));
}

// ─── Scenario colors ──────────────────────────────────────────────

const SCENARIO_COLORS = [
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#be185d", // pink-700
];

// ─── Component ────────────────────────────────────────────────────

export default function DrishtiStressLens({
  trust,
  fhs,
  trustCutoff,
  fhsCutoff,
  baselineCell,
  scenarios,
  width = 480,
}: DrishtiStressLensProps) {
  const [enabled, setEnabled] = useState<Set<string>>(() => {
    // Default: enable all scenarios
    return new Set(scenarios.map((s) => s.id));
  });

  const toggleScenario = (id: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute stressed positions for enabled scenarios
  const stressedPositions = useMemo(() => {
    return scenarios
      .filter((s) => enabled.has(s.id))
      .map((s, idx) => {
        const stressedFhs = estimateStressedFhs(fhs, s);
        const cell = computeCell(trust, stressedFhs, trustCutoff, fhsCutoff);
        return {
          ...s,
          stressedFhs,
          stressedTrust: trust, // TRUST unaffected by DRISHTI
          cell,
          color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
        };
      });
  }, [scenarios, enabled, trust, fhs, trustCutoff, fhsCutoff]);

  // Worst-case cell across all enabled scenarios
  const worstCase = useMemo(() => {
    let worst: DecisionAction = baselineCell;
    for (const pos of stressedPositions) {
      if (CELL_SEVERITY[pos.cell] > CELL_SEVERITY[worst]) {
        worst = pos.cell;
      }
    }
    return worst;
  }, [stressedPositions, baselineCell]);

  const actionChanged = worstCase !== baselineCell;

  // Layout (must match DecisioningMatrix)
  const AXIS_LABEL_W = 40;
  const PADDING = 8;
  const AXIS_LABEL_H = 32;
  const gridW = width - AXIS_LABEL_W - PADDING * 2;
  const cellH = 120;
  const gridX = AXIS_LABEL_W + PADDING;
  const gridY = PADDING;
  const totalH = cellH * 2 + AXIS_LABEL_H + PADDING * 2;

  // Map score to pixel
  const scoreToX = (score: number) => gridX + (score / 100) * gridW;
  const scoreToY = (score: number) => gridY + ((100 - score) / 100) * cellH * 2;

  const baseX = scoreToX(fhs);
  const baseY = scoreToY(trust);

  return (
    <div data-testid="drishti-stress-lens">
      {/* Scenario toggles */}
      <div className="flex flex-wrap items-center gap-2 mb-4" data-testid="scenario-toggles">
        <span className="text-xs font-semibold text-slate-500 mr-1">Stress scenarios:</span>
        {scenarios.map((s, idx) => {
          const isOn = enabled.has(s.id);
          const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length];
          return (
            <button
              key={s.id}
              onClick={() => toggleScenario(s.id)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all
                ${isOn
                  ? "text-white"
                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                }
              `}
              style={isOn ? { backgroundColor: color, borderColor: color } : undefined}
              aria-pressed={isOn}
              data-testid={`toggle-${s.id}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* SVG overlay — same dimensions as DecisioningMatrix */}
      <svg
        width={width}
        height={totalH}
        viewBox={`0 0 ${width} ${totalH}`}
        style={{ fontFamily: "system-ui, sans-serif" }}
        aria-label="DRISHTI stress scenario overlay"
        data-testid="stress-svg"
      >
        {/* Grid background (faint) */}
        <rect
          x={gridX}
          y={gridY}
          width={gridW}
          height={cellH * 2}
          rx={8}
          fill="#f8fafc"
          stroke="#e2e8f0"
          strokeWidth={1}
        />

        {/* Threshold lines */}
        <line
          x1={gridX}
          y1={gridY + cellH}
          x2={gridX + gridW}
          y2={gridY + cellH}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <line
          x1={gridX + gridW / 2}
          y1={gridY}
          x2={gridX + gridW / 2}
          y2={gridY + cellH * 2}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Axis labels */}
        <text x={gridX + gridW / 4} y={gridY + cellH * 2 + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">
          Low FHS
        </text>
        <text x={gridX + gridW * 3 / 4} y={gridY + cellH * 2 + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">
          High FHS
        </text>
        <text x={AXIS_LABEL_W - 4} y={gridY + cellH / 2} textAnchor="end" dominantBaseline="central" fontSize={9} fill="#94a3b8">
          High T
        </text>
        <text x={AXIS_LABEL_W - 4} y={gridY + cellH + cellH / 2} textAnchor="end" dominantBaseline="central" fontSize={9} fill="#94a3b8">
          Low T
        </text>

        {/* Baseline marker */}
        <circle
          cx={baseX}
          cy={baseY}
          r={6}
          fill="#1e293b"
          stroke="white"
          strokeWidth={2}
        />
        <text
          x={baseX + 10}
          y={baseY - 8}
          fontSize={9}
          fontWeight={600}
          fill="#1e293b"
        >
          Baseline
        </text>

        {/* Stress arrows + ghost markers */}
        {stressedPositions.map((pos) => {
          const sx = scoreToX(pos.stressedFhs);
          const sy = scoreToY(pos.stressedTrust);
          const dx = sx - baseX;
          const dy = sy - baseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Skip if position hasn't moved meaningfully
          if (dist < 3) return null;

          return (
            <g key={pos.id} data-testid={`stress-marker-${pos.id}`}>
              {/* Arrow from baseline to stressed */}
              <defs>
                <marker
                  id={`arrow-${pos.id}`}
                  viewBox="0 0 10 8"
                  refX={8}
                  refY={4}
                  markerWidth={8}
                  markerHeight={6}
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,4 L0,8 Z" fill={pos.color} />
                </marker>
              </defs>
              <line
                x1={baseX}
                y1={baseY}
                x2={sx}
                y2={sy}
                stroke={pos.color}
                strokeWidth={2}
                strokeDasharray="6 3"
                markerEnd={`url(#arrow-${pos.id})`}
                opacity={0.8}
              />

              {/* Ghost marker at stressed position */}
              <circle
                cx={sx}
                cy={sy}
                r={5}
                fill="none"
                stroke={pos.color}
                strokeWidth={2}
                strokeDasharray="3 2"
              />

              {/* Label */}
              <text
                x={sx + (dx > 0 ? 10 : -10)}
                y={sy + (dy > 0 ? 16 : -8)}
                fontSize={8}
                fontWeight={600}
                fill={pos.color}
                textAnchor={dx > 0 ? "start" : "end"}
              >
                {pos.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Worst-case action summary */}
      <div
        className={`
          mt-4 rounded-lg border-2 p-4 flex items-center justify-between
          ${actionChanged
            ? "border-red-200 bg-red-50"
            : "border-slate-200 bg-slate-50"
          }
        `}
        data-testid="worst-case-summary"
      >
        <div>
          <p className="text-xs font-medium text-slate-500">
            {actionChanged ? "Worst-case action (under stress)" : "Action unchanged under stress"}
          </p>
          <p
            className="text-lg font-bold mt-0.5"
            style={{ color: decisionTokens[worstCase].light }}
            data-testid="worst-case-action"
          >
            {ACTION_LABELS[worstCase]}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500">Baseline</p>
          <p
            className="text-sm font-semibold"
            style={{ color: decisionTokens[baselineCell].light }}
            data-testid="baseline-action"
          >
            {ACTION_LABELS[baselineCell]}
          </p>
        </div>
      </div>

      {/* Scenario detail chips (when enabled) */}
      {stressedPositions.length > 0 && (
        <div className="mt-3 space-y-2" data-testid="scenario-details">
          {stressedPositions.map((pos) => (
            <div
              key={pos.id}
              className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white border border-slate-100"
              data-testid={`scenario-detail-${pos.id}`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: pos.color }}
              />
              <div className="flex-1">
                <span className="font-semibold text-slate-700">{pos.label}</span>
                <span className="text-slate-400 ml-2">{pos.description}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">
                  FHS: {fhs} → {Math.round(pos.stressedFhs)}
                </span>
                <span
                  className="ml-2 font-semibold"
                  style={{ color: decisionTokens[pos.cell].light }}
                >
                  {ACTION_LABELS[pos.cell]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
