import { Skeleton } from "@/components/primitives/Skeleton";

/**
 * Instant loading state for the TRUST Sanction Review page.
 *
 * Mirrors the 4-block layout from spec section 1.1:
 *   1. FarmerHeaderCard   (120px)
 *   2. ScoreHero (5 col) + PillarConstellation (7 col)  (360px)
 *   3. Table-2 strip      (120px)
 *   4. TabShell + content  (48px + 560px)
 *   5. StickyFooter        (80px)
 */
export default function TrustReviewLoading() {
  return (
    <div data-testid="trust-review-loading" className="flex flex-col gap-6 pb-24">
      {/* ─── Breadcrumb skeleton (40px) ────────────────────── */}
      <div className="flex h-10 items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* ─── FarmerHeaderCard skeleton (120px) ─────────────── */}
      <div className="flex h-[120px] items-center gap-6 rounded-lg border border-border bg-card p-6">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* ─── Score hero (5 col) + PillarConstellation (7 col) ── */}
      <div className="grid grid-cols-12 gap-6" style={{ minHeight: 360 }}>
        {/* Score hero — 5 cols */}
        <div className="col-span-5 flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-6">
          <Skeleton.Score data-testid="skeleton-score" />
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Pillar constellation — 7 cols */}
        <div className="col-span-7 flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1 rounded-full" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Table-2 strip (120px) ────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-6" style={{ minHeight: 120 }}>
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="flex flex-col gap-2">
          <Skeleton.Row columns={4} />
          <Skeleton.Row columns={4} />
          <Skeleton.Row columns={4} />
        </div>
      </div>

      {/* ─── Tab shell (48px) + panel placeholder (560px) ── */}
      <div>
        <div className="flex h-12 items-center gap-4 border-b border-border">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex flex-col gap-4 pt-6" style={{ minHeight: 560 }}>
          <Skeleton.Row columns={5} />
          <Skeleton.Row columns={5} />
          <Skeleton.Row columns={5} />
          <Skeleton.Row columns={5} />
          <Skeleton.Row columns={5} />
        </div>
      </div>

      {/* ─── Sticky footer skeleton (80px) ─────────────────── */}
      <div
        data-testid="sticky-footer"
        className="sticky bottom-0 z-10 flex h-20 items-center justify-between border-t border-border bg-background px-6"
      >
        <Skeleton className="h-10 w-32" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}
