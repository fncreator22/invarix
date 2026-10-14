import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

async function capture() {
  const outputDir = resolve("c:/Users/sr2ma/.gemini/antigravity/brain/d7377c9a-e5f7-4203-bec5-efca8cf6eb1d/screenshots");
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 1. Hero view with Nav bar, 1-click CLI command, and Force Graph
  console.log("Capturing hero screenshot...");
  await page.screenshot({ path: resolve(outputDir, "01_hero_with_living_graph.png"), fullPage: false });

  // 2. Post-Mortems Wipe Bands
  console.log("Scrolling to Post-Mortems Case Studies...");
  const caseStudiesEl = page.locator("#case-studies");
  if (await caseStudiesEl.count() > 0) {
    await caseStudiesEl.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(outputDir, "02_post_mortems_wipe_bands.png"), fullPage: false });

  // 3. Scrolled state to How It Works (Bento)
  console.log("Scrolling to How It Works (Bento)...");
  const bentoEl = page.locator("#developer-hub");
  if (await bentoEl.count() > 0) {
    await bentoEl.scrollIntoViewIfNeeded();
  } else {
    await page.evaluate(() => window.scrollTo(0, 2600));
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(outputDir, "03_scrolled_nav_and_bento.png"), fullPage: false });

  // 4. Further scrolled to living compound risk
  console.log("Scrolling to Living Compound Risk...");
  const telemetryEl = page.locator("#telemetry-heading");
  if (await telemetryEl.count() > 0) {
    await telemetryEl.scrollIntoViewIfNeeded();
  } else {
    await page.evaluate(() => window.scrollTo(0, 3800));
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(outputDir, "04_living_risk_and_grid.png"), fullPage: false });

  // 5. Full page capture
  console.log("Capturing full page screenshot...");
  await page.screenshot({ path: resolve(outputDir, "05_full_landing_page.png"), fullPage: true });

  await browser.close();
  console.log("Screenshots captured successfully to:", outputDir);
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
