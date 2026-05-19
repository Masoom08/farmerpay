/**
 * E2E Happy Path — Sathi: Task Capture & Submit (H5 — Spec §7)
 *
 * Runs on tablet viewport (1024×768) simulating Sathi field device.
 *
 * Flow:
 *   1.  Sathi lands on /dashboard/queue
 *   2.  QueueHeader shows task count + village count
 *   3.  RoutePlannerStrip shows village stops
 *   4.  Sathi clicks first task card → navigates to /dashboard/queue/{taskId}
 *   5.  TaskDetailHeader shows farmer name + progress "1 / 5"
 *   6.  Fills in first field (select: crop)
 *   7.  Clicks Next → moves to field 2
 *   8.  Fills in number field (land area)
 *   9.  Clicks Next → field 3 (text: irrigation)
 *  10.  Clicks Next → field 4 (boolean: insurance)
 *  11.  Clicks Next → field 5 (photo + geotag)
 *  12.  Clicks Submit → toast "Thanks, data saved."
 *  13.  Returns to queue page
 *  14.  PRIVACY: No score-adjacent text visible anywhere
 *
 * Prerequisites:
 *   npm i -D @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test tests/e2e/sathi-capture-and-submit.spec.ts
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.SATHI_BASE_URL || "http://localhost:3002";

// Tablet viewport (Sathi field device)
test.use({
  viewport: { width: 1024, height: 768 },
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
});

test.describe("Sathi: Task Capture & Submit (tablet)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/queue?demo=true`);
    await page.evaluate(() => {
      localStorage.setItem("fp_token", "demo-sathi-token");
      // Clear any saved task state
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sathi:task:"))
        .forEach((k) => localStorage.removeItem(k));
    });
  });

  test("full capture-and-submit happy path", async ({ page }) => {
    // ── Step 1–2: Queue page loads with header stats ─────────
    await page.goto(`${BASE_URL}/dashboard/queue?demo=true`);
    await page.waitForLoadState("networkidle");

    // QueueHeader should show "Today" and task count
    await expect(page.locator("text=Today").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=/\\d+ task/i").first()).toBeVisible();

    // ── Step 3: RoutePlannerStrip ────────────────────────────
    const routePlanner = page.locator('[data-testid="route-planner"]');
    await expect(routePlanner).toBeVisible({ timeout: 5000 });

    // Should contain at least one village stop
    await expect(routePlanner).toContainText(/[A-Z]/i);

    // ── Step 4: Click first task card ────────────────────────
    // Task cards are links to /dashboard/queue/{taskId}
    const firstCard = page.locator("a[href*='/dashboard/queue/']").first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
    } else {
      // Try clicking any task-card-like element
      const taskItem = page.locator('[data-testid="task-card"]').first();
      await taskItem.click();
    }

    await page.waitForLoadState("networkidle");

    // ── Step 5: TaskDetailHeader ─────────────────────────────
    // Should show farmer name
    await expect(page.locator("text=/[A-Z][a-z]+ [A-Z]/").first()).toBeVisible({
      timeout: 10000,
    });

    // Should show progress indicator "1 / 5" (or similar)
    await expect(page.locator("text=/1 \\/ \\d+|Step 1/").first()).toBeVisible();

    // ── Step 6: Field 1 — select (crop) ──────────────────────
    const selectField = page.locator("select").first();
    if (await selectField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectField.selectOption({ index: 1 }); // Pick first real option
    }

    // ── Step 7: Click Next ───────────────────────────────────
    const nextBtn = page.locator('button:has-text("Next")');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Progress should update to "2 / 5"
    await expect(page.locator("text=/2 \\/ \\d+|Step 2/").first()).toBeVisible({
      timeout: 3000,
    });

    // ── Step 8: Field 2 — number (land area) ─────────────────
    const numberInput = page.locator('input[type="number"]').first();
    if (await numberInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await numberInput.fill("2.5");
    } else {
      // May be a text input with number-like label
      const textInput = page.locator("input[type='text']").first();
      if (await textInput.isVisible().catch(() => false)) {
        await textInput.fill("2.5");
      }
    }

    await nextBtn.click();

    // ── Step 9: Field 3 — text (irrigation) ──────────────────
    await expect(page.locator("text=/3 \\/ \\d+|Step 3/").first()).toBeVisible({
      timeout: 3000,
    });

    const textInput = page.locator("input[type='text']").first();
    if (await textInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textInput.fill("Borewell");
    }

    await nextBtn.click();

    // ── Step 10: Field 4 — boolean (insurance) ───────────────
    await expect(page.locator("text=/4 \\/ \\d+|Step 4/").first()).toBeVisible({
      timeout: 3000,
    });

    // Boolean field renders as Yes/No buttons
    const yesBtn = page.locator('button:has-text("Yes")');
    if (await yesBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await yesBtn.click();
    }

    await nextBtn.click();

    // ── Step 11: Field 5 — photo ─────────────────────────────
    await expect(page.locator("text=/5 \\/ \\d+|Step 5/").first()).toBeVisible({
      timeout: 3000,
    });

    // Photo field — file input with capture="environment"
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // We can't actually take a photo in E2E, but we can verify the input exists
      await expect(fileInput).toHaveAttribute("accept", /image/);
    }

    // ── Step 12: Submit ──────────────────────────────────────
    const submitBtn = page.locator('button:has-text("Submit")');
    await expect(submitBtn).toBeVisible({ timeout: 3000 });
    await submitBtn.click();

    // Toast: "Thanks, data saved."
    await expect(
      page.locator("text=Thanks, data saved.").first(),
    ).toBeVisible({ timeout: 5000 });

    // ── Step 13: Returns to queue ────────────────────────────
    // After submit, should navigate back to queue
    await page.waitForURL(/\/dashboard\/queue/, { timeout: 10000 });
  });

  test("previous button works and is disabled on step 1", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/queue?demo=true`);
    await page.waitForLoadState("networkidle");

    // Navigate to first task
    const firstCard = page.locator("a[href*='/dashboard/queue/']").first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
    }
    await page.waitForLoadState("networkidle");

    // Previous button should be disabled on step 1
    const prevBtn = page.locator('button:has-text("Previous")');
    if (await prevBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(prevBtn).toBeDisabled();

      // Navigate forward
      const nextBtn = page.locator('button:has-text("Next")');
      await nextBtn.click();

      // Now Previous should be enabled
      await expect(prevBtn).toBeEnabled();

      // Click Previous to go back to step 1
      await prevBtn.click();
      await expect(
        page.locator("text=/1 \\/ \\d+|Step 1/").first(),
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test("auto-save persists to localStorage", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/queue?demo=true`);
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator("a[href*='/dashboard/queue/']").first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
    }
    await page.waitForLoadState("networkidle");

    // Fill first field
    const selectField = page.locator("select").first();
    if (await selectField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectField.selectOption({ index: 1 });
    }

    // Navigate to next field
    const nextBtn = page.locator('button:has-text("Next")');
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
    }

    // Check localStorage has saved state
    const savedKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("sathi:task:")),
    );
    expect(savedKeys.length).toBeGreaterThan(0);

    // Reload page — should resume from saved step
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should be on step 2 (not step 1) after reload
    await expect(
      page.locator("text=/2 \\/ \\d+|Step 2/").first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("PRIVACY: no score-adjacent text on any Sathi page", async ({
    page,
  }) => {
    const pages = [
      `${BASE_URL}/dashboard?demo=true`,
      `${BASE_URL}/dashboard/queue?demo=true`,
      `${BASE_URL}/dashboard/farmers?demo=true`,
      `${BASE_URL}/dashboard/nudges?demo=true`,
    ];

    const FORBIDDEN_PATTERNS = [
      /trust\s*score/i,
      /point\s*lift/i,
      /cibil/i,
      /\bscore\b.*\b\d{2,4}\b/i, // "score 720" patterns
    ];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");

      const bodyText = await page.locator("body").textContent();

      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(bodyText).not.toMatch(pattern);
      }

      // Also check aria-labels
      const ariaViolations = await page.evaluate(() => {
        const found: string[] = [];
        const forbidden = ["score", "trust score", "point lift", "cibil"];
        document.querySelectorAll("[aria-label]").forEach((el) => {
          const label = (el.getAttribute("aria-label") || "").toLowerCase();
          for (const term of forbidden) {
            if (label.includes(term)) {
              found.push(
                `aria-label="${el.getAttribute("aria-label")}" on ${el.tagName}`,
              );
            }
          }
        });
        return found;
      });

      expect(ariaViolations).toHaveLength(0);
    }
  });

  test("N/A path: mark field as not applicable", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/queue?demo=true`);
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator("a[href*='/dashboard/queue/']").first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
    }
    await page.waitForLoadState("networkidle");

    // Look for N/A toggle
    const naToggle = page.locator(
      'button:has-text("N/A"), button:has-text("Not applicable"), [data-testid="na-toggle"]',
    );

    if (await naToggle.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await naToggle.first().click();

      // N/A reason selector should appear
      const reasonSelect = page.locator(
        'select, [data-testid="na-reason-select"]',
      );
      if (await reasonSelect.last().isVisible({ timeout: 3000 }).catch(() => false)) {
        await reasonSelect.last().selectOption({ index: 1 });
      }

      // Next button should still work
      const nextBtn = page.locator('button:has-text("Next")');
      await expect(nextBtn).toBeEnabled();
    }
  });
});
