"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/primitives";
import type { BadgeVariant } from "@/components/primitives";

// ─── Row type ──────────────────────────────────────────────────

export interface PortfolioRow {
  farmerId: number;
  farmerName: string;
  village: string;
  crop: string;
  score: number;
  decision: "SANCTION" | "RECONSIDER" | "REJECT" | "PENDING";
  deltaMonth: number; // score change over last 30 days
  dataAgeDays: number; // days since last refresh
}

// ─── Decision badge variant ────────────────────────────────────

const DECISION_BADGE: Record<string, BadgeVariant> = {
  SANCTION: "sanction",
  RECONSIDER: "reconsider",
  REJECT: "reject",
  PENDING: "outline",
};

// ─── Row actions ───────────────────────────────────────────────

export type RowAction =
  | "open-review"
  | "request-sathi"
  | "refresh-aa"
  | "pull-cibil"
  | "export-pdf";

export interface RowActionItem {
  id: RowAction;
  label: string;
}

export const ROW_ACTIONS: RowActionItem[] = [
  { id: "open-review", label: "Open review" },
  { id: "request-sathi", label: "Request Sathi visit" },
  { id: "refresh-aa", label: "Refresh AA" },
  { id: "pull-cibil", label: "Pull CIBIL" },
  { id: "export-pdf", label: "Export PDF" },
];

// ─── Column definitions ────────────────────────────────────────

export function buildColumns(opts: {
  onAction: (farmerId: number, action: RowAction) => void;
  onRowHover?: (farmerId: number | null) => void;
}): ColumnDef<PortfolioRow, unknown>[] {
  return [
    {
      accessorKey: "farmerName",
      header: "Farmer",
      cell: ({ row }) => (
        <span
          data-testid={`cell-farmer-${row.original.farmerId}`}
          className="font-medium text-foreground"
        >
          {row.original.farmerName}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "village",
      header: "Village",
      enableSorting: true,
    },
    {
      accessorKey: "crop",
      header: "Crop",
      enableSorting: true,
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => (
        <span
          data-testid={`cell-score-${row.original.farmerId}`}
          className="tabular-nums font-semibold"
        >
          {row.original.score}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "decision",
      header: "Decision",
      cell: ({ row }) => {
        const d = row.original.decision;
        return (
          <Badge
            data-testid={`cell-decision-${row.original.farmerId}`}
            variant={DECISION_BADGE[d] ?? "outline"}
          >
            {d}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "deltaMonth",
      header: "Δ month",
      cell: ({ row }) => {
        const delta = row.original.deltaMonth;
        const sign = delta > 0 ? "+" : "";
        const color =
          delta > 0
            ? "text-green-700"
            : delta < 0
              ? "text-red-700"
              : "text-muted-foreground";
        return (
          <span
            data-testid={`cell-delta-${row.original.farmerId}`}
            className={`tabular-nums text-xs ${color}`}
          >
            {sign}
            {delta}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "dataAgeDays",
      header: "Data age",
      cell: ({ row }) => {
        const days = row.original.dataAgeDays;
        const stale = days > 30;
        return (
          <span
            data-testid={`cell-age-${row.original.farmerId}`}
            className={`tabular-nums text-xs ${stale ? "text-red-600 font-medium" : "text-muted-foreground"}`}
          >
            {days}d
          </span>
        );
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => {
        const farmerId = row.original.farmerId;
        return <ActionMenu farmerId={farmerId} onAction={opts.onAction} />;
      },
    },
  ];
}

// ─── Action menu sub-component ─────────────────────────────────

interface ActionMenuProps {
  farmerId: number;
  onAction: (farmerId: number, action: RowAction) => void;
}

function ActionMenu({ farmerId, onAction }: ActionMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleItemClick = React.useCallback(
    (action: RowAction) => {
      if (busy) return; // debounce
      setBusy(true);
      setOpen(false);
      onAction(farmerId, action);
      // Reset debounce after 300ms
      setTimeout(() => setBusy(false), 300);
    },
    [farmerId, onAction, busy],
  );

  return (
    <div ref={menuRef} className="relative" data-testid={`action-menu-${farmerId}`}>
      <button
        type="button"
        data-testid={`action-trigger-${farmerId}`}
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ⋮
      </button>

      {open && (
        <div
          role="menu"
          data-testid={`action-dropdown-${farmerId}`}
          className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover py-1 shadow-md"
        >
          {ROW_ACTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              data-testid={`action-${item.id}-${farmerId}`}
              onClick={() => handleItemClick(item.id)}
              className="flex w-full items-center px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
