import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const FOUNDATION_COMMANDS = [
  'npm install -g @opencoven/cli',
  'coven doctor',
  'coven',
];

const ACTIVE_PRODUCTS = [
  'Coven CLI',
  'Coven Code',
  'Coven Cave',
  'OpenCoven for GitHub',
];

test('vNext homepage renders the bounded story and canonical local start', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/OpenCoven/);
  await expect(page.locator('h1')).toHaveText(
    'Give your agents continuity. Keep authority local.',
  );
  await expect(
    page.getByRole('heading', { name: 'Identity → authority → continuity.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'A concrete local proof.' }),
  ).toBeVisible();

  await expect(page.locator('.command-row code')).toHaveText(FOUNDATION_COMMANDS);
  await expect(
    page.getByRole('link', { name: 'Start locally' }).first(),
  ).toHaveAttribute('href', '/quickstart');
});

test('recommended products come from the active registry and exclude archives', async ({ page }) => {
  await page.goto('/');

  const products = page.locator('#products .product-card');
  await expect(products).toHaveCount(ACTIVE_PRODUCTS.length);
  await expect(products.locator('h3')).toHaveText(ACTIVE_PRODUCTS);
  await expect(page.locator('#products')).not.toContainText('CastCodes');

  const statuses = products.locator('[data-oc-primitive="status-indicator"]');
  await expect(statuses).toHaveCount(ACTIVE_PRODUCTS.length);
  for (const status of await statuses.all()) {
    await expect(status).toHaveAttribute(
      'data-oc-state',
      /^(success|selected|unavailable)$/,
    );
  }
});

test('guided proof stays semantic, complete, and ordered without simulated app chrome', async ({ page }) => {
  await page.goto('/');

  const proof = page.locator('[data-oc-primitive="guided-proof"]');
  await expect(proof).toHaveAttribute('data-oc-state', 'selected');
  await expect(proof.locator('.proof-step')).toHaveCount(3);
  await expect(proof.locator('.proof-step h3')).toHaveText([
    'Two sessions claim the same surface.',
    'Coven holds the second protected write.',
    'The principal decides.',
  ]);
  await expect(proof.locator('[data-oc-part="evidence-region"]')).toBeVisible();
});

test('the pinned canonical mark is used by the shell and hero', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('header .brand-mark--header')).toBeVisible();
  await expect(page.locator('.hero__mark .brand-mark')).toBeVisible();
  await expect(page.locator('header img[src="/favicon.svg"]')).toHaveCount(0);
  await expect(page.locator('.hero__mark img[src="/favicon.svg"]')).toHaveCount(0);

  const maskImage = await page
    .locator('.hero__mark .brand-mark')
    .evaluate((element) => getComputedStyle(element).maskImage);
  expect(maskImage).toContain('/assets/opencoven-mark.svg');
});

test('three-state theme control applies and persists explicit preferences', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');
  const theme = page.locator('[data-theme-select]');
  await expect(theme).toHaveValue(/^(system|light|dark)$/);

  await theme.selectOption('light');
  await expect(html).toHaveAttribute('data-oc-theme', 'light');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(html).toHaveAttribute('data-theme-pref', 'light');

  await page.reload();
  await expect(page.locator('[data-theme-select]')).toHaveValue('light');
  await expect(html).toHaveAttribute('data-oc-theme', 'light');

  await page.locator('[data-theme-select]').selectOption('dark');
  await expect(html).toHaveAttribute('data-oc-theme', 'dark');
  await expect(html).toHaveAttribute('data-theme-pref', 'dark');
});

test('mobile navigation exposes state, closes on Escape, and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const disclosure = page.locator('[data-mobile-navigation]');
  const trigger = disclosure.locator('summary');
  await expect(disclosure).toHaveAttribute('data-oc-state', 'collapsed');
  await expect(trigger).toHaveText('Menu');
  await expect(trigger).toHaveAccessibleName('Menu');

  await trigger.click();
  await expect(disclosure).toHaveAttribute('data-oc-state', 'expanded');
  await expect(disclosure.getByRole('link', { name: 'Quickstart' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(disclosure).toHaveAttribute('data-oc-state', 'collapsed');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.locator('main').click({ position: { x: 8, y: 120 } });
  await expect(disclosure).toHaveAttribute('data-oc-state', 'collapsed');
});

test('skip link moves keyboard focus to the main content target', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#content')).toBeFocused();
});

test('homepage reflows at 320 CSS pixels without horizontal document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');

  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-mobile-navigation]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test('homepage shell has no automatically detectable WCAG violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('mobile navigation open state has no automatically detectable WCAG violations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('[data-mobile-navigation] summary').click();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('privacy table remains keyboard accessible on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/privacy/');

  const table = page.getByRole('region', { name: 'Data collection details' });
  await expect(table).toHaveAttribute('tabindex', '0');
  await expect
    .poll(() => table.evaluate((element) => element.scrollWidth > element.clientWidth))
    .toBe(true);

  await table.focus();
  await expect(table).toBeFocused();
});

test('no unexpected console errors on the vNext homepage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.location().url.includes('/api/')) return;
    errors.push(`console: ${message.text()}`);
  });

  await page.goto('/');
  await page.locator('#products').scrollIntoViewIfNeeded();
  await page.locator('[data-theme-select]').selectOption('light');
  expect(errors).toEqual([]);
});

test.describe('static-first homepage without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test('keeps the narrative, proof, products, commands, and navigation available', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.proof-step')).toHaveCount(3);
    await expect(page.locator('#products .product-card')).toHaveCount(4);
    await expect(page.locator('.command-row code')).toHaveText(FOUNDATION_COMMANDS);

    const disclosure = page.locator('[data-mobile-navigation]');
    await disclosure.locator('summary').click();
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(disclosure.getByRole('link', { name: 'Quickstart' })).toBeVisible();
  });
});
