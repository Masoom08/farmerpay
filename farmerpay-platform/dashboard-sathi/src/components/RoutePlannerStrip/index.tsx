"use client";

/**
 * RoutePlannerStrip — Ordered village route for the Sathi's daily plan (G3 — Spec §5.2).
 *
 * Renders a horizontal strip: Village A → Village B → Village C
 * Each village shows its pending task count.
 *
 * Villages are ordered by the caller (typically by task count desc).
 */

export interface VillageStop {
  village: string;
  pendingCount: number;
}

export interface RoutePlannerStripProps {
  stops: VillageStop[];
}

export default function RoutePlannerStrip({ stops }: RoutePlannerStripProps) {
  if (stops.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
      data-testid="route-planner-strip"
    >
      <span className="shrink-0 font-medium text-muted-foreground">
        Route:
      </span>
      {stops.map((stop, i) => (
        <span key={stop.village} className="flex items-center gap-2">
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
            data-testid="route-stop"
          >
            <span data-testid="route-stop-village">{stop.village}</span>
            <span
              className="text-emerald-600"
              data-testid="route-stop-count"
            >
              ({stop.pendingCount})
            </span>
          </span>
          {i < stops.length - 1 && (
            <span className="text-muted-foreground" aria-hidden="true">
              &rarr;
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
