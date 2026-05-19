/**
 * DecisioningMatrix — 2x2 TRUST x FHS decisioning grid.
 *
 * Pure SVG. No new charting dependencies.
 * Keyboard-navigable (arrow keys). Screen-reader accessible.
 * Uses decision.* tokens from design-tokens.ts.
 *
 * Design source: DESIGN-SYSTEM-SCORE-DISPLAY.md § Pattern 3
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { decisionTokens, type DecisionAction } from "@/lib/design-tokens";

// ─── Types ────────────────────────────────────────────────────────

export interface ProductConfig {
  ticket?: string;
  rate?: string;
  tenor?: string;
  note?: string;
}

export interface DecisioningMatrixProps {
  /** TRUST score 0-100 */
  trust: number;
  /** FHS score 0-100 */
  fhs: number;
  /** TRUST threshold — above = High, below = Low */
  trustCutoff: number;
  /** FHS threshold — above = High, below = Low */
  fhsCutoff: number;
  /** Pre-computed cell from the backend */
  cell: DecisionAction;
  /** Optional product configuration per cell */
  productConfig?: Partial<Record<DecisionAction, ProductConfig>>;
  /** Width of the SVG (height derived automatically) */
  width?: number;
}

// ─── Cell layout ──────────────────────────────────────────────────

interface CellDef {
  action: DecisionAction;
  label: string;
  subtitle: string;
  trustLabel: string;
  fhsLabel: string;
  /** Grid position: [row, col] — row 0 = top (High TRUST), col 0 = left (Low FHS) */
  row: number;
  col: number;
}

const CELLS: CellDef[] = [
  {
    action: "conditional",
    label: "Conditional Approve",
    subtitle: "Cash-flow coaching",
    trustLabel: "High",
    fhsLabel: "Low",
    row: 0,
    col: 0,
  },
  {
    action: "approve",
    label: "Approve",
    subtitle: "Standard terms",
    trustLabel: "High",
    fhsLabel: "High",
    row: 0,
    col: 1,
  },
  {
    action: "decline",
    label: "Decline",
    subtitle: "Coaching path + re-apply",
    trustLabel: "Low",
    fhsLabel: "Low",
    row: 1,
    col: 0,
  },
  {
    action: "refer",
    label: "Refer for Review",
    subtitle: "Verify first",
    trustLabel: "Low",
    fhsLabel: "High",
    row: 1,
    col: 1,
  },
];

// ─── Token colors ─────────────────────────────────────────────────

const CELL_FILL: Record<DecisionAction, { bg: string; fg: string; bgActive: string }> = {
  approve:     { bg: "#e8f5e9", fg: decisionTokens.approve.light,     bgActive: "#c8e6c9" },
  conditional: { bg: "#fff8e1", fg: decisionTokens.conditional.light,  bgActive: "#ffecb3" },
  refer:       { bg: "#e3f2fd", fg: decisionTokens.refer.light,        bgActive: "#bbdefb" },
  decline:     { bg: "#f5f5f5", fg: decisionTokens.decline.light,      bgActive: "#e0e0e0" },
};

// ─── Navigation helpers ───────────────────────────────────────────

/** Map [row, col] to cell index */
function cellAt(row: number, col: number): number {
  return CELLS.findIndex((c) => c.row === row && c.col === col);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ─── Component ────────────────────────────────────────────────────

export default function DecisioningMatrix({
  trust,
  fhs,
  trustCutoff,
  fhsCutoff,
  cell: activeCell,
  productConfig,
  width = 480,
}: DecisioningMatrixProps) {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const cellRefs = useRef<(SVGGElement | null)[]>([]);

  // Layout constants
  const AXIS_LABEL_W = 40;
  const AXIS_LABEL_H = 32;
  const PADDING = 8;
  const gridW = width - AXIS_LABEL_W - PADDING * 2;
  const cellW = gridW / 2;
  const cellH = 120;
  const totalH = cellH * 2 + AXIS_LABEL_H + PADDING * 2;
  const gridX = AXIS_LABEL_W + PADDING;
  const gridY = PADDING;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (focusedIdx == null) return;
      const current = CELLS[focusedIdx];
      let nextRow = current.row;
      let nextCol = current.col;

      switch (e.key) {
        case "ArrowUp":
          nextRow = clamp(current.row - 1, 0, 1);
          break;
        case "ArrowDown":
          nextRow = clamp(current.row + 1, 0, 1);
          break;
        case "ArrowLeft":
          nextCol = clamp(current.col - 1, 0, 1);
          break;
        case "ArrowRight":
          nextCol = clamp(current.col + 1, 0, 1);
          break;
        default:
          return;
      }

      e.preventDefault();
      const nextIdx = cellAt(nextRow, nextCol);
      if (nextIdx >= 0) {
        setFocusedIdx(nextIdx);
        cellRefs.current[nextIdx]?.focus();
      }
    },
    [focusedIdx],
  );

  return (
    <div
      role="group"
      aria-label="Loan decisioning matrix — TRUST vs Financial Health"
      className="inline-block"
    >
      <svg
        width={width}
        height={totalH}
        viewBox={`0 0 ${width} ${totalH}`}
        aria-hidden="false"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {/* ── Y-axis: TRUST label ── */}
        <text
          x={PADDING}
          y={gridY + cellH}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontWeight={600}
          fill="#64748b"
          transform={`rotate(-90, ${PADDING + 8}, ${gridY + cellH})`}
        >
          TRUST ↑
        </text>

        {/* Y-axis band labels */}
        <text
          x={AXIS_LABEL_W - 4}
          y={gridY + cellH / 2}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={10}
          fill="#94a3b8"
        >
          High ≥{trustCutoff}
        </text>
        <text
          x={AXIS_LABEL_W - 4}
          y={gridY + cellH + cellH / 2}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={10}
          fill="#94a3b8"
        >
          Low &lt;{trustCutoff}
        </text>

        {/* ── X-axis: FHS label ── */}
        <text
          x={gridX + gridW / 2}
          y={gridY + cellH * 2 + AXIS_LABEL_H - 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="#64748b"
        >
          Financial Health →
        </text>

        {/* X-axis band labels */}
        <text
          x={gridX + cellW / 2}
          y={gridY + cellH * 2 + 14}
          textAnchor="middle"
          fontSize={10}
          fill="#94a3b8"
        >
          Low &lt;{fhsCutoff}
        </text>
        <text
          x={gridX + cellW + cellW / 2}
          y={gridY + cellH * 2 + 14}
          textAnchor="middle"
          fontSize={10}
          fill="#94a3b8"
        >
          High ≥{fhsCutoff}
        </text>

        {/* ── Threshold lines ── */}
        {/* Horizontal — TRUST cutoff */}
        <line
          x1={gridX}
          y1={gridY + cellH}
          x2={gridX + gridW}
          y2={gridY + cellH}
          stroke="#cbd5e1"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        {/* Vertical — FHS cutoff */}
        <line
          x1={gridX + cellW}
          y1={gridY}
          x2={gridX + cellW}
          y2={gridY + cellH * 2}
          stroke="#cbd5e1"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* ── Grid cells ── */}
        {CELLS.map((def, idx) => {
          const x = gridX + def.col * cellW;
          const y = gridY + def.row * cellH;
          const colors = CELL_FILL[def.action];
          const isActive = def.action === activeCell;
          const isFocused = focusedIdx === idx;
          const config = productConfig?.[def.action];

          const ariaLabel = [
            `${def.trustLabel} TRUST, ${def.fhsLabel} Financial Health:`,
            def.label,
            def.subtitle,
            config?.note ? `— ${config.note}` : "",
            isActive ? "(current position)" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <g
              key={def.action}
              ref={(el) => { cellRefs.current[idx] = el; }}
              role="gridcell"
              aria-label={ariaLabel}
              aria-selected={isActive}
              tabIndex={isFocused || (focusedIdx == null && idx === 0) ? 0 : -1}
              onFocus={() => setFocusedIdx(idx)}
              onKeyDown={handleKeyDown}
              data-testid={`matrix-cell-${def.action}`}
              data-cell={def.action}
              data-active={isActive}
            >
              {/* Cell background */}
              <rect
                x={x + 2}
                y={y + 2}
                width={cellW - 4}
                height={cellH - 4}
                rx={8}
                fill={isActive ? colors.bgActive : colors.bg}
                stroke={isActive ? colors.fg : "transparent"}
                strokeWidth={isActive ? 2.5 : 0}
              />

              {/* Focus ring */}
              {isFocused && (
                <rect
                  x={x}
                  y={y}
                  width={cellW}
                  height={cellH}
                  rx={10}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
              )}

              {/* Action label */}
              <text
                x={x + cellW / 2}
                y={y + 36}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={colors.fg}
              >
                {def.label}
              </text>

              {/* Subtitle / product guidance */}
              <text
                x={x + cellW / 2}
                y={y + 54}
                textAnchor="middle"
                fontSize={10}
                fill={colors.fg}
                opacity={0.7}
              >
                {def.subtitle}
              </text>

              {/* Product config (if provided) */}
              {config && (
                <>
                  {config.ticket && (
                    <text
                      x={x + cellW / 2}
                      y={y + 76}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#64748b"
                    >
                      Ticket: {config.ticket}
                    </text>
                  )}
                  {config.tenor && (
                    <text
                      x={x + cellW / 2}
                      y={y + 90}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#64748b"
                    >
                      Tenor: {config.tenor}
                    </text>
                  )}
                </>
              )}

              {/* Active marker (current position) */}
              {isActive && (
                <>
                  <circle
                    cx={x + cellW / 2}
                    cy={y + cellH - 18}
                    r={5}
                    fill={colors.fg}
                  />
                  <text
                    x={x + cellW / 2 + 10}
                    y={y + cellH - 14}
                    fontSize={9}
                    fontWeight={600}
                    fill={colors.fg}
                  >
                    Current
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* ── Score position marker ── */}
        {trust >= 0 && fhs >= 0 && (
          <ScoreMarker
            trust={trust}
            fhs={fhs}
            trustCutoff={trustCutoff}
            fhsCutoff={fhsCutoff}
            gridX={gridX}
            gridY={gridY}
            gridW={gridW}
            cellH={cellH}
          />
        )}
      </svg>
    </div>
  );
}

// ─── Score position marker ────────────────────────────────────────

function ScoreMarker({
  trust,
  fhs,
  trustCutoff,
  fhsCutoff,
  gridX,
  gridY,
  gridW,
  cellH,
}: {
  trust: number;
  fhs: number;
  trustCutoff: number;
  fhsCutoff: number;
  gridX: number;
  gridY: number;
  gridW: number;
  cellH: number;
}) {
  // Map scores to pixel positions within the grid
  // X: FHS 0→100 maps to gridX → gridX + gridW
  const px = gridX + (fhs / 100) * gridW;
  // Y: TRUST 100→0 maps to gridY → gridY + cellH*2 (high trust at top)
  const py = gridY + ((100 - trust) / 100) * cellH * 2;

  return (
    <g aria-label={`Score position: TRUST ${trust}, Financial Health ${fhs}`}>
      {/* Crosshair */}
      <line
        x1={px - 6}
        y1={py}
        x2={px + 6}
        y2={py}
        stroke="#1e293b"
        strokeWidth={1.5}
      />
      <line
        x1={px}
        y1={py - 6}
        x2={px}
        y2={py + 6}
        stroke="#1e293b"
        strokeWidth={1.5}
      />
      {/* Dot */}
      <circle cx={px} cy={py} r={4} fill="#1e293b" />
      {/* Tooltip */}
      <rect
        x={px + 8}
        y={py - 18}
        width={74}
        height={24}
        rx={4}
        fill="#1e293b"
        opacity={0.9}
      />
      <text
        x={px + 14}
        y={py - 2}
        fontSize={9}
        fontWeight={600}
        fill="white"
      >
        T:{trust} F:{fhs}
      </text>
    </g>
  );
}
