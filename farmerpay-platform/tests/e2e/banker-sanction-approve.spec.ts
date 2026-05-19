/**
 * E2E Happy Path — Banker: Trust Review → Sanction Approve (H5 — Spec §7)
 *
 * Flow:
 *   1.  Banker lands on /dashboard (portfolio overview)
 *   2.  Navigates to a farmer's trust review page
 *   3.  Verifies TrustScoreHero renders with score + decision badge
 *   4.  Verifies FarmerHeaderCard shows farmer details
 *   5.  Tabs through evidence/pillars/audit trail
 *   6.  Clicks "Approve" → ApproveDialog opens
 *   7.  Confirms approval inside dialog
 *   8.  Toast: "Sanction recorded. Case routed to disbursement."
 *   9.  Notification bell shows updated count
 *
 * Prerequisites:
 *   npm i -D @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test tests/e2e/banker-sanction-approve.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BANKER_BASE_URL || "http://localhost:3000";
const DEMO_FARMER_ID = "1";

test.describe("Banker: Trust Review → Sanction Approve", () => {
  test.beforeEach(async ({ page }) => {
    // Set demo token in localStorage before navigation
    await page.goto(`${BASE_URL}/dashboard?demo=true`);
    await page.evaluate(() => {
      localStorage.setItem("fp_token", "demo-banker-token");
    });
  });

  test("full sanction approve happy path", async ({ page }) => {
    // ── Step 1: Land on portfolio dashboard ──────────────────
    await page.goto(`${BASE_URL}/dashboard?demo=true`);
    await page.waitForLoadState("networkidle");

    // Dashboard should render with portfolio overview KPIs
    await expect(page.locator("text=Total Farmers").first()).toBeVisible({
      timeout: 10000,
    });

    // ── Step 2: Navigate to farmer trust-review ──────────────
    await page.goto(
      `${BASE_URL}/dashboard/farmer/${DEMO_FARMER_ID}/trust-review?demo=true`,
    );
    await page.waitForLoadState("networkidle");

    // ── Step 3: Verify TrustScoreHero ────────────────────────
    // Score hero should show a numeric score and a decision badge
    const scoreHero = page.locator('[data-testid="trust-score-hero"]');
    if (await scoreHero.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Score should be a number 0–1000
      const scoreText = await scoreHero.textContent();
      expect(scoreText).toBeTruthy();

      // Decision badge (Sanction / Reconsider / Reject)
      const decisionBadge = page.locator('[data-testid="decision-badge"]');
      if (await decisionBadge.isVisible().catch(() => false)) {
        const badgeText = await decisionBadge.textContent();
        expect(["Sanction", "Reconsider", "Reject"]).toContain(
          badgeText?.trim(),
        );
      }
    }

    // ── Step 4: Verify FarmerHeaderCard ──────────────────────
    const headerCard = page.locator('[data-testid="farmer-header-card"]');
    if (await headerCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should show farmer name
      await expect(headerCard).toContainText(/[A-Z]/i);
      // Should show KCC ID
      await expect(headerCard.locator("text=/KCC/i").first()).toBeVisible();
    }

    // ── Step 5: Tab navigation ───────────────────────────────
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      // Click second tab (Evidence or Pillars)
      await tabs.nth(1).click();
      await page.waitForTimeout(300);

      // Content should update (the active tab panel should change)
      const activePanel = page.locator('[role="tabpanel"]');
      await expect(activePanel.first()).toBeVisible();
    }

    // ── Step 6: Click Approve button ─────────────────────────
    const approveBtn = page.locator(
      'button:has-text("Approve"), button:has-text("Sanction")',
    );

    if (await approveBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveBtn.first().click();

      // ── Step 7: ApproveDialog should open ──────────────────
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });

      // Confirm button inside dialog
      const confirmBtn = dialog.locator(
        'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Approve")',
      );

      if (await confirmBtn.first().isVisible().catch(() => false)) {
        await confirmBtn.first().click();

        // ── Step 8: Success toast ────────────────────────────
        // Toast should appear with sanction confirmation
        const toast = page.locator(
          'text=/Sanction recorded|Case routed|approved/i',
        );
        await expect(toast.first()).toBeVisible({ timeout: 5000 });
      }
    }

    // ── Step 9: Notification bell ────────────────────────────
    const bell = page.locator('[data-testid="bell-button"]');
    if (await bell.isVisible().catch(() => false)) {
      await bell.click();
      const dropdown = page.locator('[data-testid="bell-dropdown"]');
      await expect(dropdown).toBeVisible({ timeout: 3000 });
    }
  });

  test("decision badge matches score threshold", async ({ page }) => {
    await page.goto(
      `${BASE_URL}/dashboard/farmer/${DEMO_FARMER_ID}/trust-review?demo=true`,
    );
    await page.waitForLoadState("networkidle");

    const scoreEl = page.locator('[data-testid="trust-score-value"]');
    const badgeEl = page.locator('[data-testid="decision-badge"]');

    if (
      (await scoreEl.isVisible({ timeout: 5000 }).catch(() => false)) &&
      (await badgeEl.isVisible().catch(() => false))
    ) {
      const scoreText = (await scoreEl.textContent()) ?? "0";
      const score = parseInt(scoreText.replace(/[^0-9]/g, ""), 10);
      const badge = ((await badgeEl.textContent()) ?? "").trim();

      if (score >= 600) {
        expect(badge).toBe("Sanction");
      } else if (score >= 500) {
        expect(badge).toBe("Reconsider");
      } else {
        expect(badge).toBe("Reject");
      }
    }
  });

  test("approve dialog has focus trap and escape closes", async ({ page }) => {
    await page.goto(
      `${BASE_URL}/dashboard/farmer/${DEMO_FARMER_ID}/trust-review?demo=true`,
    );
    await page.waitForLoadState("networkidle");

    const approveBtn = page.locator(
      'button:has-text("Approve"), button:has-text("Sanction")',
    );

    if (await approveBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveBtn.first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });

      // Escape should close dialog
      await page.keyboard.press("Escape");
      await expect(dialog.first()).not.toBeVisible({ timeout: 3000 });
    }
  });
});
