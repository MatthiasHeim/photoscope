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
  tmpFile = path.join(os.tmpdir(), 'test-voice.jpg');
  fs.writeFileSync(tmpFile, MINIMAL_JPEG);
});

test.afterAll(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

test('voice toggle button changes icon on click', async ({ page }) => {
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles(tmpFile);
  await page.waitForURL(/\/view\/.+/, { timeout: 15000 });

  await expect(page.locator('#viewerApp')).toBeVisible();

  const voiceToggle = page.locator('#voiceToggle');
  await expect(voiceToggle).toBeVisible();

  // Initially voice-on icon is visible, voice-off is hidden
  const voiceOn = page.locator('.icon-voice-on');
  const voiceOff = page.locator('.icon-voice-off');

  await expect(voiceOn).toBeVisible();
  await expect(voiceOff).not.toBeVisible();

  // Click to toggle voice off
  await voiceToggle.click();

  // After click, icons should swap
  await expect(voiceOff).toBeVisible();
  await expect(voiceOn).not.toBeVisible();

  // Click again to toggle back on
  await voiceToggle.click();
  await expect(voiceOn).toBeVisible();
  await expect(voiceOff).not.toBeVisible();
});
