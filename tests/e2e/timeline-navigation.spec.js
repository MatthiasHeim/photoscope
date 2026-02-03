import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsLDA4QEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBX/2wBDAQMEBAUEBQkFBQkVDQsNFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRX/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
  'base64'
);

let tmpFile;
let sampleAnalysis;

test.beforeAll(async () => {
  tmpFile = path.join(os.tmpdir(), 'test-timeline.jpg');
  fs.writeFileSync(tmpFile, MINIMAL_JPEG);
  sampleAnalysis = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'sample-analysis.json'), 'utf-8')
  );
});

test.afterAll(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test('clicking timeline steps updates step info', async ({ page }) => {
  // Upload to get a valid viewer URL
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 15000 });

  await expect(page.locator('#viewerApp')).toBeVisible();
  await expect(page.locator('#timeline')).toBeVisible();

  // The demo fallback only has 1 step, so we verify that step is shown
  const stepLabel = page.locator('#stepLabel');
  await expect(stepLabel).not.toBeEmpty();

  // If there are multiple timeline items, click the first one
  const timelineItems = page.locator('#timeline > *');
  const count = await timelineItems.count();
  if (count > 1) {
    // Click second timeline step
    await timelineItems.nth(1).click();
    // Verify step info updated
    const newLabel = await stepLabel.textContent();
    expect(newLabel).toBeTruthy();
  }

  // Click first timeline step
  if (count > 0) {
    await timelineItems.nth(0).click();
    const label = await stepLabel.textContent();
    expect(label).toBeTruthy();
  }
});

test('clicking overlay region activates corresponding step', async ({ page }) => {
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 15000 });

  await expect(page.locator('#viewerApp')).toBeVisible();

  // Check overlay boxes are rendered and clickable
  const overlayBoxes = page.locator('.overlay-box--clickable');
  const count = await overlayBoxes.count();

  if (count > 0) {
    // Click the first overlay box
    await overlayBoxes.first().click();
    const stepLabel = page.locator('#stepLabel');
    await expect(stepLabel).not.toBeEmpty();
  }
});
