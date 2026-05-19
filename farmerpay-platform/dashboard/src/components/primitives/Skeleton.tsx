import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  "data-testid"?: string;
}

const SkeletonBase = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, "data-testid": testId, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="skeleton"
        data-testid={testId}
        aria-hidden="true"
        className={cn(
          "animate-pulse rounded-md bg-muted",
          className,
        )}
        {...props}
      />
    );
  },
);
SkeletonBase.displayName = "Skeleton";

/** Score card skeleton — large circle + text lines */
function SkeletonScore({
  className,
  "data-testid": testId,
  ...props
}: SkeletonProps) {
  return (
    <div
      data-slot="skeleton-score"
      data-testid={testId}
      aria-hidden="true"
      className={cn("flex flex-col items-center gap-3", className)}
      {...props}
    >
      <div className="size-20 animate-pulse rounded-full bg-muted" />
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}
SkeletonScore.displayName = "Skeleton.Score";

/** Table row skeleton */
function SkeletonRow({
  columns = 4,
  className,
  "data-testid": testId,
  ...props
}: SkeletonProps & { columns?: number }) {
  return (
    <div
      data-slot="skeleton-row"
      data-testid={testId}
      aria-hidden="true"
      className={cn("flex gap-4 py-3", className)}
      {...props}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="h-4 flex-1 animate-pulse rounded bg-muted"
        />
      ))}
    </div>
  );
}
SkeletonRow.displayName = "Skeleton.Row";

/** Single table cell skeleton */
function SkeletonCell({
  className,
  "data-testid": testId,
  ...props
}: SkeletonProps) {
  return (
    <div
      data-slot="skeleton-cell"
      data-testid={testId}
      aria-hidden="true"
      className={cn("h-4 w-full animate-pulse rounded bg-muted", className)}
      {...props}
    />
  );
}
SkeletonCell.displayName = "Skeleton.Cell";

/** Compound component with subvariants */
const Skeleton = Object.assign(SkeletonBase, {
  Score: SkeletonScore,
  Row: SkeletonRow,
  Cell: SkeletonCell,
});

export { Skeleton };
