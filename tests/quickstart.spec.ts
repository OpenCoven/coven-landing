import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const INSTALL_COMMAND = 'npm install -g @opencoven/cli';

const installSurface = (page: Page) =>
  page.locator('[data-copy-surface]', {
    has: page.locator(`[data-copy="${INSTALL_COMMAND}"]`),
  });

test('quickstart exposes canonical metadata and current navigation', async ({ page }) => {
  await page.goto('/quickstart/');

  await expect(page).toHaveTitle('OpenCoven Quickstart · Start locally');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://opencoven.ai/quickstart',
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Start with one local foundation.',
  );
  await expect(
    page.locator('.desktop-nav a[href="/quickstart"]'),
  ).toHaveAttribute('aria-current', 'page');
});

test.describe('quickstart clipboard enhancement', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the exact command and exposes success state', async ({ page }) => {
    await page.goto('/quickstart/');

    const surface = installSurface(page);
    const button = surface.getByRole('button', {
      name: 'Copy command: Install the shared OpenCoven CLI/runtime',
    });
    await expect(surface).toHaveAttribute('data-oc-state', 'idle');
    await expect(button).toBeVisible();

    await button.click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(INSTALL_COMMAND);
    await expect(surface).toHaveAttribute('data-oc-state', 'success');
    await expect(surface.locator('[data-oc-part="status"]')).toHaveText(
      `Copied: ${INSTALL_COMMAND}`,
    );

    await expect(surface).toHaveAttribute('data-oc-state', 'idle', {
      timeout: 5_000,
    });
    await expect(button).toBeEnabled();
  });
});

test('selects the command and reports an error when clipboard access is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => undefined,
    });
  });
  await page.goto('/quickstart/');

  const surface = installSurface(page);
  await surface.getByRole('button').click();
  await expect(surface).toHaveAttribute('data-oc-state', 'error');
  await expect(surface.locator('[data-oc-part="status"]')).toHaveText(
    'Copy unavailable. Command selected; copy it manually.',
  );
  await expect
    .poll(() => page.evaluate(() => String(window.getSelection())))
    .toBe(INSTALL_COMMAND);
});

test('quickstart reflows at 320 CSS pixels without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/quickstart/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-copy-surface]')).toHaveCount(3);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test('quickstart has no automatically detectable WCAG violations', async ({ page }) => {
  await page.goto('/quickstart/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('quickstart enhancement produces no unexpected console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto('/quickstart/');
  await expect(page.locator('[data-copy-ready]')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test.describe('quickstart without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test('keeps commands, products, archive lineage, and native navigation readable', async ({ page }) => {
    await page.goto('/quickstart/');

    await expect(page.locator('[data-copy-surface]')).toHaveCount(3);
    await expect(page.locator('[data-copy]')).toHaveCount(3);
    for (const button of await page.locator('[data-copy]').all()) {
      await expect(button).toBeHidden();
    }
    await expect(page.locator('[data-product-lifecycle="active"]')).toHaveCount(4);
    await expect(page.locator('[data-product-lifecycle="archived"]')).toHaveCount(1);

    const menu = page.locator('[data-mobile-navigation]');
    await menu.locator('summary').click();
    await expect(menu).toHaveAttribute('open', '');
    await expect(menu.getByRole('link', { name: 'Quickstart' })).toBeVisible();
  });
});
