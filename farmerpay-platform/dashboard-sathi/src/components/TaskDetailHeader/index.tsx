"use client";

/**
 * TaskDetailHeader — Header for the task capture flow (G4 — Spec §5.3).
 *
 * Shows farmer name, village, due date, and checklist progress (X / Y).
 */

export interface TaskDetailHeaderProps {
  farmerName: string;
  village: string;
  dueDate: string;
  currentStep: number;
  totalSteps: number;
}

function formatDueDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export default function TaskDetailHeader({
  farmerName,
  village,
  dueDate,
  currentStep,
  totalSteps,
}: TaskDetailHeaderProps) {
  const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div className="flex flex-col gap-2" data-testid="task-detail-header">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1
            className="text-lg font-semibold"
            data-testid="task-header-farmer"
          >
            {farmerName}
          </h1>
          <p
            className="text-sm text-muted-foreground"
            data-testid="task-header-sub"
          >
            {village} &middot; due {formatDueDate(dueDate)}
          </p>
        </div>
        <span
          className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums"
          data-testid="task-header-progress"
        >
          {currentStep} / {totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        data-testid="task-progress-track"
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
          style={{ width: pct + "%" }}
          data-testid="task-progress-bar"
        />
      </div>
    </div>
  );
}
