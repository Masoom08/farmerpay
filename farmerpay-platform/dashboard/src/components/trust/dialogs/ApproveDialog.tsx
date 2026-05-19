"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
} from "@/components/primitives";
import { useCibilFlag } from "@/components/trust/context/CibilFlagContext";
import { recordDecision } from "@/lib/trust";

// ─── Types ──────────────────────────────────────────────────────

export interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotUuid: string;
  farmerId: number;
  score: number;
  loanAmountFormatted: string;
  /** Called after successful submission */
  onSuccess?: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export function ApproveDialog({
  open,
  onOpenChange,
  snapshotUuid,
  farmerId,
  score,
  loanAmountFormatted,
  onSuccess,
}: ApproveDialogProps) {
  const { cibilFlag, setAcknowledged } = useCibilFlag();
  const [cibilChecked, setCibilChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = cibilFlag ? cibilChecked : true;

  const handleConfirm = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("fp_token") ?? "";
      await recordDecision(
        {
          snapshotUuid,
          farmerId,
          decision: "SANCTION",
        },
        token,
      );
      if (cibilFlag) {
        setAcknowledged(true);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to record decision";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    snapshotUuid,
    farmerId,
    cibilFlag,
    setAcknowledged,
    onOpenChange,
    onSuccess,
  ]);

  const handleCibilChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCibilChecked(e.target.checked);
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="approve-dialog">
        <DialogHeader>
          <DialogTitle>Approve this KCC application?</DialogTitle>
          <DialogDescription>
            Score {score} clears the Sanction threshold of 600. Approving will
            route the case to disbursement.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Loan amount summary */}
          <p className="text-sm text-foreground">
            Loan amount:{" "}
            <span
              data-testid="approve-loan-amount"
              className="font-semibold"
            >
              {loanAmountFormatted}
            </span>
          </p>

          {/* CIBIL flag checkbox (§1.4) */}
          {cibilFlag && (
            <label
              data-testid="cibil-checkbox-label"
              className={cn(
                "flex items-start gap-2 rounded-md border p-3 text-sm",
                "border-red-200 bg-red-50",
              )}
            >
              <input
                type="checkbox"
                data-testid="cibil-checkbox"
                checked={cibilChecked}
                onChange={handleCibilChange}
                className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-red-800">
                I have reviewed the CIBIL flag.
              </span>
            </label>
          )}

          {/* Error */}
          {error && (
            <p
              data-testid="approve-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            data-testid="approve-cancel-btn"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            data-testid="approve-confirm-btn"
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            loading={submitting}
          >
            Confirm Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ApproveDialog;
