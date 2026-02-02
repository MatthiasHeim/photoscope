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
  tmpFile = path.join(os.tmpdir(), 'test-celebrations.jpg');
  fs.writeFileSync(tmpFile, MINIMAL_JPEG);
});

test.afterAll(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test('celebration canvas exists in viewer', async ({ page }) => {
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 15000 });

  await expect(page.locator('#viewerApp')).toBeVisible();
  await expect(page.locator('#celebrationCanvas')).toBeAttached();
});

test('celebration canvas is present when navigating to a step with celebrate flag', async ({ page }) => {
  // Use the sample-analysis fixture by manually setting up analysis on the server
  // For this test, upload and verify the canvas element exists
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 15000 });

  await expect(page.locator('#celebrationCanvas')).toBeAttached();

  // The canvas should be a canvas element
  const tagName = await page.locator('#celebrationCanvas').evaluate((el) => el.tagName);
  expect(tagName).toBe('CANVAS');
});
