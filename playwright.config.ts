import { defineConfig, devices } from '@playwright/test';

// 4173 is Vite/Astro's shared preview default, so another project's preview
// server is often already listening there. `reuseExistingServer` would then
// silently run this suite against that site. Set PLAYWRIGHT_PORT to move the
// suite onto a free port, e.g. `PLAYWRIGHT_PORT=4317 pnpm check:browser`.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: false,
  // One worker, always. `fullyParallel: false` only serializes tests *within* a
  // file, so a second spec file — or any --repeat-each run — would fan out to
  // CPU/2 browsers against the single `pnpm preview` server. That saturates it
  // and times out tests that pass fine on their own.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `pnpm astro preview --host 127.0.0.1 --port ${port}`,
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
