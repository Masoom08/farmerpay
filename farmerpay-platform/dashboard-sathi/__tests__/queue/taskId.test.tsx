/**
 * Task capture page — Unit Tests (G4 — Spec §5.3 + §5.5 + §5.8)
 *
 * Tests:
 *   TASK DETAIL HEADER
 *   1.  Renders farmer name
 *   2.  Renders village + due date sub-line
 *   3.  Renders progress X / Y
 *   4.  Progress bar width reflects step
 *
 *   CHECKLIST FIELD
 *   5.  Text field renders and accepts input
 *   6.  Number field renders and accepts input
 *   7.  Select field renders options
 *   8.  Boolean field renders Yes/No buttons
 *   9.  Photo field renders upload button
 *  10.  Mark N/A opens reason picker
 *  11.  Selecting N/A reason sets isNa + naReason
 *  12.  N/A state renders reason label
 *  13.  Undo N/A clears the N/A state
 *  14.  Geotag toggle is present for photo with enableGeotag
 *
 *   TASK FOOTER
 *  15.  Previous disabled on first step
 *  16.  Next shown when not on last step
 *  17.  Submit shown on last step
 *  18.  Submit shows "Saving..." when submitting
 *
 *   PAGE INTEGRATION (demo mode)
 *  19.  Page renders header + field + footer
 *  20.  Next advances to step 2
 *  21.  Previous goes back to step 1
 *  22.  Auto-save writes to localStorage
 *  23.  Loads saved progress from localStorage
 *
 *   PRIVACY + TOAST (§5.5)
 *  24.  Submit toast is exactly "Thanks, data saved."
 *  25.  No score-adjacent strings in rendered output
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import TaskDetailHeader from "../../src/components/TaskDetailHeader";
import ChecklistField, {
  type ChecklistFieldDef,
  type FieldValue,
  NA_REASONS,
  NA_REASON_LABELS,
} from "../../src/components/ChecklistField";
import TaskFooter from "../../src/components/TaskFooter";

// ─── Mock next/navigation ─────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ taskId: "t1" }),
  useSearchParams: () => ({
    get: (key: string) => (key === "demo" ? "true" : null),
  }),
}));

// ─── Mock localStorage ────────────────────────────────────

const localStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => localStore[key] ?? null),
  setItem: jest.fn((key: string, val: string) => { localStore[key] = val; }),
  removeItem: jest.fn((key: string) => { delete localStore[key]; }),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

// ─── Helpers ──────────────────────────────────────────────

const TEXT_FIELD: ChecklistFieldDef = {
  id: "f1",
  label: "Crop grown",
  type: "text",
  required: true,
  placeholder: "e.g. Rice",
};

const NUMBER_FIELD: ChecklistFieldDef = {
  id: "f2",
  label: "Land area",
  type: "number",
  placeholder: "e.g. 2.5",
};

const SELECT_FIELD: ChecklistFieldDef = {
  id: "f3",
  label: "Irrigation source",
  type: "select",
  options: ["Borewell", "Canal", "Rain-fed"],
};

const BOOLEAN_FIELD: ChecklistFieldDef = {
  id: "f4",
  label: "Has insurance?",
  type: "boolean",
};

const PHOTO_FIELD: ChecklistFieldDef = {
  id: "f5",
  label: "Farm photo",
  type: "photo",
  enableGeotag: true,
};

const EMPTY_VALUE: FieldValue = { value: null };

// ─── TaskDetailHeader ─────────────────────────────────────

describe("TaskDetailHeader", () => {
  it("renders farmer name", () => {
    render(
      <TaskDetailHeader
        farmerName="Ramesh Patel"
        village="Kheda"
        dueDate="2024-06-15"
        currentStep={2}
        totalSteps={5}
      />,
    );
    expect(screen.getByTestId("task-header-farmer")).toHaveTextContent("Ramesh Patel");
  });

  it("renders village + due date sub-line", () => {
    render(
      <TaskDetailHeader
        farmerName="Ramesh Patel"
        village="Kheda"
        dueDate="2024-06-15"
        currentStep={1}
        totalSteps={5}
      />,
    );
    const sub = screen.getByTestId("task-header-sub");
    expect(sub.textContent).toContain("Kheda");
    expect(sub.textContent).toContain("due");
  });

  it("renders progress X / Y", () => {
    render(
      <TaskDetailHeader
        farmerName="X"
        village="V"
        dueDate="2024-01-01"
        currentStep={3}
        totalSteps={5}
      />,
    );
    expect(screen.getByTestId("task-header-progress")).toHaveTextContent("3 / 5");
  });

  it("progress bar width reflects step", () => {
    render(
      <TaskDetailHeader
        farmerName="X"
        village="V"
        dueDate="2024-01-01"
        currentStep={2}
        totalSteps={4}
      />,
    );
    const bar = screen.getByTestId("task-progress-bar");
    expect(bar.style.width).toBe("50%");
  });
});

// ─── ChecklistField ───────────────────────────────────────

describe("ChecklistField", () => {
  it("text field renders and accepts input", () => {
    const onChange = jest.fn();
    render(<ChecklistField field={TEXT_FIELD} value={EMPTY_VALUE} onChange={onChange} />);

    const input = screen.getByTestId("field-input-text");
    fireEvent.change(input, { target: { value: "Rice" } });
    expect(onChange).toHaveBeenCalledWith("f1", expect.objectContaining({ value: "Rice" }));
  });

  it("number field renders and accepts input", () => {
    const onChange = jest.fn();
    render(<ChecklistField field={NUMBER_FIELD} value={EMPTY_VALUE} onChange={onChange} />);

    const input = screen.getByTestId("field-input-number");
    fireEvent.change(input, { target: { value: "2.5" } });
    expect(onChange).toHaveBeenCalledWith("f2", expect.objectContaining({ value: 2.5 }));
  });

  it("select field renders options", () => {
    const onChange = jest.fn();
    render(<ChecklistField field={SELECT_FIELD} value={EMPTY_VALUE} onChange={onChange} />);

    const select = screen.getByTestId("field-input-select");
    expect(select).toBeTruthy();
    // Change selection
    fireEvent.change(select, { target: { value: "Canal" } });
    expect(onChange).toHaveBeenCalledWith("f3", expect.objectContaining({ value: "Canal" }));
  });

  it("boolean field renders Yes/No buttons", () => {
    const onChange = jest.fn();
    render(<ChecklistField field={BOOLEAN_FIELD} value={EMPTY_VALUE} onChange={onChange} />);

    expect(screen.getByTestId("field-bool-yes")).toHaveTextContent("Yes");
    expect(screen.getByTestId("field-bool-no")).toHaveTextContent("No");

    fireEvent.click(screen.getByTestId("field-bool-yes"));
    expect(onChange).toHaveBeenCalledWith("f4", expect.objectContaining({ value: true }));
  });

  it("photo field renders upload button", () => {
    const onChange = jest.fn();
    render(<ChecklistField field={PHOTO_FIELD} value={EMPTY_VALUE} onChange={onChange} />);
    expect(screen.getByTestId("field-photo-button")).toHaveTextContent("Take photo or upload");
  });

  it("Mark N/A opens reason picker", () => {
    const onChange = jest.fn();
    render(<ChecklistField field={TEXT_FIELD} value={EMPTY_VALUE} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("field-mark-na"));
    expect(screen.getByTestId("na-reason-picker")).toBeTruthy();
    expect(screen.getAllByTestId("na-reason-option")).toHaveLength(NA_REASONS.length);
  });

  it("selecting N/A reason calls onChange with isNa + naReason", () => {
    const onChange = jest.fn();
    render(<ChecklistField field={TEXT_FIELD} value={EMPTY_VALUE} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("field-mark-na"));
    // Click first reason option
    const options = screen.getAllByTestId("na-reason-option");
    fireEvent.click(options[0]);

    expect(onChange).toHaveBeenCalledWith(
      "f1",
      expect.objectContaining({ isNa: true, naReason: "NOT_APPLICABLE", value: null }),
    );
  });

  it("N/A state renders reason label", () => {
    const onChange = jest.fn();
    const naValue: FieldValue = { value: null, isNa: true, naReason: "FARMER_ABSENT" };
    render(<ChecklistField field={TEXT_FIELD} value={naValue} onChange={onChange} />);

    expect(screen.getByTestId("field-na-state")).toHaveTextContent(
      "Marked N/A: Farmer was absent",
    );
  });

  it("undo N/A clears the N/A state", () => {
    const onChange = jest.fn();
    const naValue: FieldValue = { value: null, isNa: true, naReason: "NOT_APPLICABLE" };
    render(<ChecklistField field={TEXT_FIELD} value={naValue} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("field-clear-na"));
    expect(onChange).toHaveBeenCalledWith(
      "f1",
      expect.objectContaining({ isNa: false, naReason: null }),
    );
  });

  it("geotag toggle is present for photo with enableGeotag", () => {
    const onChange = jest.fn();
    render(<ChecklistField field={PHOTO_FIELD} value={EMPTY_VALUE} onChange={onChange} />);
    expect(screen.getByTestId("field-geotag-toggle")).toBeTruthy();
    expect(screen.getByTestId("field-geotag-label")).toHaveTextContent("Attach geotag");
  });
});

// ─── TaskFooter ───────────────────────────────────────────

describe("TaskFooter", () => {
  const noop = jest.fn();

  it("Previous disabled on first step", () => {
    render(
      <TaskFooter currentStep={1} totalSteps={5} onPrevious={noop} onNext={noop} onSubmit={noop} />,
    );
    expect(screen.getByTestId("footer-previous")).toBeDisabled();
  });

  it("Next shown when not on last step", () => {
    render(
      <TaskFooter currentStep={2} totalSteps={5} onPrevious={noop} onNext={noop} onSubmit={noop} />,
    );
    expect(screen.getByTestId("footer-next")).toBeTruthy();
    expect(screen.queryByTestId("footer-submit")).toBeNull();
  });

  it("Submit shown on last step", () => {
    render(
      <TaskFooter currentStep={5} totalSteps={5} onPrevious={noop} onNext={noop} onSubmit={noop} />,
    );
    expect(screen.getByTestId("footer-submit")).toBeTruthy();
    expect(screen.queryByTestId("footer-next")).toBeNull();
  });

  it('Submit shows "Saving..." when submitting', () => {
    render(
      <TaskFooter
        currentStep={5}
        totalSteps={5}
        onPrevious={noop}
        onNext={noop}
        onSubmit={noop}
        submitting
      />,
    );
    expect(screen.getByTestId("footer-submit")).toHaveTextContent("Saving...");
    expect(screen.getByTestId("footer-submit")).toBeDisabled();
  });
});

// ─── Page integration (demo mode) ─────────────────────────

describe("TaskDetailPage (integration)", () => {
  let TaskDetailPage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../../src/app/dashboard/queue/[taskId]/page");
    TaskDetailPage = mod.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(localStore)) delete localStore[key];
  });

  it("page renders header + field + footer in demo mode", () => {
    render(<TaskDetailPage />);
    expect(screen.getByTestId("task-detail-page")).toBeTruthy();
    expect(screen.getByTestId("task-detail-header")).toBeTruthy();
    expect(screen.getByTestId("checklist-field")).toBeTruthy();
    expect(screen.getByTestId("task-footer")).toBeTruthy();
  });

  it("next advances to step 2", () => {
    render(<TaskDetailPage />);
    // Step 1 shows first field label
    expect(screen.getByTestId("task-header-progress")).toHaveTextContent("1 / 5");

    fireEvent.click(screen.getByTestId("footer-next"));
    expect(screen.getByTestId("task-header-progress")).toHaveTextContent("2 / 5");
  });

  it("previous goes back to step 1", () => {
    render(<TaskDetailPage />);
    fireEvent.click(screen.getByTestId("footer-next")); // go to 2
    fireEvent.click(screen.getByTestId("footer-previous")); // back to 1
    expect(screen.getByTestId("task-header-progress")).toHaveTextContent("1 / 5");
  });

  it("auto-save writes to localStorage on field change", () => {
    render(<TaskDetailPage />);

    // Type into the first field (select for demo, but let's use what's rendered)
    const field = screen.getByTestId("checklist-field");
    expect(field).toBeTruthy();

    // The first demo field is a select — change it
    const select = screen.getByTestId("field-input-select");
    fireEvent.change(select, { target: { value: "Rice" } });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "sathi:task:t1",
      expect.any(String),
    );
  });

  it("loads saved progress from localStorage", () => {
    // Pre-seed localStorage with step 3
    const saved = JSON.stringify({
      answers: { f1: { value: "Wheat" } },
      currentStep: 3,
    });
    localStore["sathi:task:t1"] = saved;

    render(<TaskDetailPage />);
    expect(screen.getByTestId("task-header-progress")).toHaveTextContent("3 / 5");
  });
});

// ─── Privacy + toast (§5.5) ───────────────────────────────

describe("Task capture — privacy + toast (§5.5)", () => {
  let TaskDetailPage: React.ComponentType;
  let SUBMIT_TOAST_EN: string;

  beforeAll(async () => {
    const mod = await import("../../src/app/dashboard/queue/[taskId]/page");
    TaskDetailPage = mod.default;
    SUBMIT_TOAST_EN = mod.SUBMIT_TOAST_EN;
  });

  it('submit toast constant is exactly "Thanks, data saved."', () => {
    expect(SUBMIT_TOAST_EN).toBe("Thanks, data saved.");
  });

  it("no score-adjacent strings in rendered output", () => {
    render(<TaskDetailPage />);
    const text = (document.body.textContent || "").toLowerCase();
    expect(text).not.toContain("score updated");
    expect(text).not.toContain("trust score");
    expect(text).not.toContain("point lift");
    expect(text).not.toContain("score changed");
  });
});
