import { test, expect } from '@playwright/test';

for (const [platform, os, label] of [['Win32', 'windows', 'Windows'], ['Linux x86_64', 'linux', 'Linux'], ['MacIntel', 'mac', 'macOS']]) {
  test(`current download control targets ${label}`, async ({ page }) => {
    await page.addInitScript(platform => Object.defineProperty(navigator, 'platform', { get: () => platform }), platform);
    await page.goto('/');
    const button = page.locator('[data-dl-btn]').first();
    await expect(button).toHaveAttribute('data-dl-url', `/stream/${os}`);
    await expect(button.locator('[data-dl-label]')).toHaveText(`Download Cave for ${label}`);
  });
}

test('current download saves the received installer bytes', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' }));
  const payload = Buffer.alloc(4096, 7);
  await page.route('**/stream/linux', route => route.fulfill({ contentType: 'application/octet-stream', body: payload }));
  await page.goto('/');
  const button = page.locator('[data-dl-btn]').first();
  const pending = page.waitForEvent('download');
  await button.click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks)).toEqual(payload);
  await expect(button).toHaveAttribute('data-dl-state', 'done');
});

test('download proxy failure hands off to browser navigation', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
    const fetchReal = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/stream/') ? Promise.reject(new Error('proxy unavailable')) : fetchReal(input, init);
  });
  await page.route('**/stream/linux', route => route.fulfill({ contentType: 'text/html', body: '<p>Native handoff</p>' }));
  await page.goto('/');
  await page.locator('[data-dl-btn]').first().click();
  await expect(page).toHaveURL(/\/stream\/linux$/);
});
