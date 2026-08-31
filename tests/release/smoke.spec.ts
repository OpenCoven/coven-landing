import { expect, test } from '@playwright/test';

const ORIGIN = 'http://127.0.0.1:4173';
const PUBLIC_ROUTES = [
  '/',
  '/quickstart/',
  '/github/',
  '/how-it-works/',
  '/protocol/',
  '/security/',
  '/status/',
  '/privacy/',
  '/terms/',
] as const;

const EXPECTED_HEADINGS: Record<(typeof PUBLIC_ROUTES)[number], string> = {
  '/': 'Give your agents continuity. Keep authority local.',
  '/quickstart/': 'Start with one local foundation.',
  '/github/': 'Assign bounded work. Get inspectable delivery back.',
  '/how-it-works/': 'The local layer your agent sessions share.',
  '/protocol/': 'Identity is not authority. Continuity is not a copied prompt.',
  '/security/': 'Report vulnerabilities privately. Verify what you run.',
  '/status/': 'Status should come from data, not memory.',
  '/privacy/': 'Privacy Policy',
  '/terms/': 'Terms of Service',
};

test('all public routes render canonical content without runtime errors', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.location().url.includes('/api/')) return;
    runtimeErrors.push(`console: ${message.text()}`);
  });

  for (const route of PUBLIC_ROUTES) {
    runtimeErrors.length = 0;
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `${route} did not return a successful document`).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      EXPECTED_HEADINGS[route],
    );
    await expect(page.locator('main#content')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${ORIGIN.replace('127.0.0.1:4173', 'opencoven.ai')}${route.replace(/\/$/, '')}`,
    );

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.scrollWidth,
      `${route} has document-level horizontal overflow`,
    ).toBeLessThanOrEqual(dimensions.clientWidth);
    expect(runtimeErrors, `${route} emitted runtime errors`).toEqual([]);
  }
});

test('theme selection persists and remains bounded to system, light, or dark', async ({ page }) => {
  await page.goto('/');
  const control = page.getByLabel('Color theme');
  await expect(control).toBeVisible();

  await control.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'dark');
  await page.reload();
  await expect(control).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await control.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'light');
});

test('the appropriate navigation remains operable for the project viewport', async ({ page }) => {
  await page.goto('/protocol/');
  const mobileTrigger = page.locator('[data-mobile-navigation] > summary');

  if (await mobileTrigger.isVisible()) {
    const disclosure = page.locator('[data-mobile-navigation]');
    await mobileTrigger.click();
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(disclosure).toHaveAttribute('data-oc-state', 'expanded');
    await expect(disclosure.getByRole('link', { name: 'GitHub' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await expect(disclosure).toHaveAttribute('data-oc-state', 'collapsed');
    await expect(mobileTrigger).toBeFocused();
  } else {
    const desktop = page.locator('.desktop-nav');
    await expect(desktop).toBeVisible();
    await expect(desktop.getByRole('link', { name: 'Protocol' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(desktop.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      '/github',
    );
  }
});

test('reduced-motion preference preserves complete readable states', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  expect(
    await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
  ).toBe(true);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A concrete local proof.' })).toBeVisible();
  await expect(page.getByText('The principal decides.', { exact: false })).toBeVisible();
});

test('static public content remains usable when JavaScript is disabled', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  try {
    for (const route of PUBLIC_ROUTES) {
      const response = await page.goto(`${ORIGIN}${route}`, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        EXPECTED_HEADINGS[route],
      );
      await expect(page.locator('main#content')).toBeVisible();

      const disclosure = page.locator('[data-mobile-navigation]');
      await disclosure.locator('summary').click();
      await expect(disclosure).toHaveAttribute('open', '');
      await expect(disclosure.getByRole('link', { name: 'GitHub' })).toBeVisible();
    }
  } finally {
    await context.close();
  }
});
