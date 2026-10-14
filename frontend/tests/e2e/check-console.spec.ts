import { test } from "@playwright/test";

test("check console messages and Next dev overlay", async ({ page }) => {
  const messages: { type: string; text: string }[] = [];
  page.on("console", (msg) => messages.push({ type: msg.type(), text: msg.text() }));
  page.on("pageerror", (err) => messages.push({ type: "error", text: err.message }));

  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  console.log("=== CONSOLE LOGS ===");
  for (const m of messages) {
    if (m.type === "error" || m.type === "warning") {
      console.log(`[${m.type}] ${m.text}`);
    }
  }

  const nextPortal = page.locator("nextjs-portal, [data-nextjs-dialog-overlay]");
  console.log(`Next portal count: ${await nextPortal.count()}`);
});
