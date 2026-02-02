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
  tmpFile = path.join(os.tmpdir(), 'test-share.jpg');
  fs.writeFileSync(tmpFile, MINIMAL_JPEG);
});

test.afterAll(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test('shareable URL loads viewer in a new context', async ({ page, browser }) => {
  // Upload image and get viewer URL
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 15000 });

  const viewerUrl = page.url();
  expect(viewerUrl).toMatch(/\/view\/.+/);

  // Open the same URL in a completely new browser context
  const newContext = await browser.newContext();
  const newPage = await newContext.newPage();
  await newPage.goto(viewerUrl);

  // Verify the viewer loads correctly in the new context
  await expect(newPage.locator('#viewerApp')).toBeVisible({ timeout: 10000 });
  await expect(newPage.locator('#mainImage')).toBeAttached();
  await expect(newPage.locator('#stepLabel')).not.toBeEmpty();

  await newContext.close();
});
