"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives";
import { ApproveDialog } from "@/components/trust/dialogs/ApproveDialog";
import { RejectDialog } from "@/components/trust/dialogs/RejectDialog";
import {
  RequestDataSheet,
  type LowConfidencePillar,
} from "@/components/trust/sheets/RequestDataSheet";

// ─── Types ──────────────────────────────────────────────────────

export interface FooterActionsProps {
  snapshotUuid: string;
  farmerId: number;
  score: number;
  /** e.g. "₹3,50,000" */
  loanAmountFormatted: string;
  /** When INCOMPLETE, swap to "Request Sathi visit" only */
  snapshotStatus: "COMPLETE" | "INCOMPLETE";
  /** Low-confidence pillars for RequestDataSheet */
  lowConfidencePillars: LowConfidencePillar[];
  /** Callback after any action succeeds */
  onActionComplete?: (action: string, message: string) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function FooterActions({
  snapshotUuid,
  farmerId,
  score,
  loanAmountFormatted,
  snapshotStatus,
  lowConfidencePillars,
  onActionComplete,
  className,
}: FooterActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const handleApproveSuccess = useCallback(() => {
    onActionComplete?.(
      "SANCTION",
      "Sanction recorded. Case routed to disbursement.",
    );
  }, [onActionComplete]);

  const handleRejectSuccess = useCallback(() => {
    onActionComplete?.("REJECT", "Rejection recorded.");
  }, [onActionComplete]);

  const handleRequestSuccess = useCallback(
    (message: string) => {
      onActionComplete?.("REQUEST_DATA", message);
    },
    [onActionComplete],
  );

  const isComplete = snapshotStatus === "COMPLETE";

  return (
    <>
      <footer
        data-testid="footer-actions"
        className={cn(
          "sticky bottom-0 z-40 flex items-center justify-end gap-3",
          "border-t bg-background/95 px-6 py-3 backdrop-blur supports-backdrop-filter:bg-background/80",
          className,
        )}
        role="toolbar"
        aria-label="Decision actions"
      >
        {isComplete ? (
          <>
            {/* Reject */}
            <Button
              variant="destructive"
              data-testid="footer-reject-btn"
              onClick={() => setRejectOpen(true)}
            >
              Reject with reason
            </Button>

            {/* Request more data */}
            <Button
              variant="secondary"
              data-testid="footer-request-btn"
              onClick={() => setRequestOpen(true)}
            >
              Request more data
            </Button>

            {/* Approve */}
            <Button
              variant="primary"
              data-testid="footer-approve-btn"
              onClick={() => setApproveOpen(true)}
            >
              Approve {loanAmountFormatted}
            </Button>
          </>
        ) : (
          /* INCOMPLETE snapshot — only show request visit */
          <Button
            variant="primary"
            data-testid="footer-request-visit-btn"
            onClick={() => setRequestOpen(true)}
          >
            Request Sathi visit
          </Button>
        )}
      </footer>

      {/* ─── Dialogs / Sheets ─────────────────────── */}

      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        snapshotUuid={snapshotUuid}
        farmerId={farmerId}
        score={score}
        loanAmountFormatted={loanAmountFormatted}
        onSuccess={handleApproveSuccess}
      />

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        snapshotUuid={snapshotUuid}
        farmerId={farmerId}
        onSuccess={handleRejectSuccess}
      />

      <RequestDataSheet
        open={requestOpen}
        onOpenChange={setRequestOpen}
        farmerId={farmerId}
        pillars={lowConfidencePillars}
        onSuccess={handleRequestSuccess}
      />
    </>
  );
}

export default FooterActions;
