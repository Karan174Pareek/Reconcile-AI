import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  const artifactDir = 'C:\\Users\\karan\\.gemini\\antigravity-ide\\brain\\2fc82856-f746-4271-9aa7-acee4259a329';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop (1280px)
    const pageDesktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await pageDesktop.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await sleep(1500);
    const desktopPath = path.join(artifactDir, 'navbar_desktop_1280.png');
    await pageDesktop.screenshot({ path: desktopPath });
    console.log(`✔ Desktop screenshot saved: ${desktopPath}`);
    await pageDesktop.close();

    // 2. Tablet (768px)
    const pageTablet = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    await pageTablet.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await sleep(1500);
    const tabletPath = path.join(artifactDir, 'navbar_tablet_768.png');
    await pageTablet.screenshot({ path: tabletPath });
    console.log(`✔ Tablet screenshot saved: ${tabletPath}`);
    await pageTablet.close();

    // 3. Mobile (375px)
    const pageMobile = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await pageMobile.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await sleep(1500);
    const mobilePath = path.join(artifactDir, 'navbar_mobile_375.png');
    await pageMobile.screenshot({ path: mobilePath });
    console.log(`✔ Mobile screenshot saved: ${mobilePath}`);

    // 4. Mobile with open menu
    const hamburger = pageMobile.locator('button[aria-label="Toggle Navigation Menu"]').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await sleep(500);
      const mobileOpenPath = path.join(artifactDir, 'navbar_mobile_open_375.png');
      await pageMobile.screenshot({ path: mobileOpenPath });
      console.log(`✔ Mobile open menu screenshot saved: ${mobileOpenPath}`);
    }
    await pageMobile.close();

  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    await browser.close();
  }
}

capture();
