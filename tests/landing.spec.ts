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

test('hero emphasis meets light-theme contrast', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'light');
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const emphasis = page.locator('.hero h1 em');
  await expect(emphasis).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const contrastRatio = await page.evaluate(() => {
    const parseRgb = (value: string) => {
      const channels = value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
      if (!channels || channels.length !== 3) {
        throw new Error(`Unable to parse RGB color: ${value}`);
      }
      return channels;
    };

    const luminance = (value: string) => {
      const [red, green, blue] = parseRgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };

    const foreground = window.getComputedStyle(
      document.querySelector('.hero h1 em')!,
    ).color;
    const background = window.getComputedStyle(document.documentElement)
      .backgroundColor;
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);

    return (
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    );
  });

  expect(contrastRatio).toBeGreaterThanOrEqual(3);
});
