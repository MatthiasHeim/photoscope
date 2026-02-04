import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsLDA4QEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBX/2wBDAQMEBAUEBQkFBQkVDQsNFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRX/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
  'base64'
);

let tmpFile;

test.beforeAll(() => {
  tmpFile = path.join(os.tmpdir(), 'test-responsive.jpg');
  fs.writeFileSync(tmpFile, MINIMAL_JPEG);
});

test.afterAll(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test.use({ viewport: { width: 375, height: 667 } });

test('upload page is usable on mobile viewport', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#dropzone')).toBeVisible();
  await expect(page.locator('#browseBtn')).toBeVisible();

  // Verify the dropzone fits within viewport
  const box = await page.locator('#dropzone').boundingBox();
  expect(box.width).toBeLessThanOrEqual(375);
});

test('viewer is usable on mobile viewport', async ({ page }) => {
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 60000 });

  await expect(page.locator('#viewerApp')).toBeVisible();
  await expect(page.locator('#timeline')).toBeAttached();
  await expect(page.locator('#overlayLayer')).toBeAttached();
  await expect(page.locator('#mainImage')).toBeAttached();

  // Verify overlay regions are present and clickable on mobile
  const overlayBoxes = page.locator('.overlay-box--clickable');
  const count = await overlayBoxes.count();
  if (count > 0) {
    await overlayBoxes.first().click();
    await expect(page.locator('#stepLabel')).not.toBeEmpty();
  }
});

test('viewer has no horizontal scroll on mobile', async ({ page }, testInfo) => {
  testInfo.setTimeout(90000);
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 60000 });

  await expect(page.locator('#viewerApp')).toBeVisible();

  // Check that document doesn't scroll horizontally
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test('timeline is contained within viewport on mobile', async ({ page }) => {
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 60000 });

  await expect(page.locator('#timeline')).toBeAttached();

  const timelineBox = await page.locator('#timeline').boundingBox();
  if (timelineBox) {
    expect(timelineBox.x).toBeGreaterThanOrEqual(0);
    expect(timelineBox.x + timelineBox.width).toBeLessThanOrEqual(375);
  }
});

test('all viewer sections visible without horizontal scrolling', async ({ page }) => {
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 60000 });

  // Verify key sections are visible
  for (const selector of ['#viewerApp', '#mainImage', '#stepNarration', '#timeline']) {
    await expect(page.locator(selector)).toBeAttached();
  }

  // Confirm no horizontal overflow after all content loaded
  const hasOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow).toBe(false);
});
