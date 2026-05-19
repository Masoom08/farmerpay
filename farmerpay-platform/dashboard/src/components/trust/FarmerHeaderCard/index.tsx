"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export type AaStatus = "CONNECTED" | "PENDING" | "NONE";
export type CibilStatus = "PULLED" | "STALE" | "NONE";

export interface FarmerHeaderCardProps {
  name: string;
  village: string;
  district: string;
  kccId: string;
  aaStatus: AaStatus;
  aaLastSync?: string;
  cibilStatus: CibilStatus;
  cibilPulledAt?: string;
  lastSathiVisit?: string;
  loanAmountInr: number;
  loanPurpose: string;
}

// ─── Helpers ────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats an INR amount with Indian grouping: ₹ 3,50,000
 */
export function formatInr(amount: number): string {
  return inrFormatter.format(amount);
}

/**
 * Formats an ISO date string as "DD MMM" (e.g. "14 Apr").
 */
function formatDdMmm(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return null;
  }
}

// ─── Badge configs ──────────────────────────────────────────────

const AA_BADGE_CONFIG: Record<AaStatus, { label: string; className: string }> = {
  CONNECTED: {
    label: "AA: Connected",
    className: "bg-brand-primary-100 text-brand-primary-700",
  },
  PENDING: {
    label: "AA: Pending",
    className: "bg-blue-100 text-blue-700",
  },
  NONE: {
    label: "AA: Not linked",
    className: "bg-brand-accent-amber/20 text-neutral-800",
  },
};

const CIBIL_BADGE_CONFIG: Record<CibilStatus, { label: string; className: string }> = {
  PULLED: {
    label: "CIBIL: Pulled",
    className: "bg-brand-primary-100 text-brand-primary-700",
  },
  STALE: {
    label: "CIBIL: Stale",
    className: "bg-brand-accent-amber/20 text-neutral-800",
  },
  NONE: {
    label: "CIBIL: Not pulled",
    className: "bg-blue-100 text-blue-700",
  },
};

// ─── Component ──────────────────────────────────────────────────

const FarmerHeaderCard = React.forwardRef<
  HTMLDivElement,
  FarmerHeaderCardProps & React.HTMLAttributes<HTMLDivElement>
>(
  (
    {
      name,
      village,
      district,
      kccId,
      aaStatus,
      aaLastSync,
      cibilStatus,
      cibilPulledAt,
      lastSathiVisit,
      loanAmountInr,
      loanPurpose,
      className,
      ...props
    },
    ref,
  ) => {
    const aaBadge = AA_BADGE_CONFIG[aaStatus];
    const cibilBadge = CIBIL_BADGE_CONFIG[cibilStatus];
    const aaDate = formatDdMmm(aaLastSync);
    const cibilDate = formatDdMmm(cibilPulledAt);
    const sathiDate = formatDdMmm(lastSathiVisit);

    // Truncate name above 32 chars with ellipsis
    const displayName =
      name.length > 32 ? `${name.slice(0, 32)}\u2026` : name;

    return (
      <Card
        ref={ref}
        role="region"
        aria-label="Farmer header"
        data-testid="farmer-header-card"
        className={cn("min-h-[120px]", className)}
        {...props}
      >
        <CardContent className="flex flex-col gap-2 px-6 py-4">
          {/* ─── Row 1: Name · Village, District · KCC ID ──── */}
          <div className="flex items-baseline gap-1.5 text-base">
            <h2
              className="font-semibold text-foreground"
              data-testid="farmer-name"
              title={name}
            >
              {displayName}
            </h2>
            <span className="text-muted-foreground">&middot;</span>
            <span className="text-muted-foreground">
              {village}, {district}
            </span>
            <span className="text-muted-foreground">&middot;</span>
            <span
              className="font-mono text-sm text-muted-foreground"
              data-testid="kcc-id"
            >
              {kccId}
            </span>
          </div>

          {/* ─── Row 2: Status badges ─────────────────────── */}
          <div
            className="flex flex-wrap items-center gap-3 text-xs"
            data-testid="status-row"
          >
            <StatusBadge
              testId="badge-aa"
              label={aaBadge.label}
              date={aaDate}
              badgeClassName={aaBadge.className}
            />
            <StatusBadge
              testId="badge-cibil"
              label={cibilBadge.label}
              date={cibilDate}
              badgeClassName={cibilBadge.className}
            />
            {sathiDate && (
              <span className="text-muted-foreground" data-testid="sathi-visit">
                Last Sathi visit: {sathiDate}
              </span>
            )}
          </div>

          {/* ─── Row 3: Loan info ─────────────────────────── */}
          <div
            className="text-sm text-muted-foreground"
            data-testid="loan-info"
          >
            Loan applied: {formatInr(loanAmountInr)} &middot; Purpose:{" "}
            {loanPurpose}
          </div>
        </CardContent>
      </Card>
    );
  },
);

FarmerHeaderCard.displayName = "FarmerHeaderCard";

export { FarmerHeaderCard };
export default FarmerHeaderCard;

// ─── Internal Sub-components ────────────────────────────────────

function StatusBadge({
  testId,
  label,
  date,
  badgeClassName,
}: {
  testId: string;
  label: string;
  date: string | null;
  badgeClassName: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeClassName,
      )}
    >
      {label}
      {date && <span className="opacity-70">({date})</span>}
    </span>
  );
}
