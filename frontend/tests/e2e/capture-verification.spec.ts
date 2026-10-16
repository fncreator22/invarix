import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const evidenceDir = path.resolve(__dirname, "../../../docs/verification_evidence");

test.describe("Visual Re-verification & Screenshot Inspection", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test("01: Hero Viewport 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // Capture initial viewport (Hero section + navbar)
    await page.screenshot({ path: path.join(evidenceDir, "01-hero-1440x900.png") });

    // Also capture full hero section
    const heroSection = page.locator("section[aria-labelledby='hero-title']");
    if ((await heroSection.count()) > 0) {
      await heroSection.screenshot({ path: path.join(evidenceDir, "01-hero-section-box.png") });
    }
  });

  test("02: Hero Viewport 1280x800", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(evidenceDir, "02-hero-1280x800.png") });
  });

  test("03: Verify Redirection - Launch Live Sandbox", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Target the specific Hero button
    const heroSection = page.locator("section[aria-labelledby='hero-title']");
    const sandboxLink = heroSection.getByRole("link", { name: "Launch Live Sandbox (0 Login)" });
    await expect(sandboxLink).toBeVisible();
    await sandboxLink.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Verify URL does not have spaces (%20) or 404
    console.log("Current URL after clicking sandbox:", page.url());
    expect(page.url()).toContain("/w/northwind-pay/home");
    await page.screenshot({ path: path.join(evidenceDir, "03-sandbox-home-redirected.png") });
  });

  test("04: Reviews Page - Link Profile Dialog", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3001/w/northwind-pay/reviews", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(evidenceDir, "04-reviews-before-link.png") });

    // Look for "Link your profile" or "Link my profile"
    const linkButton = page.getByRole("button", { name: /Link (my|your) profile/i });
    if ((await linkButton.count()) > 0) {
      await linkButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(evidenceDir, "05-reviews-profile-modal-open.png") });
    }
  });

  test("05: Settings Page - Profile & Alignment", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3001/w/northwind-pay/settings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(evidenceDir, "06-settings-general.png") });

    // Navigate to Billing tab
    await page.goto("http://localhost:3001/w/northwind-pay/settings/billing", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(evidenceDir, "07-settings-billing.png") });
  });

  test("06: Settings Integrations - Authentic Brand Logos", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3001/w/northwind-pay/settings/integrations", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(evidenceDir, "08-settings-integrations-logos.png") });
  });

  test("07: Landing Page - Ask Steward does not pop up on scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Scroll down multiple times
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(evidenceDir, "09-landing-scrolled-no-steward.png") });

    // Verify Ask Steward is NOT in the marketing nav for anonymous users
    const navSteward = page.locator("header nav").getByRole("button", { name: /ask steward/i });
    expect(await navSteward.count()).toBe(0);
  });
});

