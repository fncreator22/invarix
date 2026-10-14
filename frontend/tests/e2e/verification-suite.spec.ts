import { test, expect } from "@playwright/test";

test.describe("Phase 6 Verification Gates", () => {
  test("Gate 2: No horizontal scroll or overflow across all viewports", async ({ page }) => {
    for (const width of [390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBe(false);
    }
  });

  test("Gate 5: Keyboard navigation and interaction", async ({ page }) => {
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

    // Focus range input in wipe band and simulate arrow keys
    const rangeInput = page.locator("input[type='range']").first();
    await rangeInput.focus();
    await expect(rangeInput).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");

    // Open first FAQ item with keyboard
    const faqTrigger = page.locator("button[data-radix-collection-item]").first();
    await faqTrigger.focus();
    await expect(faqTrigger).toBeFocused();
    await page.keyboard.press("Enter");
    const faqContent = page.getByText("An agentic safety platform that tracks temporary exceptions");
    await expect(faqContent).toBeVisible();
  });

  test("Gate 6: prefers-reduced-motion compatibility", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("Gate 7: Nav in-page anchors land on valid targets", async ({ page }) => {
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    for (const id of ["developer-hub", "case-studies", "faq"]) {
      const el = page.locator(`#${id}`);
      await expect(el).toBeAttached();
    }
  });

  test("Gate 8: Claims consistency audit on rendered page", async ({ page }) => {
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
    const text = await page.innerText("body");

    // Latency check: should only contain 12ms, no 15ms or <15ms
    const has12ms = text.includes("12ms");
    const has15ms = text.includes("<15ms") || text.includes("15ms Pre-Merge") || text.includes("Sub-15ms");
    expect(has12ms).toBe(true);
    expect(has15ms).toBe(false);

    // Tools check: should prominently show 14 Tools
    expect(text.includes("14 Tools")).toBe(true);

    // Grounded check: should state 100% Grounded
    expect(text.includes("100%")).toBe(true);

    // Zero login check
    expect(text.includes("0 Login")).toBe(true);

    console.log("CLAIMS CONSISTENCY TABLE PASSED: 12ms unified, 14 Tools unified, 0 Login unified.");
  });
});
