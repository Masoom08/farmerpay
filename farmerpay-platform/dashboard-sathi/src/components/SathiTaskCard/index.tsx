"use client";

/**
 * SathiTaskCard — Individual task card for the Sathi queue (G3 — Spec §5.2 + §5.5).
 *
 * Displays: farmer name, village, due date, reason label, status badge.
 * Sub-line copy: "{village} · due {date}" (§5.5).
 *
 * REASON ENUM (§5.5 whitelist — §5.6: never computed from score deltas):
 *   HOUSEHOLD_REFRESH   → "Household data needs refresh"
 *   LAND_EXPIRES        → "Land record expires"
 *   INSURANCE_MISSING   → "Insurance cert missing"
 *   PHOTO_GEOTAG_NEEDED → "Photo + geotag needed"
 *   FARMER_REQUESTED    → "Farmer requested a visit"
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ─── Reason enum ──────────────────────────────────────────

export const REASON_CODES = [
  "HOUSEHOLD_REFRESH",
  "LAND_EXPIRES",
  "INSURANCE_MISSING",
  "PHOTO_GEOTAG_NEEDED",
  "FARMER_REQUESTED",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

/** Human-readable labels for each reason code (i18n-ready key map). */
export const REASON_LABELS: Record<ReasonCode, string> = {
  HOUSEHOLD_REFRESH: "Household data needs refresh",
  LAND_EXPIRES: "Land record expires",
  INSURANCE_MISSING: "Insurance cert missing",
  PHOTO_GEOTAG_NEEDED: "Photo + geotag needed",
  FARMER_REQUESTED: "Farmer requested a visit",
};

/**
 * Resolve a reason code to its human label.
 * Unknown codes trigger a dev-only console.error and return a fallback.
 */
export function resolveReasonLabel(reason: string): string {
  if (reason in REASON_LABELS) {
    return REASON_LABELS[reason as ReasonCode];
  }
  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[SathiTaskCard] Unknown reason code: "${reason}". ` +
        `Must be one of: ${REASON_CODES.join(", ")}`,
    );
  }
  return reason;
}

// ─── Status helpers ───────────────────────────────────────

export type TaskStatus = "pending" | "completed" | "in_progress";

function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "completed":
      return "Done";
    case "in_progress":
      return "In Progress";
    default:
      return status;
  }
}

function statusVariant(
  status: TaskStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
}

// ─── Date formatting ──────────────────────────────────────

function formatDueDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

// ─── Component ────────────────────────────────────────────

export interface SathiTaskCardProps {
  id: string;
  farmerName: string;
  village: string;
  dueDate: string;
  reason: string;
  status: TaskStatus;
  onTap?: (id: string) => void;
}

export default function SathiTaskCard({
  id,
  farmerName,
  village,
  dueDate,
  reason,
  status,
  onTap,
}: SathiTaskCardProps) {
  const label = resolveReasonLabel(reason);

  return (
    <Card
      data-testid="sathi-task-card"
      data-task-id={id}
      size="sm"
      className={onTap ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : ""}
      onClick={onTap ? () => onTap(id) : undefined}
    >
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          {/* Left: farmer info */}
          <div className="flex flex-col gap-1 min-w-0">
            <span
              className="text-sm font-semibold truncate"
              data-testid="task-card-farmer"
            >
              {farmerName}
            </span>
            <span
              className="text-xs text-muted-foreground"
              data-testid="task-card-sub"
            >
              {village} &middot; due {formatDueDate(dueDate)}
            </span>
            <span
              className="text-xs text-muted-foreground mt-0.5"
              data-testid="task-card-reason"
            >
              {label}
            </span>
          </div>

          {/* Right: status badge */}
          <Badge
            variant={statusVariant(status)}
            data-testid="task-card-status"
            className="shrink-0 mt-0.5"
          >
            {statusLabel(status)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
