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
const randomPause = (min = 400, max = 1200) =>
  new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

async function smoothMove(page, targetX, targetY, steps = 25) {
  await page.mouse.move(targetX, targetY, { steps });
  await randomPause(300, 600);
}

async function smoothScroll(page, totalY, stepY = 30, stepDelay = 60) {
  const steps = Math.abs(Math.floor(totalY / stepY));
  const dir = totalY > 0 ? 1 : -1;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dir * stepY);
    await sleep(stepDelay);
  }
}

async function typeHumanLike(page, text) {
  for (const char of text) {
    await page.keyboard.type(char);
    await sleep(Math.floor(Math.random() * 45) + 30);
  }
}

async function recordHumanPacedDemo() {
  console.log('=== [1/8] Preparing Clean Database State for 5-Minute Pitch Demo ===');
  await mongoose.connect('mongodb://localhost:27017/reconcile_ai');
  
  await Run.deleteMany({});
  await BankRecord.deleteMany({});
  await LedgerRecord.deleteMany({});
  await Match.deleteMany({});
  await Exception.deleteMany({});
  await DraftAction.deleteMany({});
  try {
    await mongoose.connection.db.dropCollection('auditlogs');
  } catch (e) {
    // collection might not exist
  }
  console.log('Database reset to fresh clean slate.');

  const recordingsDir = path.join(__dirname, '../../docs/recordings_human');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  console.log('=== [2/8] Launching Playwright with 1280x720 High-Quality Video Recording ===');
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

  // Inject a visible smooth neon cursor so every mouse move is clear to viewers
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const cursor = document.createElement('div');
      cursor.id = 'demo-visible-cursor';
      cursor.style.position = 'fixed';
      cursor.style.zIndex = '999999';
      cursor.style.width = '18px';
      cursor.style.height = '18px';
      cursor.style.borderRadius = '50%';
      cursor.style.backgroundColor = 'rgba(45, 212, 168, 0.9)';
      cursor.style.border = '2px solid #ffffff';
      cursor.style.boxShadow = '0 0 16px rgba(45, 212, 168, 0.95)';
      cursor.style.pointerEvents = 'none';
      cursor.style.transform = 'translate(-50%, -50%)';
      cursor.style.transition = 'transform 0.08s ease-out, background-color 0.15s ease';
      document.body.appendChild(cursor);

      window.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      });

      window.addEventListener('mousedown', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.75)';
        cursor.style.backgroundColor = 'rgba(232, 169, 74, 0.95)';
      });

      window.addEventListener('mouseup', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.backgroundColor = 'rgba(45, 212, 168, 0.9)';
      });
    });
  });

  try {
    // --- SECTION 1: PROBLEM STATEMENT & LANDING (0:00 - 0:35) ---
    console.log('[SECTION 1] Landing on Empty Dashboard State (Problem Framing)...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await smoothMove(page, 640, 360, 30);
    await sleep(9000); // 9s dwell letting user observe empty state

    // Move cursor to "Create Initial Run" button
    const createRunBtn = page.locator('button:has-text("Create Initial Run")').first();
    const btnBox = await createRunBtn.boundingBox();
    if (btnBox) {
      await smoothMove(page, btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2, 30);
      await randomPause(500, 900);
      await createRunBtn.click({ force: true });
    }
    await sleep(4500);

    // Hover over Upload Dropzones to showcase drag-and-drop CSV capability
    console.log('Hovering over Drag-and-Drop CSV Ingestion Zones...');
    const dropzone = page.locator('label[for="bank-file"]').first();
    const dropBox = await dropzone.boundingBox();
    if (dropBox) {
      await smoothMove(page, dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2, 30);
      await sleep(4500);
    }

    // Move to "Generate Seed" Benchmark Button
    const seedBtn = page.locator('button:has-text("Generate Seed")').first();
    const seedBox = await seedBtn.boundingBox();
    if (seedBox) {
      await smoothMove(page, seedBox.x + seedBox.width / 2, seedBox.y + seedBox.height / 2, 30);
      await randomPause(500, 900);
      await seedBtn.click({ force: true });
      console.log('Generated 525-Record Benchmark Seed Batch...');
    }
    await sleep(6500); // Wait for modal auto-close and data population

    // --- SECTION 2: LIVE 3-PASS PIPELINE EXECUTION (0:35 - 1:50) ---
    console.log('[SECTION 2] Triggering Multi-Pass Reconciliation Pipeline...');
    const execBtn = page.locator('button:has-text("Execute All Passes")').first();
    const execBox = await execBtn.boundingBox();
    if (execBox) {
      await smoothMove(page, execBox.x + execBox.width / 2, execBox.y + execBox.height / 2, 30);
      await randomPause(600, 1000);
      await execBtn.click({ force: true });
    }

    // Let the live pipeline execution play out in real time while tracking console
    console.log('Watching Live Progress Stepper & Socket.io Stream console...');
    await smoothMove(page, 450, 420, 25);
    await sleep(9000); // Watch Pass 1 deterministic & Pass 2 fuzzy
    await smoothMove(page, 640, 560, 25);
    await sleep(12000); // Watch Pass 3 Claude AI Reasoner batched reasoning
    await smoothMove(page, 850, 420, 25);
    await sleep(9000); // Watch completion

    // Dwell on the final Metric Cards showing 91.4% match rate
    console.log('Dwelling on Metric Cards (66.7% P1, 20.0% P2, 4.8% P3, 8.6% Unresolved)...');
    await smoothMove(page, 200, 130, 25);
    await sleep(5000);
    await smoothMove(page, 600, 130, 25);
    await sleep(5000);
    await smoothMove(page, 1100, 130, 25);
    await sleep(9000); // Highlight 91.4% Reconciliation Rate Hero Card

    // --- SECTION 3: EXCEPTION QUEUE & AI REASONING (1:50 - 2:55) ---
    console.log('[SECTION 3] Navigating to Exception Queue Tab...');
    const expTab = page.locator('header nav button:has-text("Exception Queue")').first();
    const expTabBox = await expTab.boundingBox();
    if (expTabBox) {
      await smoothMove(page, expTabBox.x + expTabBox.width / 2, expTabBox.y + expTabBox.height / 2, 30);
      await randomPause(400, 800);
      await expTab.click({ force: true });
    }
    await sleep(5500);

    // Smoothly scroll down through exception cards
    console.log('Smooth scrolling through diagnosed exception items...');
    await smoothScroll(page, 320, 20, 75);
    await sleep(7000);

    // Hover over Claude AI Rationale Box
    await smoothMove(page, 640, 460, 30);
    await sleep(9000); // Viewer reads Claude's cited rationale on timing lag / fees

    // Filter by 'bank_fee'
    console.log('Filtering Exception Queue by "bank_fee"...');
    const feeFilter = page.locator('button:has-text("bank fee")').first();
    const feeBox = await feeFilter.boundingBox();
    if (feeBox) {
      await smoothMove(page, feeBox.x + feeBox.width / 2, feeBox.y + feeBox.height / 2, 25);
      await randomPause(400, 700);
      await feeFilter.click({ force: true });
    }
    await sleep(6500);

    // Reset filter to 'all'
    const allFilter = page.locator('button:has-text("all")').first();
    const allBox = await allFilter.boundingBox();
    if (allBox) {
      await smoothMove(page, allBox.x + allBox.width / 2, allBox.y + allBox.height / 2, 25);
      await allFilter.click({ force: true });
    }
    await sleep(4500);

    // --- SECTION 4: CONVERSATIONAL FORENSIC AGENT CHAT (2:55 - 4:00) ---
    console.log('[SECTION 4] Opening Forensic Agent Chat Drawer...');
    const chatBtn = page.locator('header button:has-text("Agent Chat")').first();
    const chatBox = await chatBtn.boundingBox();
    if (chatBox) {
      await smoothMove(page, chatBox.x + chatBox.width / 2, chatBox.y + chatBox.height / 2, 30);
      await randomPause(500, 900);
      await chatBtn.click({ force: true });
    }
    await sleep(4500);

    // Move to chat input and type question human-like
    const chatInput = page.locator('div.fixed.inset-0 input[placeholder*="Ask anything"]').first();
    const inputBox = await chatInput.boundingBox();
    if (inputBox) {
      await smoothMove(page, inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, 25);
      await randomPause(400, 700);
      await chatInput.click();
      await sleep(700);

      const queryText = "What unrecorded bank charges and exceptions were identified?";
      console.log(`Typing character-by-character: "${queryText}"`);
      await typeHumanLike(page, queryText);
      await randomPause(500, 1000);

      const sendBtn = page.locator('div.fixed.inset-0 form button[type="submit"]').first();
      await sendBtn.click({ force: true });
    }

    // Wait for SSE streaming response and tool call execution badges
    console.log('Waiting for SSE streamed response and tool execution chips...');
    await sleep(15000); // 15s to let viewer read Claude's forensic audit reply and citations

    // Close chat drawer reliably via backdrop click & escape
    console.log('Closing Agent Chat drawer...');
    await smoothMove(page, 100, 350, 25);
    await page.mouse.click(100, 350);
    await page.keyboard.press('Escape');
    await sleep(2500);
    await page.locator('div.fixed.inset-0').waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
    await sleep(2000);

    // --- SECTION 5: HUMAN-IN-THE-LOOP (HITL) DRAFT ACTION APPROVAL (4:00 - 4:40) ---
    console.log('[SECTION 5] Navigating to Draft Actions Queue...');
    const draftTab = page.locator('header nav button:has-text("Draft Actions")').first();
    const draftTabBox = await draftTab.boundingBox();
    if (draftTabBox) {
      await smoothMove(page, draftTabBox.x + draftTabBox.width / 2, draftTabBox.y + draftTabBox.height / 2, 30);
      await randomPause(400, 800);
      await draftTab.click({ force: true });
    }
    await sleep(5500);

    // Scroll slightly so the document card is fully clear of header
    await smoothScroll(page, 100, 20, 50);
    await sleep(2000);

    // Dwell on the drafted vendor email
    await smoothMove(page, 640, 350, 25);
    await sleep(6500);

    // Click "Edit Content"
    console.log('Auditor performing inline edit on drafted vendor communication...');
    const editBtn = page.locator('button:has-text("Edit Content")').first();
    await editBtn.scrollIntoViewIfNeeded();
    await sleep(800);
    const editBox = await editBtn.boundingBox();
    if (editBox) {
      await smoothMove(page, editBox.x + editBox.width / 2, editBox.y + editBox.height / 2, 25);
      await randomPause(400, 700);
      await editBtn.click({ force: true });
    }
    await sleep(3500);

    // Focus subject line and append "(URGENT REVIEW)"
    const subjectInput = page.locator('input[value*="Payment Confirmation"], input[value*="Invoice"]').first();
    if (await subjectInput.isVisible()) {
      await subjectInput.click();
      await sleep(500);
      await typeHumanLike(page, ' - URGENT REVIEW');
      await sleep(2000);
    }

    // Click "Save & Approve"
    console.log('Clicking "Save & Approve" to execute HITL approval...');
    const saveApproveBtn = page.locator('button:has-text("Save & Approve")').first();
    await saveApproveBtn.scrollIntoViewIfNeeded();
    await sleep(800);
    const saveBox = await saveApproveBtn.boundingBox();
    if (saveBox) {
      await smoothMove(page, saveBox.x + saveBox.width / 2, saveBox.y + saveBox.height / 2, 25);
      await randomPause(500, 900);
      await saveApproveBtn.click({ force: true });
    }
    await sleep(8500); // 8.5s dwell to watch success pulse & approved badge

    // --- SECTION 6: APPEND-ONLY AUDIT TRAIL & CONCLUSION (4:40 - 5:00) ---
    console.log('[SECTION 6] Navigating to Append-Only Audit Trail...');
    const auditTab = page.locator('header nav button:has-text("Audit Trail")').first();
    const auditTabBox = await auditTab.boundingBox();
    if (auditTabBox) {
      await smoothMove(page, auditTabBox.x + auditTabBox.width / 2, auditTabBox.y + auditTabBox.height / 2, 30);
      await randomPause(400, 800);
      await auditTab.click({ force: true });
    }
    await sleep(5500);

    // Expand top audit log entry to inspect JSON event payload
    console.log('Expanding top audit log event payload...');
    const firstRow = page.locator('div.divide-y > div').first();
    if (await firstRow.isVisible()) {
      await firstRow.scrollIntoViewIfNeeded();
      await sleep(800);
      const rowBox = await firstRow.boundingBox();
      if (rowBox) {
        await smoothMove(page, rowBox.x + 200, rowBox.y + 20, 25);
        await randomPause(400, 700);
        await firstRow.click({ force: true });
      }
    }
    await sleep(6500);

    // Smoothly scroll down the timeline
    await smoothScroll(page, 280, 20, 70);
    await sleep(6500);
    await smoothScroll(page, -200, 20, 70);
    await sleep(5500);

    // Final concluding dwell on dashboard
    const dashTab = page.locator('header nav button:has-text("Live Dashboard")').first();
    const dashBox = await dashTab.boundingBox();
    if (dashBox) {
      await smoothMove(page, dashBox.x + dashBox.width / 2, dashBox.y + dashBox.height / 2, 30);
      await dashTab.click({ force: true });
    }
    await sleep(9000);

    console.log('=== Pitch Demo Recording Completed Successfully! ===');
  } catch (err) {
    console.error('Demo Recording Error:', err);
  } finally {
    const videoObj = page.video();
    await page.close();
    await context.close();
    await browser.close();
    await mongoose.disconnect();

    if (videoObj) {
      const originalPath = await videoObj.path();
      const targetWebm = path.join(__dirname, '../../docs/demo-recording.webm');
      fs.copyFileSync(originalPath, targetWebm);
      console.log(`WebM Video saved to: ${targetWebm}`);
      const stats = fs.statSync(targetWebm);
      console.log(`File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    }
  }
}

recordHumanPacedDemo();
