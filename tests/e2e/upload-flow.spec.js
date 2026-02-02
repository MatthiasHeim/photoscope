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
  tmpFile = path.join(os.tmpdir(), 'test-image.jpg');
  fs.writeFileSync(tmpFile, MINIMAL_JPEG);
});

test.afterAll(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test('page title and upload zone are visible', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Photoscope/);
  await expect(page.locator('#dropzone')).toBeVisible();
  await expect(page.locator('#fileInput')).toBeAttached();
  await expect(page.locator('#browseBtn')).toBeVisible();
});

test('upload image via file input and redirect to viewer', async ({ page }) => {
  await page.goto('/');

  const fileInput = page.locator('#fileInput');
  await fileInput.setInputFiles(tmpFile);

  await page.waitForURL(/\/view\/.+/, { timeout: 15000 });

  // Verify viewer elements
  await expect(page.locator('#mainImage')).toBeAttached();
  await expect(page.locator('#overlayLayer')).toBeAttached();
  await expect(page.locator('#timeline')).toBeAttached();
  await expect(page.locator('#viewerApp')).toBeVisible();
});
