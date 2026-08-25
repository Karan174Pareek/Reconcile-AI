import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureScreenshots() {
  const screenshotsDir = path.join(__dirname, '../../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await sleep(2000);

    // 1. Dashboard screenshot
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });
    console.log('Saved docs/screenshots/dashboard.png');

    // 2. Exception Queue screenshot
    const expQueueTab = page.locator('button:has-text("Exception Queue")').first();
    await expQueueTab.click();
    await sleep(1500);
    await page.screenshot({ path: path.join(screenshotsDir, 'exception-queue.png') });
    console.log('Saved docs/screenshots/exception-queue.png');

    // 3. Agent Chat screenshot
    const agentChatBtn = page.locator('button:has-text("Agent Chat")').first();
    await agentChatBtn.click();
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'agent-chat.png') });
    console.log('Saved docs/screenshots/agent-chat.png');
  } catch (err) {
    console.error('Screenshot error:', err);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
