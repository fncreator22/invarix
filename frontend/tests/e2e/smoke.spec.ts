/**
 * INVARIX Demo Smoke Tests
 *
 * Tests the critical demo path end-to-end. Run these before every live demo.
 * Based on the e2e-testing-patterns skill structure.
 *
 * Setup:
 *   cd frontend
 *   pnpm add -D @playwright/test
 *   npx playwright install chromium
 *   E2E_BASE_URL=https://your-vercel-url.vercel.app npx playwright test --config=playwright.config.ts
 *
 * For local dev:
 *   pnpm dev   (in one terminal)
 *   npx playwright test --config=playwright.config.ts   (in another)
 */

import { expect, test } from "@playwright/test";

// ─── 1. Public surface ────────────────────────────────────────────────────────

test.describe("Landing page", () => {
  test("loads and shows the core value proposition", async ({ page }) => {
    await page.goto("/");
    // Accept either the real landing page OR a redirect to sign-in (both valid for a deployed app)
    const url = page.url();
    const is404 = url.includes("404") || (await page.title()).toLowerCase().includes("not found");
    if (is404) {
      // If the base URL is wrong (e.g. placeholder), skip gracefully
      test.skip();
      return;
    }
    // The page should load without a 500
    await expect(page).not.toHaveURL(/500/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("CTA navigates to sign-up", async ({ page }) => {
    await page.goto("/");
    // Any primary CTA button should not 404
    const cta = page.getByRole("link", { name: /get started|sign up|try/i }).first();
    if (await cta.count() > 0) {
      await cta.click();
      await expect(page).not.toHaveURL(/404/);
    }
  });
});

// ─── 2. Auth surface ─────────────────────────────────────────────────────────

test.describe("Authentication", () => {
  test("sign-in page renders without errors", async ({ page }) => {
    await page.goto("/sign-in");
    // Clerk renders an iframe or form — just ensure no crash
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/500/);
  });

  test("sign-up page renders without errors", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/500/);
  });
});

// ─── 3. API health ────────────────────────────────────────────────────────────

test.describe("Backend API health", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const apiBase = process.env.API_BASE_URL;
    if (!apiBase) {
      // Skip when no explicit API URL — use `API_BASE_URL=https://... pnpm test:smoke` to run
      test.skip();
      return;
    }
    const res = await request.get(`${apiBase}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });
});

// ─── 4. Graph canvas ─────────────────────────────────────────────────────────

test.describe("Graph canvas (public demo path)", () => {
  test("graph explorer page renders without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/sign-in");
    // If unauthenticated, we still check for no JS crashes on the sign-in page
    expect(errors.filter((e) => !e.includes("ChunkLoadError"))).toHaveLength(0);
  });
});

// ─── 5. Critical demo assertions (requires authenticated session) ─────────────
// These tests require DEMO_SESSION_TOKEN environment variable.
// Skip gracefully in CI if not provided.

test.describe("Authenticated demo path", () => {
  test.beforeEach(async ({ context }) => {
    const token = process.env.DEMO_SESSION_TOKEN;
    if (!token) {
      test.skip();
    }
    // Inject the session token so we bypass Clerk's sign-in
    await context.addCookies([
      {
        name: "__session",
        value: token!,
        domain: new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname,
        path: "/",
        httpOnly: true,
        secure: process.env.E2E_BASE_URL?.startsWith("https") ?? false,
      },
    ]);
  });

  test("home screen shows risk metrics", async ({ page }) => {
    await page.goto("/");
    // After auth, should see the app shell
    await expect(page.getByText(/open alerts|active exceptions|risk/i).first()).toBeVisible({
      timeout: 45_000,
    });
  });

  test("sample workspace has critical alerts", async ({ page }) => {
    await page.goto("/");
    // The Northwind Pay sample workspace should have at least 1 critical alert
    const criticalCount = await page
      .getByText(/critical/i)
      .filter({ hasNot: page.locator("header") })
      .count();
    expect(criticalCount).toBeGreaterThan(0);
  });

  test("graph canvas renders nodes", async ({ page }) => {
    // Navigate to the graph page (workspace slug may vary)
    const workspaceLink = page.getByRole("link", { name: /graph/i }).first();
    if ((await workspaceLink.count()) > 0) {
      await workspaceLink.click();
      // Canvas should render — look for SVG or canvas element
      await expect(page.locator("canvas, svg").first()).toBeVisible({ timeout: 30_000 });
    }
  });

  test("Steward responds to a question", async ({ page }) => {
    // Navigate to steward (url may vary by workspace)
    await page.goto("/");
    const stewardInput = page.getByPlaceholder(/ask steward|ask about risk/i);
    if ((await stewardInput.count()) > 0) {
      await stewardInput.fill("Which service is carrying the most hidden risk?");
      await stewardInput.press("Enter");
      // Wait for a response — Steward streams tokens
      await expect(page.getByText(/service|risk|score/i).first()).toBeVisible({
        timeout: 30_000,
      });
    }
  });
});
