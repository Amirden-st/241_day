const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8341',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'node server.js',
    port: 8341,
    reuseExistingServer: true,
  },
});
