import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const targetDir = path.resolve(__dirname, "../../../docs/judge_evidence");

test.describe("Capture Live Platform Evidence for Sandbox Judges", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  });

  test("01: Landing Page 30s View (1280x800)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Initial 0-10s viewport (Hero + Proof Strip)
    await page.screenshot({ path: path.join(targetDir, "01-first-impression-viewport.png") });

    // Outage Post-Mortems Wipe Band
    const caseStudies = page.locator("#case-studies");
    if ((await caseStudies.count()) > 0) {
      await caseStudies.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(targetDir, "02-outage-wipe-bands.png") });
    }

    // Developer Hub
    const devHub = page.locator("#developer-hub");
    if ((await devHub.count()) > 0) {
      await devHub.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(targetDir, "03-developer-surfaces-bento.png") });
    }

    // Product Telemetry & Scrubber
    const telemetry = page.locator("section[aria-labelledby='telemetry-heading']");
    if ((await telemetry.count()) > 0) {
      await telemetry.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(targetDir, "04-product-telemetry-scrubber.png") });
    }
  });

  test("02: Product App - Dashboard & Risk Map", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/w/northwind-pay/home", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(targetDir, "05-dashboard-home.png") });
  });

  test("03: Product App - Living Graph & Outage Simulation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/w/northwind-pay/graph", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(targetDir, "06-graph-explorer-canvas.png") });
  });

  test("04: Rules Catalog", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("http://localhost:3000/rules", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(targetDir, "07-rules-catalog.png") });
  });
});
