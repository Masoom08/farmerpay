/**
 * Playwright configuration for FarmerPay E2E tests (H5 — Spec §7).
 *
 * Projects:
 *   - banker: Desktop Chrome (1280×800) → tests/e2e/banker-*.spec.ts
 *   - sathi:  Tablet Chrome (1024×768) → tests/e2e/sathi-*.spec.ts
 *   - a11y:   Desktop Chrome → tests/e2e-a11y/*.spec.ts
 *
 * Run:
 *   npx playwright test                    (all projects)
 *   npx playwright test --project=banker   (banker only)
 *   npx playwright test --project=sathi    (sathi only)
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "e2e-a11y/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }]],
  timeout: 60000,

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    baseURL: process.env.BANKER_BASE_URL || "http://localhost:3000",
  },

  projects: [
    {
      name: "banker",
      testMatch: "e2e/banker-*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        baseURL: process.env.BANKER_BASE_URL || "http://localhost:3000",
      },
    },
    {
      name: "sathi",
      testMatch: "e2e/sathi-*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
        baseURL: process.env.SATHI_BASE_URL || "http://localhost:3002",
        userAgent:
          "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    },
    {
      name: "a11y",
      testMatch: "e2e-a11y/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  /* Start local dev servers before running tests (CI only) */
  webServer: process.env.CI
    ? [
        {
          command: "cd dashboard && npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120000,
        },
        {
          command: "cd dashboard-sathi && npm run dev",
          url: "http://localhost:3002",
          reuseExistingServer: true,
          timeout: 120000,
        },
      ]
    : undefined,
});
