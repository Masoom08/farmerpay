"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
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
import { recordDecision } from "@/lib/trust";

// ─── Types ──────────────────────────────────────────────────────

export interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotUuid: string;
  farmerId: number;
  /** Called after successful submission */
  onSuccess?: () => void;
}

// ─── Reason codes (from B2 enum) ────────────────────────────────

export const REJECT_REASONS = [
  { code: "SCORE_BELOW_THRESHOLD", label: "Score below threshold" },
  { code: "ADVERSE_CIBIL", label: "Adverse CIBIL signal" },
  { code: "FIELD_VERIFICATION_PENDING", label: "Field verification pending" },
  { code: "POLICY_EXCEPTION", label: "Policy exception" },
  { code: "OTHER", label: "Other" },
] as const;

export type RejectReasonCode = (typeof REJECT_REASONS)[number]["code"];

const MIN_CHARS = 40;

// ─── Component ──────────────────────────────────────────────────

export function RejectDialog({
  open,
  onOpenChange,
  snapshotUuid,
  farmerId,
  onSuccess,
}: RejectDialogProps) {
  const [reasonCode, setReasonCode] = useState<RejectReasonCode | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = notes.length;
  const canSubmit = reasonCode !== "" && charCount >= MIN_CHARS;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("fp_token") ?? "";
      await recordDecision(
        {
          snapshotUuid,
          farmerId,
          decision: "REJECT",
          notes: `[${reasonCode}] ${notes}`,
        },
        token,
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to record decision";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, snapshotUuid, farmerId, reasonCode, notes, onOpenChange, onSuccess]);

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReasonCode(e.target.value as RejectReasonCode);
    },
    [],
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
    },
    [],
  );

  const charsRemaining = MIN_CHARS - charCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="reject-dialog">
        <DialogHeader>
          <DialogTitle>Reject with reason</DialogTitle>
          <DialogDescription>
            Select a reason and provide details (minimum {MIN_CHARS} characters).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Reason radio list */}
          <fieldset data-testid="reason-radios" className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground mb-1">
              Rejection reason
            </legend>
            {REJECT_REASONS.map((r) => (
              <label
                key={r.code}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                  reasonCode === r.code
                    ? "border-red-300 bg-red-50 text-red-900"
                    : "border-border bg-background text-foreground hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="reject-reason"
                  value={r.code}
                  checked={reasonCode === r.code}
                  onChange={handleReasonChange}
                  data-testid={`reason-${r.code}`}
                  className="h-4 w-4 text-red-600 focus:ring-red-500"
                />
                {r.label}
              </label>
            ))}
          </fieldset>

          {/* Notes textarea with char counter */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reject-notes"
              className="text-sm font-medium text-foreground"
            >
              Details
            </label>
            <textarea
              id="reject-notes"
              data-testid="reject-notes"
              value={notes}
              onChange={handleNotesChange}
              rows={3}
              placeholder="Explain the reason for rejection…"
              className={cn(
                "w-full rounded-md border px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "placeholder:text-muted-foreground",
              )}
            />
            <div className="flex items-center justify-between">
              <span
                data-testid="char-counter"
                className={cn(
                  "text-xs",
                  charsRemaining > 0
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {charCount}/{MIN_CHARS} characters
                {charsRemaining > 0 && ` (${charsRemaining} more needed)`}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              data-testid="reject-error"
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
            data-testid="reject-cancel-btn"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            data-testid="reject-submit-btn"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            loading={submitting}
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RejectDialog;
