import { test, expect } from "@playwright/test";

test("run axe accessibility check on landing page", async ({ page }) => {
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js" });

  const results = await page.evaluate(async () => {
    // @ts-expect-error axe global
    return await window.axe.run();
  });

  console.log(`AXE_VIOLATIONS_COUNT: ${results.violations.length}`);
  for (const v of results.violations) {
    console.log(`[VIOLATION] id=${v.id} impact=${v.impact} desc=${v.description}`);
    for (const node of v.nodes.slice(0, 3)) {
      console.log(`  Target: ${node.target.join(", ")} | Summary: ${node.failureSummary}`);
    }
  }
});
