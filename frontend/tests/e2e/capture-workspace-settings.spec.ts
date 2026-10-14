import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const targetDir = path.resolve(__dirname, "../../../docs/judge_evidence");

test.describe("Workspace Settings Visual Layout Verification", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  });

  test("Capture Workspace Settings Screen", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000/w/northwind-pay/settings/workspace", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2500);

    const screenshotPath = path.join(targetDir, "workspace-settings.png");
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log(`Saved screenshot to: ${screenshotPath}`);
  });
});
