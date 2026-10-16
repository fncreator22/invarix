import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke test configuration for INVARIX.
 * Run: npx playwright test --config=playwright.config.ts
 *
 * Install: pnpm add -D @playwright/test && npx playwright install chromium
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000, // 60s — Render free tier cold starts can take 45s
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
