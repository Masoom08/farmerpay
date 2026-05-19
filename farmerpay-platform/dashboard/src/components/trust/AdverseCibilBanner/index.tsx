"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCibilFlag } from "@/components/trust/context/CibilFlagContext";

// ─── INR formatter ──────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ─── Component ──────────────────────────────────────────────────

export interface AdverseCibilBannerProps {
  className?: string;
}

/**
 * Adverse CIBIL banner — renders above the score hero when `cibilFlag=true`.
 *
 * Copy per spec §1.4:
 *   "CIBIL flag: ₹{amount} overdue on {issuer}. Review before approving."
 *
 * Uses `role="alert"` so screen readers announce it immediately.
 * Approve is NOT disabled — the confirmation dialog checkbox (C12) handles acknowledgement.
 */
export function AdverseCibilBanner({ className }: AdverseCibilBannerProps) {
  const { cibilFlag, overdueInr, issuer } = useCibilFlag();

  if (!cibilFlag) return null;

  const formattedAmount =
    overdueInr != null ? inrFormatter.format(overdueInr) : "—";
  const issuerText = issuer ?? "unknown issuer";

  return (
    <div
      role="alert"
      data-testid="adverse-cibil-banner"
      className={cn(
        "flex items-center gap-3 rounded-lg border border-decision-reject/30 bg-decision-reject/10 px-4 py-3",
        className,
      )}
    >
      <AlertTriangle
        className="size-5 shrink-0 text-decision-reject"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-decision-reject">
        CIBIL flag: {formattedAmount} overdue on {issuerText}. Review before
        approving.
      </p>
    </div>
  );
}

export default AdverseCibilBanner;
