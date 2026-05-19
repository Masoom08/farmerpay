/**
 * TRUST v2 — Desktop primitive component tests
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  Button,
  Badge,
  EmptyState,
  Skeleton,
} from "@/components/primitives";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
describe("Button", () => {
  it("renders with default variant", () => {
    render(<Button data-testid="btn">Click me</Button>);
    expect(screen.getByTestId("btn")).toBeInTheDocument();
    expect(screen.getByTestId("btn")).toHaveTextContent("Click me");
  });

  it.each(["primary", "secondary", "ghost", "destructive"] as const)(
    "renders variant=%s",
    (variant) => {
      render(
        <Button variant={variant} data-testid={`btn-${variant}`}>
          {variant}
        </Button>,
      );
      expect(screen.getByTestId(`btn-${variant}`)).toBeInTheDocument();
    },
  );

  it.each(["sm", "md", "lg"] as const)("renders size=%s", (size) => {
    render(
      <Button size={size} data-testid={`btn-${size}`}>
        {size}
      </Button>,
    );
    expect(screen.getByTestId(`btn-${size}`)).toBeInTheDocument();
  });

  it("disables button when loading", () => {
    render(
      <Button loading data-testid="btn-loading">
        Submit
      </Button>,
    );
    const btn = screen.getByTestId("btn-loading");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("disables button when disabled prop set", () => {
    render(
      <Button disabled data-testid="btn-disabled">
        No click
      </Button>,
    );
    expect(screen.getByTestId("btn-disabled")).toBeDisabled();
  });

  it("shows spinner when loading", () => {
    const { container } = render(<Button loading>Loading</Button>);
    expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    expect(screen.getByTestId("badge")).toHaveTextContent("Default");
  });

  it.each([
    "default",
    "secondary",
    "outline",
    "sanction",
    "reconsider",
    "reject",
    "band-excellent",
    "band-good",
    "band-building",
    "band-starting",
  ] as const)("renders variant=%s", (variant) => {
    render(
      <Badge variant={variant} data-testid={`badge-${variant}`}>
        {variant}
      </Badge>,
    );
    expect(screen.getByTestId(`badge-${variant}`)).toBeInTheDocument();
  });

  it("passes aria attributes", () => {
    render(
      <Badge aria-label="Score band" data-testid="badge-aria">
        Excellent
      </Badge>,
    );
    expect(screen.getByTestId("badge-aria")).toHaveAttribute(
      "aria-label",
      "Score band",
    );
  });
});

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No data" data-testid="empty" />);
    expect(screen.getByTestId("empty")).toHaveTextContent("No data");
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        title="No data"
        description="Try adjusting your filters"
        data-testid="empty-desc"
      />,
    );
    expect(screen.getByTestId("empty-desc")).toHaveTextContent(
      "Try adjusting your filters",
    );
  });

  it("renders action when provided", () => {
    render(
      <EmptyState
        title="No data"
        action={<button>Retry</button>}
        data-testid="empty-action"
      />,
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("has role=status", () => {
    render(<EmptyState title="Empty" data-testid="empty-role" />);
    expect(screen.getByTestId("empty-role")).toHaveAttribute("role", "status");
  });
});

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
describe("Skeleton", () => {
  it("renders base skeleton", () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId("skel")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders Score subvariant", () => {
    render(<Skeleton.Score data-testid="skel-score" />);
    expect(screen.getByTestId("skel-score")).toBeInTheDocument();
  });

  it("renders Row subvariant with default 4 columns", () => {
    const { container } = render(<Skeleton.Row data-testid="skel-row" />);
    const cells = container.querySelectorAll("[data-testid='skel-row'] > div");
    expect(cells.length).toBe(4);
  });

  it("renders Row subvariant with custom column count", () => {
    const { container } = render(
      <Skeleton.Row columns={6} data-testid="skel-row-6" />,
    );
    const cells = container.querySelectorAll(
      "[data-testid='skel-row-6'] > div",
    );
    expect(cells.length).toBe(6);
  });

  it("renders Cell subvariant", () => {
    render(<Skeleton.Cell data-testid="skel-cell" />);
    expect(screen.getByTestId("skel-cell")).toBeInTheDocument();
  });
});
