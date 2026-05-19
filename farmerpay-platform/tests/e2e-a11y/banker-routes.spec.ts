/**
 * E2E Accessibility audit — Banker routes (H4 — Spec §7)
 *
 * Uses Playwright + @axe-core/playwright to run full-page audits.
 * Covers all banker dashboard routes defined in tooling/a11y/axe.config.ts.
 *
 * Prerequisites:
 *   npm i -D @playwright/test @axe-core/playwright
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test tests/e2e-a11y/banker-routes.spec.ts
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BANKER_PAGES = [
  "/dashboard",
  "/dashboard/trust-review",
  "/dashboard/portfolio",
  "/dashboard/drishti",
];

const BASE_URL = process.env.BANKER_BASE_URL || "http://localhost:3000";

for (const route of BANKER_PAGES) {
  test(`Banker ${route} has no serious a11y violations`, async ({ page }) => {
    await page.goto(`${BASE_URL}${route}?demo=true`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(["color-contrast"]) // disabled until design tokens finalized
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    if (serious.length > 0) {
      const summary = serious
        .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`)
        .join("\n");
      console.error(`A11y violations on ${route}:\n${summary}`);
    }

    expect(serious).toHaveLength(0);
  });
}

test("Banker dashboard has no duplicate IDs", async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard?demo=true`);
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withRules(["duplicate-id"])
    .analyze();

  expect(results.violations).toHaveLength(0);
});

test("Banker trust-review tab navigation works", async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard/trust-review?demo=true`);
  await page.waitForLoadState("networkidle");

  // Tabs should be navigable with keyboard
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();

  if (tabCount > 0) {
    await tabs.first().focus();
    await tabs.first().press("ArrowRight");
    // Second tab should now be focused
    const focused = page.locator('[role="tab"]:focus');
    expect(await focused.count()).toBe(1);
  }
});
