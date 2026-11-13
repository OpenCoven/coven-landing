import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/release',
  outputDir: 'test-results/release',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report-release' }],
        ['junit', { outputFile: 'test-results/release/junit.xml' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'playwright-report-release' }],
      ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'release-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'release-firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'release-webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'release-mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'release-mobile-webkit',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
