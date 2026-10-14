import { test } from "@playwright/test";
import path from "path";

const VIEWPORTS = [
  { width: 390, height: 844, name: "390" },
  { width: 768, height: 1024, name: "768" },
  { width: 1280, height: 800, name: "1280" },
  { width: 1440, height: 900, name: "1440" },
];

const targetDir = path.resolve(__dirname, "../../../docs/redesign/after");

test.describe("Capture After Redesign Screenshots", () => {
  for (const vp of VIEWPORTS) {
    test(`capture viewport ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);

      // Full page
      await page.screenshot({
        path: path.join(targetDir, `full-page-${vp.name}.png`),
        fullPage: true,
      });

      // Sections
      const hero = page.locator("section[aria-labelledby='hero-title']");
      if ((await hero.count()) > 0) {
        await hero.screenshot({ path: path.join(targetDir, `hero-${vp.name}.png`) });
      }

      const features = page.locator("#developer-hub");
      if ((await features.count()) > 0) {
        await features.screenshot({ path: path.join(targetDir, `how-it-works-${vp.name}.png`) });
      }

      const caseStudies = page.locator("#case-studies");
      if ((await caseStudies.count()) > 0) {
        await caseStudies.screenshot({ path: path.join(targetDir, `post-mortems-${vp.name}.png`) });
      }

      const telemetry = page.locator("section[aria-labelledby='telemetry-heading']");
      if ((await telemetry.count()) > 0) {
        await telemetry.screenshot({ path: path.join(targetDir, `telemetry-${vp.name}.png`) });
      }

      const faq = page.locator("#faq");
      if ((await faq.count()) > 0) {
        await faq.screenshot({ path: path.join(targetDir, `faq-${vp.name}.png`) });
      }

      const footer = page.locator("footer");
      if ((await footer.count()) > 0) {
        await footer.screenshot({ path: path.join(targetDir, `footer-${vp.name}.png`) });
      }
    });
  }
});
