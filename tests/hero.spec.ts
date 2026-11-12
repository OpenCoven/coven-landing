import { test, expect } from '@playwright/test';

test('large desktop uses a wider hero and keeps the board in the first viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto('/');
  const hero = await page.locator('[data-r="hero"]').boundingBox();
  expect(hero!.width).toBeGreaterThan(1300);
  const board = await page.locator('[data-board]').boundingBox();
  expect(board!.y).toBeLessThan(530);
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
    await expect(page.locator('[data-hero] [data-dl-btn]')).toBeVisible();
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
  await expect(page.locator('[data-hero] [data-dl-btn]')).toBeEnabled();
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
  const nav = await page.locator('[data-nav] > .landing-container').boundingBox();
  expect(nav!.width).toBe(1204);
});

test('phone users reach the headline and primary action before the illustration', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const action = await page.locator('[data-hero] [data-dl-btn]').boundingBox();
  const art = await page.locator('[data-hero-sculpture]').boundingBox();
  expect(action!.y + action!.height).toBeLessThan(art!.y);
  expect(action!.y + action!.height).toBeLessThan(600);
});
