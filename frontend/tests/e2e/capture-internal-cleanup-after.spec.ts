import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const VIEWPORTS = [
  { width: 1440, height: 900, name: "desktop-1440" },
  { width: 390, height: 844, name: "mobile-390" },
];

const ROUTES = [
  { name: "home", path: "/w/northwind-pay/home" },
  { name: "alerts", path: "/w/northwind-pay/alerts" },
  { name: "reviews", path: "/w/northwind-pay/reviews" },
  { name: "exceptions", path: "/w/northwind-pay/exceptions" },
  { name: "graph", path: "/w/northwind-pay/graph" },
  { name: "registry", path: "/w/northwind-pay/registry" },
  { name: "steward", path: "/w/northwind-pay/steward" },
  { name: "settings-workspace", path: "/w/northwind-pay/settings/workspace" },
  { name: "settings-integrations", path: "/w/northwind-pay/settings/integrations" },
  { name: "settings-api-keys", path: "/w/northwind-pay/settings/api-keys" },
  { name: "settings-ai", path: "/w/northwind-pay/settings/ai" },
];

const targetDir = path.resolve(__dirname, "../../../docs/internal_clean/after");

test.describe("Capture Internal Screens After Deep Clean", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  });

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`capture ${route.name} (${vp.name})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`http://localhost:3000${route.path}`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: path.join(targetDir, `${route.name}-${vp.name}.png`),
          fullPage: true,
        });
      });
    }
  }
});
