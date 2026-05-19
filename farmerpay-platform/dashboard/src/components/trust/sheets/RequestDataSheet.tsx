"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  Button,
} from "@/components/primitives";
import { apiPost } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────

export interface LowConfidencePillar {
  code: string;
  name: string;
  confidence: "MEDIUM" | "LOW";
  score: number;
}

export interface RequestDataSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmerId: number;
  pillars: LowConfidencePillar[];
  /** Called after successful submission */
  onSuccess?: (message: string) => void;
}

// ─── Confidence badge styles ────────────────────────────────────

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string }> = {
  MEDIUM: { bg: "bg-blue-100", text: "text-blue-700" },
  LOW: { bg: "bg-amber-100", text: "text-amber-700" },
};

// ─── Component ──────────────────────────────────────────────────

export function RequestDataSheet({
  open,
  onOpenChange,
  farmerId,
  pillars,
  onSuccess,
}: RequestDataSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = selected.size > 0;

  const togglePillar = useCallback((code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("fp_token") ?? "";
      await apiPost(
        `/trust/farmer/${farmerId}/request-data`,
        { pillarCodes: Array.from(selected) },
        token,
      );
      onOpenChange(false);
      onSuccess?.(
        "Sathi task created. Ramesh will get a visit scheduled.",
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create task";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, farmerId, selected, onOpenChange, onSuccess]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="request-data-sheet"
      >
        <SheetHeader>
          <SheetTitle>Request more data</SheetTitle>
          <SheetDescription>
            Select pillars with low confidence to request a Sathi field visit.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4" role="group" aria-label="Low-confidence pillars">
          {pillars.length === 0 && (
            <p
              data-testid="no-pillars"
              className="py-4 text-center text-sm text-muted-foreground"
            >
              All pillars have high confidence.
            </p>
          )}

          {pillars.map((p) => {
            const isSelected = selected.has(p.code);
            const confStyle = CONFIDENCE_STYLES[p.confidence] ?? {
              bg: "bg-neutral-100",
              text: "text-neutral-700",
            };

            return (
              <label
                key={p.code}
                data-testid={`pillar-option-${p.code}`}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm cursor-pointer transition-colors",
                  isSelected
                    ? "border-brand-primary-300 bg-brand-primary-50"
                    : "border-border bg-background hover:bg-muted/50",
                )}
              >
                <input
                  type="checkbox"
                  data-testid={`pillar-check-${p.code}`}
                  checked={isSelected}
                  onChange={() => togglePillar(p.code)}
                  className="h-4 w-4 rounded border-border text-brand-primary-600 focus:ring-brand-primary-500"
                />
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">
                      {p.code}
                    </span>
                    <span className="ml-1.5 text-muted-foreground">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {p.score}/100
                    </span>
                    <span
                      data-testid={`confidence-${p.code}`}
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                        confStyle.bg,
                        confStyle.text,
                      )}
                    >
                      {p.confidence}
                    </span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <p
            data-testid="request-error"
            className="mx-4 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <SheetFooter>
          <Button
            variant="ghost"
            data-testid="request-cancel-btn"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            data-testid="request-submit-btn"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            loading={submitting}
          >
            Create Sathi task ({selected.size})
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default RequestDataSheet;
