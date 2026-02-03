import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import os from 'os';

test('visiting /view/nonexistent shows error screen', async ({ page }) => {
  await page.goto('/view/nonexistent-id-12345');

  // The viewer should show the error screen
  await expect(page.locator('#errorScreen')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#errorScreen')).toContainText('Not Found');
  await expect(page.locator('#viewerApp')).not.toBeVisible();
});

test('uploading a non-image file shows error message', async ({ page }) => {
  // Create a text file (not an image)
  const tmpFile = path.join(os.tmpdir(), 'test-not-image.txt');
  fs.writeFileSync(tmpFile, 'This is not an image file');

  try {
    await page.goto('/');

    const fileInput = page.locator('#fileInput');
    // Remove the accept attribute so we can set a non-image file
    await fileInput.evaluate((el) => el.removeAttribute('accept'));
    await fileInput.setInputFiles(tmpFile);

    // Should show error message
    await expect(page.locator('#errorMsg')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#errorMsg')).not.toBeEmpty();
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test('TTS endpoint failure does not crash the viewer', async ({ page }) => {
  // Intercept TTS requests to simulate failure
  await page.route('**/api/tts', (route) => {
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'TTS failed' }) });
  });

  await page.goto('/view/nonexistent-id-12345');

  // Even with TTS failing, error screen should show (not a crash)
  await expect(page.locator('#errorScreen')).toBeVisible({ timeout: 10000 });
});
