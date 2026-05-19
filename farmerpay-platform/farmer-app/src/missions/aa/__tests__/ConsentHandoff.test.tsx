/**
 * ConsentHandoff — Unit Tests (F2 — Spec §4.1)
 *
 * Tests:
 *   IN-FLIGHT
 *   1.  Shows progress UI on mount
 *   2.  Progress title shown (en)
 *   3.  Progress bar visible
 *   4.  45-second estimate text shown
 *
 *   SUCCESS
 *   5.  On SDK success, calls onSuccess with consentId
 *   6.  Shows success view
 *
 *   ERROR: DENIED
 *   7.  Denied renders correct title
 *   8.  Denied renders correct body (en)
 *   9.  Denied renders correct body (hi)
 *  10.  Denied shows retry button
 *  11.  Retry fires onRetry
 *
 *   ERROR: BANK_UNAVAILABLE
 *  12.  Bank unavailable renders correct title
 *  13.  Bank unavailable renders correct body
 *  14.  Bank unavailable shows retry button
 *
 *   ERROR: TIMEOUT
 *  15.  Timeout renders correct title
 *  16.  Timeout renders "We'll notify you" body
 *  17.  Timeout does NOT show retry button
 *  18.  Timeout shows back button
 *
 *   ERROR: GENERIC
 *  19.  Generic error renders fallback copy
 *
 *   BACK
 *  20.  Back button fires onBack on error states
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { fireEvent } from "@testing-library/react-native";
import {
  ConsentHandoff,
  type ConsentHandoffProps,
  type AaSdk,
  type AaSdkResult,
} from "../ConsentHandoff";

// ─── Helpers ───────────────────────────────────────────────────

function createMockSdk(result: AaSdkResult, delayMs = 0): AaSdk {
  return {
    initiateConsent: jest.fn(
      () =>
        new Promise<AaSdkResult>((resolve) => {
          if (delayMs > 0) {
            setTimeout(() => resolve(result), delayMs);
          } else {
            resolve(result);
          }
        }),
    ),
  };
}

const DEFAULT_PROPS: ConsentHandoffProps = {
  aaSdk: createMockSdk({ status: "SUCCESS", consentId: "c-123" }),
  locale: "en",
  onSuccess: jest.fn(),
  onRetry: jest.fn(),
  onBack: jest.fn(),
  timeoutMs: 45000,
};

const renderHandoff = (overrides: Partial<ConsentHandoffProps> = {}) =>
  render(<ConsentHandoff {...DEFAULT_PROPS} {...overrides} />);

// ─── In-flight tests ───────────────────────────────────────────

describe("ConsentHandoff (in-flight)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows progress UI on mount", () => {
    // Use a long delay so we stay in IN_FLIGHT
    const sdk = createMockSdk({ status: "SUCCESS", consentId: "c-1" }, 10000);
    renderHandoff({ aaSdk: sdk });

    expect(screen.getByTestId("consent-in-flight")).toBeTruthy();
  });

  it("progress title shown (en)", () => {
    const sdk = createMockSdk({ status: "SUCCESS", consentId: "c-1" }, 10000);
    renderHandoff({ aaSdk: sdk, locale: "en" });

    expect(screen.getByText("Connecting to your bank…")).toBeTruthy();
  });

  it("progress bar visible", () => {
    const sdk = createMockSdk({ status: "SUCCESS", consentId: "c-1" }, 10000);
    renderHandoff({ aaSdk: sdk });

    expect(screen.getByTestId("consent-progress-bar")).toBeTruthy();
  });

  it("45-second estimate text shown", () => {
    const sdk = createMockSdk({ status: "SUCCESS", consentId: "c-1" }, 10000);
    renderHandoff({ aaSdk: sdk, locale: "en" });

    expect(screen.getByText("This usually takes about 45 seconds.")).toBeTruthy();
  });
});

// ─── Success tests ─────────────────────────────────────────────

describe("ConsentHandoff (success)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("on SDK success, calls onSuccess with consentId", async () => {
    const onSuccess = jest.fn();
    const sdk = createMockSdk({ status: "SUCCESS", consentId: "c-abc" });
    renderHandoff({ aaSdk: sdk, onSuccess });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith("c-abc");
    });
  });

  it("shows success view", async () => {
    const sdk = createMockSdk({ status: "SUCCESS", consentId: "c-abc" });
    renderHandoff({ aaSdk: sdk });

    await waitFor(() => {
      expect(screen.getByTestId("consent-success")).toBeTruthy();
    });
  });
});

// ─── Denied tests ──────────────────────────────────────────────

describe("ConsentHandoff (denied)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("denied renders correct title", async () => {
    const sdk = createMockSdk({ status: "DENIED" });
    renderHandoff({ aaSdk: sdk, locale: "en" });

    await waitFor(() => {
      expect(screen.getByTestId("consent-error-denied")).toBeTruthy();
    });

    expect(screen.getByText("Consent not given")).toBeTruthy();
  });

  it("denied renders correct body (en)", async () => {
    const sdk = createMockSdk({ status: "DENIED" });
    renderHandoff({ aaSdk: sdk, locale: "en" });

    await waitFor(() => {
      expect(
        screen.getByText("You didn't share. You can try again any time."),
      ).toBeTruthy();
    });
  });

  it("denied renders correct body (hi)", async () => {
    const sdk = createMockSdk({ status: "DENIED" });
    renderHandoff({ aaSdk: sdk, locale: "hi" });

    await waitFor(() => {
      expect(
        screen.getByText(
          "आपने साझा नहीं किया। आप कभी भी पुनः प्रयास कर सकते हैं।",
        ),
      ).toBeTruthy();
    });
  });

  it("denied shows retry button", async () => {
    const sdk = createMockSdk({ status: "DENIED" });
    renderHandoff({ aaSdk: sdk });

    await waitFor(() => {
      expect(screen.getByTestId("consent-retry-btn")).toBeTruthy();
    });
  });

  it("retry fires onRetry", async () => {
    const onRetry = jest.fn();
    const sdk = createMockSdk({ status: "DENIED" });
    renderHandoff({ aaSdk: sdk, onRetry });

    await waitFor(() => {
      expect(screen.getByTestId("consent-retry-btn")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("consent-retry-btn"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// ─── Bank unavailable tests ────────────────────────────────────

describe("ConsentHandoff (bank unavailable)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("bank unavailable renders correct title", async () => {
    const sdk = createMockSdk({ status: "BANK_UNAVAILABLE" });
    renderHandoff({ aaSdk: sdk, locale: "en" });

    await waitFor(() => {
      expect(screen.getByText("Bank not available")).toBeTruthy();
    });
  });

  it("bank unavailable renders correct body", async () => {
    const sdk = createMockSdk({ status: "BANK_UNAVAILABLE" });
    renderHandoff({ aaSdk: sdk, locale: "en" });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Your bank is currently unavailable. Please try again later.",
        ),
      ).toBeTruthy();
    });
  });

  it("bank unavailable shows retry button", async () => {
    const sdk = createMockSdk({ status: "BANK_UNAVAILABLE" });
    renderHandoff({ aaSdk: sdk });

    await waitFor(() => {
      expect(screen.getByTestId("consent-retry-btn")).toBeTruthy();
    });
  });
});

// ─── Timeout tests ─────────────────────────────────────────────

describe("ConsentHandoff (timeout)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("timeout renders correct title", async () => {
    const sdk = createMockSdk({ status: "TIMEOUT" });
    renderHandoff({ aaSdk: sdk, locale: "en" });

    await waitFor(() => {
      expect(screen.getByText("Taking longer than expected")).toBeTruthy();
    });
  });

  it('timeout renders "We\'ll notify you" body', async () => {
    const sdk = createMockSdk({ status: "TIMEOUT" });
    renderHandoff({ aaSdk: sdk, locale: "en" });

    await waitFor(() => {
      expect(
        screen.getByText("We'll notify you when it's done."),
      ).toBeTruthy();
    });
  });

  it("timeout does NOT show retry button", async () => {
    const sdk = createMockSdk({ status: "TIMEOUT" });
    renderHandoff({ aaSdk: sdk });

    await waitFor(() => {
      expect(screen.getByTestId("consent-error-timeout")).toBeTruthy();
    });

    expect(screen.queryByTestId("consent-retry-btn")).toBeNull();
  });

  it("timeout shows back button", async () => {
    const sdk = createMockSdk({ status: "TIMEOUT" });
    renderHandoff({ aaSdk: sdk });

    await waitFor(() => {
      expect(screen.getByTestId("consent-back-btn")).toBeTruthy();
    });
  });
});

// ─── Generic error tests ───────────────────────────────────────

describe("ConsentHandoff (generic error)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("generic error renders fallback copy", async () => {
    const sdk = createMockSdk({ status: "ERROR" });
    renderHandoff({ aaSdk: sdk, locale: "en" });

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeTruthy();
    });
  });
});

// ─── Back button tests ─────────────────────────────────────────

describe("ConsentHandoff (back)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("back button fires onBack on error states", async () => {
    const onBack = jest.fn();
    const sdk = createMockSdk({ status: "DENIED" });
    renderHandoff({ aaSdk: sdk, onBack });

    await waitFor(() => {
      expect(screen.getByTestId("consent-back-btn")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("consent-back-btn"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
