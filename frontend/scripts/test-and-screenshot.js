const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function testStackingCards() {
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  console.log('Navigating to http://localhost:3000/#case-studies...');
  await page.goto('http://localhost:3000/#case-studies', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const outDir = path.resolve(__dirname, '../public/screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Heading view
  const heading = page.locator('#case-studies-heading');
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(outDir, 'case-studies-desktop-heading.png')
  });
  console.log('Saved case-studies-desktop-heading.png');

  // Verify all 3 incident cards are present in DOM
  const cardHeadings = await page.locator('#case-studies h3').allInnerTexts();
  console.log('Detected incident cards:', cardHeadings);

  // 2. Scroll so Card 1 (CrowdStrike) is fully pinned
  const caseStudiesSection = page.locator('#case-studies');
  const box = await caseStudiesSection.boundingBox();
  const startTop = box ? box.y + await page.evaluate(() => window.scrollY) + 150 : 2500;
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), startTop);
  await page.waitForTimeout(800);
  console.log('Scroll at Card 1:', await page.evaluate(() => window.scrollY));
  await page.screenshot({
    path: path.join(outDir, 'case-studies-desktop-card1.png')
  });
  console.log('Saved case-studies-desktop-card1.png');

  // 3. Hover over Card 1 article screenshot
  const firstImageContainer = page.locator('#case-studies a[title*="Open official article"]').first();
  await firstImageContainer.hover();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(outDir, 'case-studies-desktop-card1-hover.png')
  });
  console.log('Saved case-studies-desktop-card1-hover.png');

  // Move mouse away so hover state is cleared
  await page.mouse.move(50, 50);
  await page.waitForTimeout(300);

  // 4. Scroll down to Card 2 (Change Healthcare)
  await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'instant' }));
  await page.waitForTimeout(800);
  console.log('Scroll at Card 2:', await page.evaluate(() => window.scrollY));
  await page.screenshot({
    path: path.join(outDir, 'case-studies-desktop-card2.png')
  });
  console.log('Saved case-studies-desktop-card2.png');

  // 5. Scroll down to Card 3 (Square / Block)
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
  await page.waitForTimeout(800);
  console.log('Scroll at Card 3:', await page.evaluate(() => window.scrollY));
  await page.screenshot({
    path: path.join(outDir, 'case-studies-desktop-card3.png')
  });
  console.log('Saved case-studies-desktop-card3.png');

  // 6. Scroll down to Sandbox Simulation Strip
  const simStrip = page.getByText('Try It Yourself: Interactive Sandbox Simulation');
  await simStrip.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(outDir, 'case-studies-desktop-sandbox-strip.png')
  });
  console.log('Saved case-studies-desktop-sandbox-strip.png');

  await page.close();

  // 7. Mobile test at 390x844
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  await mobilePage.goto('http://localhost:3000/#case-studies', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  // Scroll to Card 1 on mobile
  const mBox = await mobilePage.locator('#case-studies').boundingBox();
  if (mBox) {
    await mobilePage.evaluate((top) => window.scrollTo({ top: top + 180, behavior: 'instant' }), mBox.y + await mobilePage.evaluate(() => window.scrollY));
  }
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({
    path: path.join(outDir, 'case-studies-mobile.png')
  });
  console.log('Saved case-studies-mobile.png');

  await mobilePage.close();
  await browser.close();
  console.log('All tests and screenshots completed successfully!');
}

testStackingCards().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
