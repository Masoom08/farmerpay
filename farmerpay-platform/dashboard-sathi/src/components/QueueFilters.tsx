"use client";

/**
 * QueueFilters — Filter controls for the Sathi task queue (G2 — Spec §5.1).
 *
 * Filters:
 *   - Status: all | pending | completed
 *   - Village: all | specific village name
 */

export type StatusFilter = "all" | "pending" | "completed";

export interface QueueFiltersProps {
  statusFilter: StatusFilter;
  villageFilter: string; // "all" or a village name
  villages: string[];
  onStatusChange: (status: StatusFilter) => void;
  onVillageChange: (village: string) => void;
}

export default function QueueFilters({
  statusFilter,
  villageFilter,
  villages,
  onStatusChange,
  onVillageChange,
}: QueueFiltersProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-3"
      data-testid="queue-filters"
    >
      {/* Status filter */}
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        Status
        <select
          data-testid="filter-status"
          className="rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </label>

      {/* Village filter */}
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        Village
        <select
          data-testid="filter-village"
          className="rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          value={villageFilter}
          onChange={(e) => onVillageChange(e.target.value)}
        >
          <option value="all">All villages</option>
          {villages.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
