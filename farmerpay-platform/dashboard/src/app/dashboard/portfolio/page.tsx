"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives";
import { Skeleton } from "@/components/primitives/Skeleton";
import { apiGet } from "@/lib/api";
import {
  parseFiltersFromParams,
  filtersToParams,
  toggleFilterValue,
  removeFilterValue,
  applyFilters,
  extractDynamicOptions,
  hasActiveFilters,
  countActiveFilters,
  FILTER_DEFS,
  ALL_FILTER_KEYS,
  EMPTY_FILTERS,
  type FilterState,
  type FilterKey,
  type PortfolioFarmer,
} from "./filters";

// ─── Component ──────────────────────────────────────────────────

export default function PortfolioPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ─── Data fetching state ────────────────────────────────────
  const [farmers, setFarmers] = useState<PortfolioFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Filter state from URL ──────────────────────────────────
  const filters = useMemo(
    () => parseFiltersFromParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  // ─── Focused chip for Backspace removal (§2.6) ─────────────
  const [focusedChip, setFocusedChip] = useState<{
    key: FilterKey;
    value: string;
  } | null>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // ─── Fetch portfolio data ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchPortfolio() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("fp_token") ?? "";
        const res = await apiGet("/trust/portfolio", token);
        if (!cancelled) {
          setFarmers(res?.data ?? res ?? []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load portfolio",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPortfolio();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Dynamic filter options ─────────────────────────────────
  const dynamicOptions = useMemo(
    () => extractDynamicOptions(farmers),
    [farmers],
  );

  // ─── Filtered results ───────────────────────────────────────
  const filtered = useMemo(
    () => applyFilters(farmers, filters),
    [farmers, filters],
  );

  // ─── URL sync ───────────────────────────────────────────────
  const updateFilters = useCallback(
    (next: FilterState) => {
      const paramStr = filtersToParams(next);
      router.replace(`${pathname}${paramStr ? `?${paramStr}` : ""}`, {
        scroll: false,
      });
    },
    [router, pathname],
  );

  const handleToggle = useCallback(
    (key: FilterKey, value: string) => {
      const next = toggleFilterValue(filters, key, value);
      updateFilters(next);
    },
    [filters, updateFilters],
  );

  const handleRemoveChip = useCallback(
    (key: FilterKey, value: string) => {
      const next = removeFilterValue(filters, key, value);
      updateFilters(next);
    },
    [filters, updateFilters],
  );

  const handleClearAll = useCallback(() => {
    updateFilters(EMPTY_FILTERS);
  }, [updateFilters]);

  // ─── Backspace removes focused chip (§2.6) ─────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Backspace" && focusedChip) {
        e.preventDefault();
        handleRemoveChip(focusedChip.key, focusedChip.value);
        setFocusedChip(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedChip, handleRemoveChip]);

  // ─── Get options for a filter key ───────────────────────────
  const getOptions = useCallback(
    (key: FilterKey) => {
      if (key === "village") return dynamicOptions.villages;
      if (key === "crop") return dynamicOptions.crops;
      // FILTER_DEFS.*.options are readonly tuples from `as const`; the
      // call site only reads them, so stripping the readonly modifier
      // via unknown is the pragmatic cast.
      return FILTER_DEFS[key].options as unknown as { value: string; label: string }[];
    },
    [dynamicOptions],
  );

  const activeCount = countActiveFilters(filters);
  const isFiltered = hasActiveFilters(filters);

  return (
    <div data-testid="portfolio-page" className="flex flex-col gap-6">
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Portfolio Heatmap
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${filtered.length} of ${farmers.length} farmers`}
          </p>
        </div>
      </div>

      {/* ─── Filter Bar (§2.1) ─────────────────────────── */}
      <div
        data-testid="filter-bar"
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
        role="search"
        aria-label="Portfolio filters"
      >
        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {ALL_FILTER_KEYS.map((key) => {
            const def = FILTER_DEFS[key];
            const options = getOptions(key);
            const active = filters[key];

            return (
              <FilterDropdown
                key={key}
                filterKey={key}
                label={def.label}
                options={options}
                selected={active}
                onToggle={(value) => handleToggle(key, value)}
              />
            );
          })}

          {/* Clear filters CTA */}
          {isFiltered && (
            <button
              type="button"
              data-testid="clear-filters-btn"
              onClick={handleClearAll}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium",
                "text-destructive hover:bg-destructive/10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              Clear all ({activeCount})
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {isFiltered && (
          <div
            data-testid="active-chips"
            className="flex flex-wrap items-center gap-1.5"
            role="list"
            aria-label="Active filters"
          >
            {ALL_FILTER_KEYS.map((key) =>
              filters[key].map((value) => {
                const chipKey = `${key}:${value}`;
                const label =
                  getOptions(key).find((o) => o.value === value)?.label ??
                  value;

                return (
                  <button
                    key={chipKey}
                    ref={(el) => {
                      if (el) chipRefs.current.set(chipKey, el);
                      else chipRefs.current.delete(chipKey);
                    }}
                    type="button"
                    role="listitem"
                    data-testid={`chip-${key}-${value}`}
                    onFocus={() => setFocusedChip({ key, value })}
                    onBlur={() => setFocusedChip(null)}
                    onClick={() => handleRemoveChip(key, value)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                      "bg-brand-primary-100 text-brand-primary-700",
                      "hover:bg-brand-primary-200 transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      focusedChip?.key === key &&
                        focusedChip?.value === value &&
                        "ring-2 ring-brand-primary-500",
                    )}
                    aria-label={`Remove ${FILTER_DEFS[key].label}: ${label}`}
                  >
                    {FILTER_DEFS[key].label}: {label}
                    <span aria-hidden="true" className="ml-0.5">
                      ×
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        )}
      </div>

      {/* ─── Content area ──────────────────────────────── */}
      {loading && (
        <div data-testid="portfolio-loading" className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      )}

      {error && (
        <div
          data-testid="portfolio-error"
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-8"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="secondary"
            data-testid="error-retry-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div
          data-testid="portfolio-empty"
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12"
        >
          <p className="text-sm text-muted-foreground">
            {isFiltered
              ? "No farmers match the selected filters."
              : "No farmers in portfolio."}
          </p>
          {isFiltered && (
            <button
              type="button"
              data-testid="empty-clear-btn"
              onClick={handleClearAll}
              className="text-sm font-medium text-brand-primary-700 underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div
          data-testid="portfolio-list"
          className="flex flex-col gap-2"
          role="list"
          aria-label="Portfolio farmers"
        >
          {filtered.map((f) => (
            <Link
              key={f.farmerId}
              href={`/dashboard/farmer/${f.farmerId}/trust-review`}
              data-testid={`farmer-row-${f.farmerId}`}
              role="listitem"
              className={cn(
                "flex items-center gap-4 rounded-md border bg-card px-4 py-3 text-sm",
                "transition-colors hover:bg-muted/50",
              )}
            >
              <span className="min-w-[160px] font-medium text-foreground">
                {f.farmerName}
              </span>
              <span className="text-muted-foreground">{f.village}</span>
              <span className="text-muted-foreground">{f.crop}</span>
              <span className="ml-auto tabular-nums font-semibold">
                {f.score}
              </span>
              <DecisionChip decision={f.decision} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FilterDropdown ─────────────────────────────────────────────

function FilterDropdown({
  filterKey,
  label,
  options,
  selected,
  onToggle,
}: {
  filterKey: FilterKey;
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const activeCount = selected.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid={`filter-btn-${filterKey}`}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium",
          "transition-colors",
          activeCount > 0
            ? "border-brand-primary-300 bg-brand-primary-50 text-brand-primary-700"
            : "border-border bg-background text-foreground hover:bg-muted/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {label}
        {activeCount > 0 && (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary-600 text-[10px] text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && options.length > 0 && (
        <div
          data-testid={`filter-dropdown-${filterKey}`}
          role="listbox"
          aria-label={`${label} options`}
          className={cn(
            "absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border bg-popover p-1 shadow-md",
          )}
        >
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-testid={`filter-opt-${filterKey}-${opt.value}`}
                onClick={() => onToggle(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs",
                  "transition-colors hover:bg-muted",
                  isSelected && "bg-brand-primary-50 font-medium",
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded-sm border",
                    isSelected
                      ? "border-brand-primary-600 bg-brand-primary-600 text-white"
                      : "border-border",
                  )}
                >
                  {isSelected && (
                    <span className="text-[8px]" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DecisionChip ───────────────────────────────────────────────

function DecisionChip({ decision }: { decision: string }) {
  const styles: Record<string, string> = {
    SANCTION: "bg-green-100 text-green-800",
    RECONSIDER: "bg-amber-100 text-amber-800",
    REJECT: "bg-red-100 text-red-800",
    PENDING: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        styles[decision] ?? "bg-neutral-100 text-neutral-700",
      )}
    >
      {decision}
    </span>
  );
}
