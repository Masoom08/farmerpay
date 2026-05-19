/**
 * E2E Accessibility audit — Sathi routes (H4 — Spec §7)
 *
 * Uses Playwright + @axe-core/playwright to run full-page audits.
 * Covers all Sathi dashboard routes defined in tooling/a11y/axe.config.ts.
 *
 * Prerequisites:
 *   npm i -D @playwright/test @axe-core/playwright
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test tests/e2e-a11y/sathi-routes.spec.ts
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SATHI_PAGES = [
  "/dashboard",
  "/dashboard/queue",
  "/dashboard/farmers",
  "/dashboard/nudges",
];

const BASE_URL = process.env.SATHI_BASE_URL || "http://localhost:3002";

for (const route of SATHI_PAGES) {
  test(`Sathi ${route} has no serious a11y violations`, async ({ page }) => {
    await page.goto(`${BASE_URL}${route}?demo=true`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(["color-contrast"])
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

test("Sathi dashboard has no score-adjacent ARIA labels", async ({ page }) => {
  for (const route of SATHI_PAGES) {
    await page.goto(`${BASE_URL}${route}?demo=true`);
    await page.waitForLoadState("networkidle");

    const violations = await page.evaluate(() => {
      const found: string[] = [];
      const forbidden = ["score", "trust score", "point lift", "cibil"];
      document.querySelectorAll("[aria-label]").forEach((el) => {
        const label = (el.getAttribute("aria-label") || "").toLowerCase();
        for (const term of forbidden) {
          if (label.includes(term)) {
            found.push(`aria-label="${el.getAttribute("aria-label")}" contains "${term}"`);
          }
        }
      });
      return found;
    });

    expect(violations).toHaveLength(0);
  }
});

test("Sathi queue page: task cards are keyboard-accessible", async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard/queue?demo=true`);
  await page.waitForLoadState("networkidle");

  // All interactive task cards should be focusable
  const cards = page.locator("[data-testid='task-card'] a, [data-testid='task-card'] button");
  const count = await cards.count();

  for (let i = 0; i < Math.min(count, 5); i++) {
    const el = cards.nth(i);
    await el.focus();
    expect(await el.evaluate((e) => document.activeElement === e)).toBe(true);
  }
});
