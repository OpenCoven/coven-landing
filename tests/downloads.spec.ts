import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const downloaderSource = readFileSync(
  new URL('../src/scripts/redesign/downloads.js', import.meta.url),
  'utf8',
);
const componentSource = readFileSync(
  new URL('../src/components/redesign/DownloadCta.astro', import.meta.url),
  'utf8',
);
const vercelConfig = readFileSync(
  new URL('../vercel.json', import.meta.url),
  'utf8',
);
const resolverSource = readFileSync(
  new URL('../api/download.js', import.meta.url),
  'utf8',
);
const workerSource = readFileSync(
  new URL('../workers/installer-stream/src/index.js', import.meta.url),
  'utf8',
);

test('landing source never owns the installer binary', () => {
  for (const forbidden of [
    'new Blob',
    '.getReader(',
    'chunks.push',
    'URL.createObjectURL',
    'streamDownload',
    "register('startDownload'",
    "'/stream/",
    '"/stream/',
    'coven init',
  ]) {
    expect(downloaderSource, `downloads.js contains forbidden binary path: ${forbidden}`).not.toContain(forbidden);
  }

  expect(componentSource).toContain('href="/download/mac"');
  expect(componentSource).not.toContain('data-action="startDownload"');
  expect(componentSource).not.toContain('data-dl-url=');
});

test('the browser-native resolver remains wired to an allowlisted release selector', () => {
  const config = JSON.parse(vercelConfig);
  expect(config.rewrites).toContainEqual({
    source: '/download/:platform',
    destination: '/api/download?platform=:platform',
  });
  expect(resolverSource).toContain("import { MATCHERS, RELEASES_PAGE, REPO } from './_shared.js'");
  expect(resolverSource).toContain('const match = MATCHERS[platform]');
  expect(resolverSource).toContain('res.writeHead(302, { Location: asset.browser_download_url })');
  expect(resolverSource).toContain('workerDownloadUrl(platform)');
  expect(workerSource).toContain('new Response(upstream.body, { status: 200, headers })');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the primary Cave link is visible and points at the server resolver', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('[data-dl-btn]').first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/download/mac');
    await expect(link.locator('[data-dl-label]')).toHaveText('Download Cave for macOS');
    await expect(link).toHaveAttribute('data-dl-platform', 'mac');
    expect(await link.evaluate((element) => element.tagName)).toBe('A');
  });
});
