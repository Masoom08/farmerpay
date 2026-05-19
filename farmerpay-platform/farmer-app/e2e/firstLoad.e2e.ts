/**
 * Detox smoke test — TRUST v2 first load
 *
 * Verifies the app launches and the MyScore tab is accessible.
 * Run with: detox test --configuration android.emu.debug
 */

import { device, element, by, expect as detoxExpect } from "detox";

describe("First Load", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("should launch the app successfully", async () => {
    // The app should render without crashing
    await detoxExpect(element(by.id("app-root"))).toBeVisible();
  });

  it("should display the My Score tab", async () => {
    // MyScore is the primary farmer-facing TRUST v2 screen
    await detoxExpect(
      element(by.text("My Score")).atIndex(0),
    ).toBeVisible();
  });

  it("should navigate to My Score screen", async () => {
    await element(by.text("My Score")).atIndex(0).tap();
    // Verify the score screen loads (may show skeleton while loading)
    await detoxExpect(
      element(by.id("my-score-screen")),
    ).toBeVisible();
  });
});
