"use client";

/**
 * EmptyState — Desktop empty-state library (H2 — Spec §6.2).
 *
 * 5 pre-composed variants:
 *   1. NO_TASKS       — "No tasks for today. Great job!"
 *   2. NO_FARMERS      — "No farmers assigned yet."
 *   3. NO_DATA         — "No data collected yet."
 *   4. NO_NOTIFICATIONS — "No notifications right now."
 *   5. NO_RESULTS      — "No results found."
 *
 * Each variant has:
 *   - SVG illustration (inline, lightweight)
 *   - Title + description
 *   - Optional CTA slot
 *
 * PRIVACY (§5.5): No score-adjacent strings.
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────

export type EmptyVariant =
  | "NO_TASKS"
  | "NO_FARMERS"
  | "NO_DATA"
  | "NO_NOTIFICATIONS"
  | "NO_RESULTS";

export interface EmptyStateProps {
  variant: EmptyVariant;
  /** Override the default title. */
  title?: string;
  /** Override the default description. */
  description?: string;
  /** Optional CTA button rendered below the description. */
  cta?: React.ReactNode;
}

// ─── Variant config ───────────────────────────────────────

interface VariantConfig {
  title: string;
  description: string;
  /** Simple SVG icon colour class */
  iconColor: string;
  /** SVG path data for the illustration */
  svgPath: string;
}

const VARIANTS: Record<EmptyVariant, VariantConfig> = {
  NO_TASKS: {
    title: "No tasks for today",
    description: "Great job! Check back later for new tasks.",
    iconColor: "text-emerald-400",
    svgPath:
      "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", // checkmark circle
  },
  NO_FARMERS: {
    title: "No farmers assigned yet",
    description: "Farmers will appear here once they are assigned to you.",
    iconColor: "text-blue-400",
    svgPath:
      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", // users
  },
  NO_DATA: {
    title: "No data collected yet",
    description: "Start collecting data by visiting farmers in your queue.",
    iconColor: "text-amber-400",
    svgPath:
      "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", // document chart
  },
  NO_NOTIFICATIONS: {
    title: "No notifications right now",
    description: "You're all caught up. We'll notify you when something needs attention.",
    iconColor: "text-violet-400",
    svgPath:
      "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", // bell
  },
  NO_RESULTS: {
    title: "No results found",
    description: "Try adjusting your search or filters.",
    iconColor: "text-gray-400",
    svgPath:
      "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", // search
  },
};

// ─── Illustration component ───────────────────────────────

function Illustration({
  svgPath,
  colorClass,
}: {
  svgPath: string;
  colorClass: string;
}) {
  return (
    <div className="flex items-center justify-center" data-testid="empty-illustration">
      <svg
        className={"size-16 " + colorClass}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={svgPath} />
      </svg>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────

export default function EmptyState({
  variant,
  title,
  description,
  cta,
}: EmptyStateProps) {
  const config = VARIANTS[variant];

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center"
      data-testid="empty-state"
      data-variant={variant}
    >
      <Illustration svgPath={config.svgPath} colorClass={config.iconColor} />

      <h2
        className="text-lg font-semibold text-foreground"
        data-testid="empty-title"
      >
        {title ?? config.title}
      </h2>

      <p
        className="text-sm text-muted-foreground max-w-sm"
        data-testid="empty-description"
      >
        {description ?? config.description}
      </p>

      {cta && (
        <div className="mt-2" data-testid="empty-cta">
          {cta}
        </div>
      )}
    </div>
  );
}

/** Export variant config for testing. */
export { VARIANTS };
