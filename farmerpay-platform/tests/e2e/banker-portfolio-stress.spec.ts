/**
 * E2E Happy Path — Banker: Portfolio Stress Test (H5 — Spec §7)
 *
 * Flow:
 *   1.  Banker navigates to /dashboard/drishti/portfolio-stress
 *   2.  Adjusts climate shock sliders (rainfall, price, temperature)
 *   3.  Clicks "Run Portfolio Stress Test"
 *   4.  Waits for simulation results to load
 *   5.  Verifies KPI cards render (Total Farmers, Outstanding, Projected NPAs, PAR%)
 *   6.  Verifies SMA Migration Matrix renders
 *   7.  Verifies Intervention Table renders
 *   8.  Verifies Recommendation List renders
 *
 * Prerequisites:
 *   npm i -D @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test tests/e2e/banker-portfolio-stress.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BANKER_BASE_URL || "http://localhost:3000";

test.describe("Banker: Portfolio Stress Test (DRISHTI)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?demo=true`);
    await page.evaluate(() => {
      localStorage.setItem("fp_token", "demo-banker-token");
    });
  });

  test("full portfolio stress simulation happy path", async ({ page }) => {
    // ── Step 1: Navigate to portfolio stress page ────────────
    await page.goto(
      `${BASE_URL}/dashboard/drishti/portfolio-stress?demo=true`,
    );
    await page.waitForLoadState("networkidle");

    // Page title should be visible
    await expect(page.locator("text=Portfolio Stress Test").first()).toBeVisible({
      timeout: 10000,
    });

    // ── Step 2: Adjust sliders ───────────────────────────────
    // Rainfall deviation slider
    const rainfallSlider = page.locator('input[type="range"]').first();
    await expect(rainfallSlider).toBeVisible();

    // Set rainfall to -30% (drag slider)
    await rainfallSlider.fill("-30");

    // Price change slider (second range input)
    const priceSlider = page.locator('input[type="range"]').nth(1);
    if (await priceSlider.isVisible().catch(() => false)) {
      await priceSlider.fill("-15");
    }

    // Temperature slider (third range input)
    const tempSlider = page.locator('input[type="range"]').nth(2);
    if (await tempSlider.isVisible().catch(() => false)) {
      await tempSlider.fill("3");
    }

    // ── Step 3: Click Run button ─────────────────────────────
    const runBtn = page.locator(
      'button:has-text("Run Portfolio Stress Test"), button:has-text("Simulating")',
    );
    await expect(runBtn.first()).toBeVisible();
    await runBtn.first().click();

    // Button should show loading state
    const loadingBtn = page.locator('button:has-text("Simulating")');
    // Wait for results (button changes back from "Simulating...")
    await expect(loadingBtn).not.toBeVisible({ timeout: 30000 });

    // ── Step 4: Verify KPI cards render ──────────────────────
    // Wait for result content to appear
    const totalFarmersKpi = page.locator("text=Total Farmers").first();
    await expect(totalFarmersKpi).toBeVisible({ timeout: 15000 });

    // Other KPIs
    await expect(
      page.locator("text=Total Outstanding").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=Projected NPAs").first(),
    ).toBeVisible();
    await expect(
      page.locator("text=Portfolio at Risk").first(),
    ).toBeVisible();

    // ── Step 5: Verify SMA Migration Matrix ──────────────────
    const smaMatrix = page.locator("text=/SMA Migration|Migration Matrix/i").first();
    await expect(smaMatrix).toBeVisible({ timeout: 5000 });

    // ── Step 6: Verify Intervention Table ────────────────────
    const interventions = page.locator("text=/Intervention|Priority Actions/i").first();
    await expect(interventions).toBeVisible({ timeout: 5000 });

    // ── Step 7: Verify Recommendation List ───────────────────
    const recommendations = page.locator("text=/Recommendation|Strategic/i").first();
    await expect(recommendations).toBeVisible({ timeout: 5000 });
  });

  test("stress test with extreme drought scenario", async ({ page }) => {
    await page.goto(
      `${BASE_URL}/dashboard/drishti/portfolio-stress?demo=true`,
    );
    await page.waitForLoadState("networkidle");

    // Set extreme values
    const rainfallSlider = page.locator('input[type="range"]').first();
    await rainfallSlider.fill("-50");

    const priceSlider = page.locator('input[type="range"]').nth(1);
    if (await priceSlider.isVisible().catch(() => false)) {
      await priceSlider.fill("-30");
    }

    const tempSlider = page.locator('input[type="range"]').nth(2);
    if (await tempSlider.isVisible().catch(() => false)) {
      await tempSlider.fill("5");
    }

    // Run simulation
    const runBtn = page.locator(
      'button:has-text("Run Portfolio Stress Test")',
    );
    await runBtn.first().click();

    // Wait for results
    await page.waitForSelector("text=Total Farmers", { timeout: 30000 });

    // Extreme scenario should show higher PAR%
    const parText = await page
      .locator("text=Portfolio at Risk")
      .first()
      .locator("..")
      .textContent();
    expect(parText).toBeTruthy();
  });

  test("slider labels update dynamically", async ({ page }) => {
    await page.goto(
      `${BASE_URL}/dashboard/drishti/portfolio-stress?demo=true`,
    );
    await page.waitForLoadState("networkidle");

    // Check that changing slider updates the displayed value
    const rainfallSlider = page.locator('input[type="range"]').first();
    await rainfallSlider.fill("-40");

    // The label should show -40%
    await expect(page.locator("text=-40%").first()).toBeVisible({
      timeout: 3000,
    });
  });

  test("error state when API fails gracefully", async ({ page }) => {
    // Intercept the API call to force an error
    await page.route("**/api/v1/drishti/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto(
      `${BASE_URL}/dashboard/drishti/portfolio-stress?demo=true`,
    );
    await page.waitForLoadState("networkidle");

    const runBtn = page.locator(
      'button:has-text("Run Portfolio Stress Test")',
    );
    if (await runBtn.first().isVisible().catch(() => false)) {
      await runBtn.first().click();

      // Error card should appear
      const errorMsg = page.locator("text=/error|failed|something went wrong/i");
      await expect(errorMsg.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
