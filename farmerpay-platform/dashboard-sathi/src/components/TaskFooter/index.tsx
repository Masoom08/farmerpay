"use client";

/**
 * TaskFooter — Navigation footer for the task capture flow (G4 — Spec §5.3).
 *
 * Previous / Next / Submit buttons.
 * Submit is shown on the last step.
 */

export interface TaskFooterProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}

export default function TaskFooter({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  submitting = false,
}: TaskFooterProps) {
  const isFirst = currentStep <= 1;
  const isLast = currentStep >= totalSteps;

  return (
    <div
      className="flex items-center justify-between border-t border-border pt-4"
      data-testid="task-footer"
    >
      <button
        type="button"
        className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onPrevious}
        disabled={isFirst}
        data-testid="footer-previous"
      >
        Previous
      </button>

      {isLast ? (
        <button
          type="button"
          className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          onClick={onSubmit}
          disabled={submitting}
          data-testid="footer-submit"
        >
          {submitting ? "Saving..." : "Submit"}
        </button>
      ) : (
        <button
          type="button"
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          onClick={onNext}
          data-testid="footer-next"
        >
          Next
        </button>
      )}
    </div>
  );
}
