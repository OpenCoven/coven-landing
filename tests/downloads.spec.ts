import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const activeDownloadSource = [
  '../src/pages/index.astro',
  '../src/pages/quickstart.astro',
  '../src/pages/download.astro',
  '../src/layouts/SiteLayout.astro',
].map((relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')).join('\n');
const productsSource = readFileSync(
  new URL('../src/data/products.ts', import.meta.url),
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
    expect(activeDownloadSource, `active download source contains forbidden binary path: ${forbidden}`).not.toContain(forbidden);
  }

  expect(productsSource).toContain("label: 'Download Cave'");
  expect(productsSource).toContain("href: '/download'");
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

  test('the vNext homepage keeps the canonical start path usable without restoring a full download chooser', async ({ page }) => {
    await page.goto('/');
    const start = page.getByRole('link', { name: 'Start locally' }).first();
    await expect(start).toBeVisible();
    await expect(start).toHaveAttribute('href', '/quickstart');
    expect(await start.evaluate((element) => element.tagName)).toBe('A');
    await expect(page.locator('[data-dl-btn]')).toHaveCount(0);
  });

  test('the Cave product action reaches a browser-native platform chooser', async ({ page }) => {
    await page.goto('/quickstart/');
    const cave = page.locator('#coven-cave');
    await expect(cave.getByRole('link', { name: 'Download Cave' })).toHaveAttribute('href', '/download');

    await page.goto('/download/');
    await expect(page.getByRole('heading', { level: 1, name: 'Download Coven Cave.' })).toBeVisible();
    await expect(page.getByRole('link', { name: /macOS.*Apple silicon/ })).toHaveAttribute('href', '/download/mac');
    await expect(page.getByRole('link', { name: /macOS.*Intel/ })).toHaveAttribute('href', '/download/mac-intel');
    await expect(page.getByRole('link', { name: /Windows/ })).toHaveAttribute('href', '/download/windows');
    await expect(page.getByRole('link', { name: /Linux/ })).toHaveAttribute('href', '/download/linux');
  });
});