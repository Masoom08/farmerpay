"use client";

/**
 * PortfolioTable — tanstack/react-table (D5)
 *
 * Spec §2.1 / §2.3: Sortable table with 8 columns, sticky header, row hover
 * highlights matching heatmap cell. Row-action menu with 5 actions.
 */

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  buildColumns,
  type PortfolioRow,
  type RowAction,
} from "./columns";

// ─── Re-exports ─────────────────────────────────────────────────

export { type PortfolioRow, type RowAction, ROW_ACTIONS } from "./columns";

// ─── Props ─────────────────────────────────────────────────────

export interface PortfolioTableProps {
  data: PortfolioRow[];
  /** Called when any row action is triggered */
  onAction: (farmerId: number, action: RowAction) => void;
  /** Optional: highlight matching heatmap cell on row hover */
  onRowHover?: (farmerId: number | null) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function PortfolioTable({
  data,
  onAction,
  onRowHover,
  className,
}: PortfolioTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => buildColumns({ onAction, onRowHover }),
    [onAction, onRowHover],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // ─── Empty state ──────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div
        data-testid="table-empty"
        className="py-12 text-center text-sm text-muted-foreground"
      >
        No farmers to display.
      </div>
    );
  }

  return (
    <div
      data-testid="portfolio-table"
      className={cn("overflow-auto rounded-md border", className)}
    >
      <table className="w-full border-collapse text-sm">
        {/* ─── Sticky header ─────────────────────────── */}
        <thead
          data-testid="table-header"
          className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm"
        >
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const sorted = header.column.getIsSorted();

                return (
                  <th
                    key={header.id}
                    data-testid={`th-${header.id}`}
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-muted-foreground",
                      sortable && "cursor-pointer select-none hover:text-foreground",
                    )}
                    onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sortable && (
                        <span
                          data-testid={`sort-indicator-${header.id}`}
                          className="text-[10px]"
                          aria-hidden="true"
                        >
                          {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "⇅"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        {/* ─── Body ──────────────────────────────────── */}
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const farmerId = row.original.farmerId;
            return (
              <tr
                key={row.id}
                data-testid={`row-${farmerId}`}
                data-farmer-id={farmerId}
                onMouseEnter={() => onRowHover?.(farmerId)}
                onMouseLeave={() => onRowHover?.(null)}
                className="border-b transition-colors hover:bg-muted/50"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="whitespace-nowrap px-3 py-2 text-sm"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PortfolioTable;
