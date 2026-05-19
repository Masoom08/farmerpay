/**
 * CoachingPriority badge — unit tests.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import CoachingPriority from "../../src/components/readiness/CoachingPriority";

describe("CoachingPriority", () => {
  it("renders High Priority with icon", () => {
    render(<CoachingPriority priority="high" />);
    expect(screen.getByTestId("coaching-priority")).toHaveTextContent("High Priority");
    expect(screen.getByTestId("coaching-priority")).toHaveAttribute("data-priority", "high");
  });

  it("renders Medium Priority", () => {
    render(<CoachingPriority priority="medium" />);
    expect(screen.getByTestId("coaching-priority")).toHaveTextContent("Medium Priority");
  });

  it("renders Low Priority", () => {
    render(<CoachingPriority priority="low" />);
    expect(screen.getByTestId("coaching-priority")).toHaveTextContent("Low Priority");
  });

  it("renders compact mode with short labels", () => {
    render(<CoachingPriority priority="high" compact />);
    expect(screen.getByTestId("coaching-priority")).toHaveTextContent("High");
    expect(screen.getByTestId("coaching-priority")).not.toHaveTextContent("High Priority");
  });

  it("renders fallback for null priority", () => {
    render(<CoachingPriority priority={null} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("renders fallback for undefined priority", () => {
    render(<CoachingPriority priority={undefined} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("does not contain any FHS-related text", () => {
    const { container } = render(<CoachingPriority priority="high" />);
    const text = container.textContent || "";
    expect(text.toLowerCase()).not.toContain("fhs");
    expect(text.toLowerCase()).not.toContain("financial health");
  });
});
