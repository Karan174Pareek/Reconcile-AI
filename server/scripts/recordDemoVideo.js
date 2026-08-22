import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Run from '../models/Run.js';
import BankRecord from '../models/BankRecord.js';
import LedgerRecord from '../models/LedgerRecord.js';
import Match from '../models/Match.js';
import Exception from '../models/Exception.js';
import DraftAction from '../models/DraftAction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDemoRecording() {
  console.log('--- Setting up Clean Database State for Demo Recording ---');
  await mongoose.connect('mongodb://localhost:27017/reconcile_ai');
  
  // Clear runs for clean slate
  await Run.deleteMany({});
  await BankRecord.deleteMany({});
  await LedgerRecord.deleteMany({});
  await Match.deleteMany({});
  await Exception.deleteMany({});
  await DraftAction.deleteMany({});
  try {
    await mongoose.connection.db.dropCollection('auditlogs');
  } catch (e) {
    // ignore
  }
  console.log('Database cleared for clean demo slate.');

  const recordingsDir = path.join(__dirname, '../../docs/recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  console.log('--- Launching Playwright Chromium with 1280x720 Video Recording ---');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  try {
    // 1. Land on Initial Screen
    console.log('[1/9] Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // 2. Open Create Run Modal and Generate Benchmark Seed Batch
    console.log('[2/9] Creating Initial 525-Record Benchmark Seed Dataset...');
    const modalTrigger = page.locator('button:has-text("Create Initial Run"), button:has-text("New Run")').first();
    await modalTrigger.waitFor({ state: 'visible', timeout: 15000 });
    await modalTrigger.click();
    await sleep(2000);

    const generateSeedBtn = page.locator('button:has-text("Generate Seed")').first();
    await generateSeedBtn.waitFor({ state: 'visible', timeout: 10000 });
    await generateSeedBtn.click();
    console.log('Clicked Generate Seed...');
    await sleep(4000); // Allow seed creation and modal auto-close

    // 3. Trigger Pipeline Execution and Watch Stepper Progress
    console.log('[3/9] Triggering Pipeline Execution (Pass 1 -> Pass 2 -> Pass 3)...');
    const executePipelineBtn = page.locator('button:has-text("Execute All Passes")').first();
    await executePipelineBtn.waitFor({ state: 'visible', timeout: 10000 });
    await executePipelineBtn.click();
    
    // Watch stepper progress through passes in real time
    console.log('Watching live pipeline execution progress in real-time...');
    await sleep(7000); // Pass 1 & Pass 2 complete, Pass 3 Claude AI reasoning finishes

    // 4. Pause on Metric Cards showing final 91.4% match rate
    console.log('[4/9] Pausing on Final Reconciliation Metric Cards...');
    await sleep(3500);

    // 5. Navigate to Exception Queue
    console.log('[5/9] Navigating to Exception Queue...');
    const expQueueTab = page.locator('button:has-text("Exception Queue")').first();
    await expQueueTab.click();
    await sleep(2500);

    // Scroll through exceptions
    await page.mouse.wheel(0, 450);
    await sleep(2500);
    await page.mouse.wheel(0, -250);
    await sleep(2000);

    // 6. Open Forensic Agent Chat Drawer
    console.log('[6/9] Opening Forensic Agent Chat Drawer & Querying Database...');
    const agentChatBtn = page.locator('button:has-text("Agent Chat")').first();
    await agentChatBtn.click();
    await sleep(2500);

    // Type query into chat
    const chatInput = page.locator('input[placeholder*="Ask anything"]').first();
    await chatInput.fill('What unrecorded bank charges and exceptions were identified?');
    await sleep(1200);
    const sendBtn = page.locator('form button[type="submit"]').first();
    await sendBtn.click();
    console.log('Streamed query submitted, waiting for SSE tool-use rendering...');
    await sleep(6000); // Wait for streamed response and tool chips

    // Close chat drawer
    const closeChatBtn = page.locator('div.animate-slideLeft button').first();
    if (await closeChatBtn.isVisible()) {
      await closeChatBtn.click();
    }
    await sleep(1500);

    // 7. Navigate to Draft Actions & Perform HITL Approval
    console.log('[7/9] Navigating to Draft Actions Queue for HITL Review...');
    const draftActionsTab = page.locator('button:has-text("Draft Actions")').first();
    await draftActionsTab.click();
    await sleep(2500);

    // Click Edit Content on the first draft action
    const editBtn = page.locator('button:has-text("Edit Content")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await sleep(2000);

      // Save & Approve
      const saveApproveBtn = page.locator('button:has-text("Save & Approve")').first();
      if (await saveApproveBtn.isVisible()) {
        await saveApproveBtn.click();
        console.log('Draft action edited and approved!');
        await sleep(3000);
      }
    }

    // 8. Navigate to Audit Trail
    console.log('[8/9] Navigating to Append-Only Audit Trail Timeline...');
    const auditTrailTab = page.locator('button:has-text("Audit Trail")').first();
    await auditTrailTab.click();
    await sleep(2500);

    // Expand top audit event
    const firstLog = page.locator('div.divide-y > div').first();
    if (await firstLog.isVisible()) {
      await firstLog.click();
      await sleep(3000);
    }
    await page.mouse.wheel(0, 300);
    await sleep(3000);

    console.log('[9/9] Demo recording walkthrough completed successfully!');
  } catch (err) {
    console.error('Recording Error:', err);
  } finally {
    const videoObj = page.video();
    await page.close();
    await context.close();
    await browser.close();
    await mongoose.disconnect();

    if (videoObj) {
      const originalPath = await videoObj.path();
      const targetPath = path.join(__dirname, '../../docs/demo-recording.webm');
      fs.copyFileSync(originalPath, targetPath);
      console.log(`Video saved to: ${targetPath}`);
      const stats = fs.statSync(targetPath);
      console.log(`File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    }
  }
}

runDemoRecording();
