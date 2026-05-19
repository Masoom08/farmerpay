/**
 * Portfolio page + filters — Unit Tests (D1)
 *
 * Tests:
 *   FILTER STATE (unit)
 *   1.  parseFiltersFromParams parses comma-separated values
 *   2.  parseFiltersFromParams returns EMPTY_FILTERS for no params
 *   3.  filtersToParams serializes correctly
 *   4.  filtersToParams omits empty keys
 *   5.  toggleFilterValue adds value
 *   6.  toggleFilterValue removes existing value
 *   7.  removeFilterValue removes specific value
 *   8.  countActiveFilters counts all active values
 *   9.  hasActiveFilters returns false for empty
 *  10.  applyFilters filters by product
 *  11.  applyFilters filters by decision
 *  12.  applyFilters filters by scoreBand
 *  13.  applyFilters — no filters returns all
 *  14.  extractDynamicOptions extracts unique villages and crops
 *
 *  PAGE (integration)
 *  15.  Renders portfolio page container
 *  16.  Shows loading skeletons on mount
 *  17.  Shows farmer rows after data loads
 *  18.  Filter button rendered for each filter key
 *  19.  Clicking filter toggles dropdown
 *  20.  Selecting option shows active chip
 *  21.  Clicking chip removes filter
 *  22.  Clear-all button removes all filters
 *  23.  Empty state with CTA when filters yield no results
 *  24.  Error state with retry
 *  25.  Backspace removes focused chip
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ─── Import filter utilities ───────────────────────────────────

import {
  parseFiltersFromParams,
  filtersToParams,
  toggleFilterValue,
  removeFilterValue,
  countActiveFilters,
  hasActiveFilters,
  applyFilters,
  extractDynamicOptions,
  EMPTY_FILTERS,
  type FilterState,
  type PortfolioFarmer,
} from "@/app/dashboard/portfolio/filters";

// ─── Import page component ────────────────────────────────────

import PortfolioPage from "@/app/dashboard/portfolio/page";

// ─── Mocks ─────────────────────────────────────────────────────

// Track router.replace calls
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    toString: () => mockSearchParams.toString(),
    get: (key: string) => mockSearchParams.get(key),
    has: (key: string) => mockSearchParams.has(key),
  }),
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
  usePathname: () => "/dashboard/portfolio",
}));

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock apiGet
const mockApiGet = jest.fn();
jest.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}));

Object.defineProperty(window, "localStorage", {
  value: { getItem: jest.fn(() => "mock-token"), setItem: jest.fn(), removeItem: jest.fn() },
  writable: true,
});

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_FARMERS: PortfolioFarmer[] = [
  {
    farmerId: 1,
    farmerName: "Rajesh Patil",
    village: "Wardha",
    product: "KCC",
    crop: "Cotton",
    score: 720,
    scoreBand: "MEDIUM",
    decision: "SANCTION",
    loanAmountInr: 350000,
    lastRefreshedAt: "2026-04-10T10:00:00Z",
    computedAt: "2026-04-10T10:00:00Z",
  },
  {
    farmerId: 2,
    farmerName: "Sita Devi",
    village: "Yavatmal",
    product: "CROP_LOAN",
    crop: "Soybean",
    score: 450,
    scoreBand: "LOW",
    decision: "REJECT",
    loanAmountInr: 150000,
    lastRefreshedAt: "2026-03-01T10:00:00Z",
    computedAt: "2026-03-01T10:00:00Z",
  },
  {
    farmerId: 3,
    farmerName: "Mohan Sharma",
    village: "Wardha",
    product: "KCC",
    crop: "Wheat",
    score: 810,
    scoreBand: "HIGH",
    decision: "SANCTION",
    loanAmountInr: 500000,
    lastRefreshedAt: "2026-04-13T10:00:00Z",
    computedAt: "2026-04-13T10:00:00Z",
  },
];

// ─── Filter utility unit tests ─────────────────────────────────

describe("Filter state utilities", () => {
  it("parseFiltersFromParams parses comma-separated values", () => {
    const params = new URLSearchParams("product=KCC,CROP_LOAN&decision=SANCTION");
    const result = parseFiltersFromParams(params);

    expect(result.product).toEqual(["KCC", "CROP_LOAN"]);
    expect(result.decision).toEqual(["SANCTION"]);
    expect(result.village).toEqual([]);
  });

  it("parseFiltersFromParams returns EMPTY_FILTERS for no params", () => {
    const result = parseFiltersFromParams(new URLSearchParams());
    expect(result).toEqual(EMPTY_FILTERS);
  });

  it("filtersToParams serializes correctly", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      product: ["KCC", "CROP_LOAN"],
      decision: ["SANCTION"],
    };
    const result = filtersToParams(filters);
    expect(result).toContain("product=KCC%2CCROP_LOAN");
    expect(result).toContain("decision=SANCTION");
  });

  it("filtersToParams omits empty keys", () => {
    const result = filtersToParams(EMPTY_FILTERS);
    expect(result).toBe("");
  });

  it("toggleFilterValue adds value", () => {
    const next = toggleFilterValue(EMPTY_FILTERS, "product", "KCC");
    expect(next.product).toEqual(["KCC"]);
  });

  it("toggleFilterValue removes existing value", () => {
    const initial: FilterState = { ...EMPTY_FILTERS, product: ["KCC", "CROP_LOAN"] };
    const next = toggleFilterValue(initial, "product", "KCC");
    expect(next.product).toEqual(["CROP_LOAN"]);
  });

  it("removeFilterValue removes specific value", () => {
    const initial: FilterState = { ...EMPTY_FILTERS, decision: ["SANCTION", "REJECT"] };
    const next = removeFilterValue(initial, "decision", "SANCTION");
    expect(next.decision).toEqual(["REJECT"]);
  });

  it("countActiveFilters counts all active values", () => {
    const filters: FilterState = {
      ...EMPTY_FILTERS,
      product: ["KCC"],
      decision: ["SANCTION", "REJECT"],
    };
    expect(countActiveFilters(filters)).toBe(3);
  });

  it("hasActiveFilters returns false for empty", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("applyFilters filters by product", () => {
    const filters: FilterState = { ...EMPTY_FILTERS, product: ["KCC"] };
    const result = applyFilters(MOCK_FARMERS, filters);
    expect(result).toHaveLength(2);
    expect(result.every((f) => f.product === "KCC")).toBe(true);
  });

  it("applyFilters filters by decision", () => {
    const filters: FilterState = { ...EMPTY_FILTERS, decision: ["REJECT"] };
    const result = applyFilters(MOCK_FARMERS, filters);
    expect(result).toHaveLength(1);
    expect(result[0].farmerName).toBe("Sita Devi");
  });

  it("applyFilters filters by scoreBand", () => {
    const filters: FilterState = { ...EMPTY_FILTERS, scoreBand: ["HIGH"] };
    const result = applyFilters(MOCK_FARMERS, filters);
    expect(result).toHaveLength(1);
    expect(result[0].farmerName).toBe("Mohan Sharma");
  });

  it("applyFilters — no filters returns all", () => {
    const result = applyFilters(MOCK_FARMERS, EMPTY_FILTERS);
    expect(result).toHaveLength(3);
  });

  it("extractDynamicOptions extracts unique villages and crops", () => {
    const opts = extractDynamicOptions(MOCK_FARMERS);
    expect(opts.villages).toEqual([
      { value: "Wardha", label: "Wardha" },
      { value: "Yavatmal", label: "Yavatmal" },
    ]);
    expect(opts.crops).toEqual([
      { value: "Cotton", label: "Cotton" },
      { value: "Soybean", label: "Soybean" },
      { value: "Wheat", label: "Wheat" },
    ]);
  });
});

// ─── Page integration tests ────────────────────────────────────

describe("PortfolioPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockApiGet.mockResolvedValue({ data: MOCK_FARMERS });
  });

  it("renders portfolio page container", async () => {
    render(<PortfolioPage />);

    expect(screen.getByTestId("portfolio-page")).toBeInTheDocument();
  });

  it("shows loading skeletons on mount", () => {
    // Keep loading by not resolving the promise
    mockApiGet.mockReturnValue(new Promise(() => {}));
    render(<PortfolioPage />);

    expect(screen.getByTestId("portfolio-loading")).toBeInTheDocument();
  });

  it("shows farmer rows after data loads", async () => {
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-list")).toBeInTheDocument();
    });

    expect(screen.getByTestId("farmer-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("farmer-row-2")).toBeInTheDocument();
    expect(screen.getByTestId("farmer-row-3")).toBeInTheDocument();
  });

  it("shows farmer names in rows", async () => {
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("farmer-row-1")).toHaveTextContent("Rajesh Patil");
    });
  });

  it("filter button rendered for each filter key", async () => {
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("filter-btn-product")).toBeInTheDocument();
    });

    expect(screen.getByTestId("filter-btn-village")).toBeInTheDocument();
    expect(screen.getByTestId("filter-btn-scoreBand")).toBeInTheDocument();
    expect(screen.getByTestId("filter-btn-decision")).toBeInTheDocument();
    expect(screen.getByTestId("filter-btn-lastRefresh")).toBeInTheDocument();
    expect(screen.getByTestId("filter-btn-crop")).toBeInTheDocument();
  });

  it("clicking filter button toggles dropdown", async () => {
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("filter-btn-product")).toBeInTheDocument();
    });

    // Dropdown not visible initially
    expect(screen.queryByTestId("filter-dropdown-product")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(screen.getByTestId("filter-btn-product"));
    expect(screen.getByTestId("filter-dropdown-product")).toBeInTheDocument();

    // Click again to close
    fireEvent.click(screen.getByTestId("filter-btn-product"));
    expect(screen.queryByTestId("filter-dropdown-product")).not.toBeInTheDocument();
  });

  it("selecting option updates URL (calls router.replace)", async () => {
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("filter-btn-product")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("filter-btn-product"));
    fireEvent.click(screen.getByTestId("filter-opt-product-KCC"));

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("product=KCC"),
      { scroll: false },
    );
  });

  it("active chips shown when filter is active", async () => {
    mockSearchParams = new URLSearchParams("product=KCC");
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("active-chips")).toBeInTheDocument();
    });

    expect(screen.getByTestId("chip-product-KCC")).toBeInTheDocument();
    expect(screen.getByTestId("chip-product-KCC")).toHaveTextContent("Product: KCC");
  });

  it("clicking chip removes filter (calls router.replace)", async () => {
    mockSearchParams = new URLSearchParams("product=KCC,CROP_LOAN");
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("chip-product-KCC")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("chip-product-KCC"));

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("product=CROP_LOAN"),
      { scroll: false },
    );
  });

  it("clear-all button removes all filters", async () => {
    mockSearchParams = new URLSearchParams("product=KCC&decision=SANCTION");
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("clear-filters-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("clear-filters-btn"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/dashboard/portfolio",
      { scroll: false },
    );
  });

  it("clear-all not shown when no filters active", async () => {
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-list")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("clear-filters-btn")).not.toBeInTheDocument();
  });

  it("empty state with CTA when filters yield no results", async () => {
    mockSearchParams = new URLSearchParams("scoreBand=HIGH");
    // Return farmers but only one matches HIGH — let's mock data with none matching
    mockApiGet.mockResolvedValue({
      data: [MOCK_FARMERS[0], MOCK_FARMERS[1]], // MEDIUM and LOW only
    });

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-empty")).toBeInTheDocument();
    });

    expect(screen.getByTestId("portfolio-empty")).toHaveTextContent(
      "No farmers match the selected filters.",
    );
    expect(screen.getByTestId("empty-clear-btn")).toBeInTheDocument();
  });

  it("empty-clear-btn clears filters", async () => {
    mockSearchParams = new URLSearchParams("scoreBand=HIGH");
    mockApiGet.mockResolvedValue({
      data: [MOCK_FARMERS[0]], // MEDIUM — no HIGH match
    });

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-clear-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("empty-clear-btn"));
    expect(mockReplace).toHaveBeenCalledWith(
      "/dashboard/portfolio",
      { scroll: false },
    );
  });

  it("error state with retry", async () => {
    mockApiGet.mockRejectedValue(new Error("Network error"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("portfolio-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("portfolio-error")).toHaveTextContent("Network error");
    expect(screen.getByTestId("error-retry-btn")).toBeInTheDocument();
  });

  it("Backspace removes focused chip", async () => {
    mockSearchParams = new URLSearchParams("product=KCC,CROP_LOAN");
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("chip-product-KCC")).toBeInTheDocument();
    });

    // Focus the chip — wrap in act to flush state update
    await act(async () => {
      screen.getByTestId("chip-product-KCC").focus();
    });

    // Press Backspace
    await act(async () => {
      fireEvent.keyDown(window, { key: "Backspace" });
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("product=CROP_LOAN"),
      { scroll: false },
    );
  });

  it("filter-bar has role=search with aria-label", async () => {
    render(<PortfolioPage />);

    const filterBar = screen.getByTestId("filter-bar");
    expect(filterBar).toHaveAttribute("role", "search");
    expect(filterBar).toHaveAttribute("aria-label", "Portfolio filters");
  });

  it("farmer rows link to trust-review page", async () => {
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByTestId("farmer-row-1")).toBeInTheDocument();
    });

    const link = screen.getByTestId("farmer-row-1");
    expect(link).toHaveAttribute("href", "/dashboard/farmer/1/trust-review");
  });
});
