import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3456',
  },
  webServer: {
    command: 'PORT=3456 node server.js',
    port: 3456,
    reuseExistingServer: false,
  },
});
