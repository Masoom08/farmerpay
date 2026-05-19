"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { buildCsvString, downloadCsv, type CsvAuditRow } from "./exportCsv";

// ─── Types ──────────────────────────────────────────────────────

export interface AuditEvent {
  eventUuid: string;
  actorType: "BANKER" | "SATHI" | "SYSTEM";
  actorName?: string;
  action: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface AuditTrailProps {
  events: AuditEvent[];
  exportable?: boolean;
  /** Farmer ID used in the CSV filename */
  farmerId?: string;
  className?: string;
}

// ─── Actor icon + colours ───────────────────────────────────────

const ACTOR_CONFIG: Record<
  AuditEvent["actorType"],
  { icon: string; label: string; bg: string; text: string }
> = {
  BANKER: {
    icon: "🏦",
    label: "Banker",
    bg: "bg-brand-primary-100",
    text: "text-brand-primary-700",
  },
  SATHI: {
    icon: "🤝",
    label: "Sathi",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  SYSTEM: {
    icon: "⚙️",
    label: "System",
    bg: "bg-neutral-100",
    text: "text-neutral-700",
  },
};

// ─── Helpers ────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Component ──────────────────────────────────────────────────

export function AuditTrail({
  events,
  exportable = false,
  farmerId,
  className,
}: AuditTrailProps) {
  const [expandedUuids, setExpandedUuids] = useState<Set<string>>(new Set());

  // Sort newest-first
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [events],
  );

  const toggleRow = useCallback((uuid: string) => {
    setExpandedUuids((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    const rows: CsvAuditRow[] = sorted.map((e) => ({
      eventUuid: e.eventUuid,
      actorType: e.actorType,
      actorName: e.actorName,
      action: e.action,
      createdAt: e.createdAt,
      payload: e.payload,
    }));
    downloadCsv(rows, farmerId);
  }, [sorted, farmerId]);

  return (
    <div
      data-testid="audit-trail"
      className={cn("flex flex-col gap-3", className)}
    >
      {/* ─── Header with export button ─────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Audit Trail</h3>
        {exportable && (
          <button
            type="button"
            data-testid="export-csv-btn"
            onClick={handleExport}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
              "bg-brand-primary-100 text-brand-primary-700",
              "transition-colors hover:bg-brand-primary-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <span aria-hidden="true">↓</span>
            Export CSV
          </button>
        )}
      </div>

      {/* ─── Event list ────────────────────────────── */}
      <div
        className="flex flex-col gap-1.5"
        role="list"
        aria-label="Audit events"
      >
        {sorted.map((event) => {
          const config = ACTOR_CONFIG[event.actorType];
          const isExpanded = expandedUuids.has(event.eventUuid);
          const hasPayload =
            event.payload != null && Object.keys(event.payload).length > 0;

          return (
            <div
              key={event.eventUuid}
              data-testid={`audit-row-${event.eventUuid}`}
              role="listitem"
              className="rounded-md bg-muted/40"
            >
              {/* Main row */}
              <div className="flex items-center gap-3 px-3 py-2 text-xs">
                {/* Actor icon + badge */}
                <span
                  data-testid={`actor-icon-${event.eventUuid}`}
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px]",
                    config.bg,
                  )}
                  aria-label={config.label}
                  role="img"
                >
                  {config.icon}
                </span>

                {/* Actor name */}
                <span
                  data-testid={`actor-name-${event.eventUuid}`}
                  className={cn("shrink-0 font-medium", config.text)}
                >
                  {event.actorName ?? config.label}
                </span>

                {/* Action */}
                <span className="text-foreground">{event.action}</span>

                {/* Timestamp */}
                <span
                  data-testid={`timestamp-${event.eventUuid}`}
                  className="ml-auto shrink-0 text-muted-foreground"
                >
                  {formatDateTime(event.createdAt)}
                </span>

                {/* Expand toggle (only if payload exists) */}
                {hasPayload && (
                  <button
                    type="button"
                    data-testid={`expand-btn-${event.eventUuid}`}
                    aria-expanded={isExpanded}
                    aria-controls={`payload-${event.eventUuid}`}
                    onClick={() => toggleRow(event.eventUuid)}
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground",
                      "transition-transform duration-200",
                      "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isExpanded && "rotate-180",
                    )}
                  >
                    <span aria-hidden="true" className="text-[10px]">
                      ▼
                    </span>
                  </button>
                )}
              </div>

              {/* Expandable payload */}
              {hasPayload && (
                <div
                  id={`payload-${event.eventUuid}`}
                  data-testid={`payload-${event.eventUuid}`}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-in-out",
                    isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <pre
                      className={cn(
                        "mx-3 mb-2 rounded bg-muted p-2 text-[10px] leading-relaxed text-muted-foreground",
                        "overflow-x-auto",
                      )}
                    >
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {events.length === 0 && (
          <p
            data-testid="audit-empty"
            className="py-8 text-center text-sm text-muted-foreground"
          >
            No audit events recorded.
          </p>
        )}
      </div>
    </div>
  );
}

export { buildCsvString, downloadCsv } from "./exportCsv";
export default AuditTrail;
