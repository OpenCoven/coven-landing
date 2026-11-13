import { test, expect } from '@playwright/test';

test('large desktop uses a wider hero and keeps the next section in the first viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto('/');
  const hero = await page.locator('.hero--architectural').boundingBox();
  expect(hero!.width).toBeGreaterThan(1300);
  const board = await page.locator('.hero--architectural + .band').boundingBox();
  expect(board!.y).toBeLessThan(650);
  await expect(page.locator('[data-hero-sculpture]')).toBeVisible();
});

test('desktop sculpture can pause and survives WebGL context loss', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const stage = page.locator('[data-hero-sculpture]');
  await expect(stage).toHaveAttribute('data-state', 'live');
  const control = page.locator('[data-sculpture-pause]');
  await control.click();
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect(stage).toHaveAttribute('data-state', 'paused');
  await page.evaluate(() => document.querySelector('[data-hero-sculpture] canvas')!.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(stage).toHaveAttribute('data-state', 'fallback');
  await expect(stage.locator('img')).toBeVisible();
  await expect(control).toBeHidden();
});

for (const mode of ['reduce', 'mobile', 'no-script', 'failed-module'] as const) {
  test(`sculpture remains complete with ${mode}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-script', reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference', viewport: { width: mode === 'mobile' ? 390 : 1440, height: 900 } });
    const page = await context.newPage();
    const requests: string[] = [];
    page.on('request', request => { if (request.url().includes('sculpture-scene')) requests.push(request.url()); });
    if (mode === 'failed-module') await page.route('**/*sculpture-scene*', route => route.abort());
    await page.goto('/');
    const poster = page.locator('[data-hero-sculpture] img');
    await expect(poster).toBeVisible();
    expect(await poster.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    if (mode !== 'failed-module') expect(requests).toEqual([]);
    await expect(page.locator('.hero__copy .action--primary')).toBeVisible();
    await context.close();
  });
}

test('changing reduced motion restores the poster without layout movement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const stage = page.locator('[data-hero-sculpture]');
  await expect(stage).toHaveAttribute('data-state', 'live');
  const before = await stage.boundingBox();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(stage.locator('img')).toBeVisible();
  await expect(stage.locator('canvas')).toHaveCount(0);
  expect(await stage.boundingBox()).toEqual(before);
});

test('unavailable WebGL keeps the poster and the primary action usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null;
      return original.apply(this, [type, ...args] as any);
    } as any;
  });
  await page.goto('/');
  const stage = page.locator('[data-hero-sculpture]');
  await expect(stage).toHaveAttribute('data-state', 'fallback');
  await expect(stage.locator('img')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause 3D motion' })).toBeHidden();
  await expect(page.locator('.hero__copy .action--primary')).toBeEnabled();
});

test('manual pause survives switching between mobile and desktop layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const stage = page.locator('[data-hero-sculpture]');
  await expect(stage).toHaveAttribute('data-state', 'live');
  const pause = page.locator('[data-sculpture-pause]');
  await pause.click();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(stage.locator('canvas')).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(stage).toHaveAttribute('data-state', 'paused');
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await pause.click();
  await expect(stage).toHaveAttribute('data-state', 'live');
});

test('paused sculpture exposes its visible resume action to assistive technology', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const button = page.locator('[data-sculpture-pause]');
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAccessibleName('Resume 3D motion');
});

test('wider homepage does not expand secondary-page chrome', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto('/privacy');
  const nav = await page.locator('.site-header__inner').boundingBox();
  expect(nav!.width).toBe(1184);
});

test('phone users reach the headline and primary action before the illustration', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const action = await page.locator('.hero__copy .action--primary').boundingBox();
  const art = await page.locator('[data-hero-sculpture]').boundingBox();
  expect(action!.y + action!.height).toBeLessThan(art!.y);
  expect(action!.y + action!.height).toBeLessThan(600);
});

test('pending import does not mount offscreen and retries when visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let release!: () => void;
  let requested!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/*sculpture-scene*', async route => { requested(); await pending; await route.continue(); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await started;
  const stage = page.locator('[data-hero-sculpture]');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(stage).not.toBeInViewport();
  await page.waitForTimeout(100);
  const loaded = page.waitForResponse(response => response.url().includes('sculpture-scene'));
  release();
  await loaded;
  await page.waitForTimeout(300);
  await expect(stage.locator('canvas')).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(stage).toHaveAttribute('data-state', 'live');
});
