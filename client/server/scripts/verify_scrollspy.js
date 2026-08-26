import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactDir = 'C:/Users/karan/.gemini/antigravity-ide/brain/dde0b12c-0409-49dd-a9ee-ae35b238d2b7';
const screenshotPath = path.join(artifactDir, 'subnav_clicked_tab_05.png');
const mobileScreenshotPath = path.join(artifactDir, 'subnav_mobile_view.png');
const askAiScreenshotPath = path.join(artifactDir, 'ask_ai_working.png');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runVerification() {
  console.log('Launching browser verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await sleep(1500);

    console.log('--- Test 1: Click sub-nav tabs one by one ---');
    const tabsToTest = [
      { name: '02 How It Works', sectionId: 'how-it-works' },
      { name: '04 Matching Engine', sectionId: 'matching-engine' },
      { name: '05 Multi-Pass', sectionId: 'multi-pass' },
      { name: '07 Exception Flow', sectionId: 'exceptions' },
      { name: '09 Architecture', sectionId: 'architecture' },
    ];

    for (const tab of tabsToTest) {
      const btn = page.locator(`button:has-text("${tab.name}")`).first();
      await btn.click();
      await sleep(1000);

      const isActiveClass = await btn.getAttribute('class');
      const isHighlighted = isActiveClass.includes('bg-blue-50') && isActiveClass.includes('text-blue-700');

      const elementBox = await page.locator(`#${tab.sectionId}`).boundingBox();
      console.log(`Tab "${tab.name}": Highlighted = ${isHighlighted}, Section Top Y = ${Math.round(elementBox?.y || 0)}`);
    }

    console.log('Clicking 05 Multi-Pass for screenshot verification...');
    const multiPassBtn = page.locator('button:has-text("05 Multi-Pass")').first();
    await multiPassBtn.click();
    await sleep(1200);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);

    console.log('--- Test 2: Manual Scroll Top to Bottom ---');
    for (let scrollY = 0; scrollY <= 4000; scrollY += 800) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await sleep(400);
    }
    console.log('Scroll top to bottom completed cleanly.');

    console.log('--- Test 3: Rapid Scroll Test ---');
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    await page.evaluate(() => window.scrollTo(0, 3500));
    await sleep(200);
    await page.evaluate(() => window.scrollTo(0, 1200));
    await sleep(500);
    console.log('Rapid scroll completed without getting stuck.');

    console.log('--- Test 4: Mobile Width Test ---');
    await page.setViewportSize({ width: 375, height: 667 });
    await sleep(500);
    const mobileMultiPassBtn = page.locator('button:has-text("05 Multi-Pass")').first();
    await mobileMultiPassBtn.click();
    await sleep(1000);
    await page.screenshot({ path: mobileScreenshotPath });
    console.log(`Saved mobile screenshot: ${mobileScreenshotPath}`);

    console.log('--- Test 5: Ask AI Verification ---');
    await page.setViewportSize({ width: 1440, height: 900 });
    const askAiButton = page.locator('button:has-text("Ask AI"), button:has-text("Ask Forensic AI")').first();
    if (await askAiButton.isVisible()) {
      await askAiButton.click();
      await sleep(800);
      const input = page.locator('input[placeholder*="Ask about batches"]').first();
      if (await input.isVisible()) {
        await input.fill('What is the reconciliation match rate?');
        await input.press('Enter');
        await sleep(2500);
      }
      await page.screenshot({ path: askAiScreenshotPath });
      console.log(`Saved Ask AI screenshot: ${askAiScreenshotPath}`);
    }

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
