import { expect, test } from '@playwright/test';

for (const pathname of ['/', '/quickstart', '/github']) {
  test(`${pathname} renders without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    const response = await page.goto(pathname);

    expect(response?.ok()).toBe(true);
    await expect(page.locator('main')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('hero exposes one primary path and manual familiar tabs', async ({ page }) => {
  await page.goto('/');

  const hero = page.locator('.hero');
  await expect(
    hero.locator('[data-primary-cta][href="/quickstart"]'),
  ).toHaveText('Start with OpenCoven');
  await expect(
    hero.locator('a[href="https://github.com/OpenCoven/coven"]'),
  ).toHaveText('View on GitHub');

  const tabs = hero.locator('[data-familiar-tab]');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
});
