import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = [
  {
    path: '/how-it-works/',
    title: 'How Coven works · OpenCoven',
    heading: 'The local layer your agent sessions share.',
  },
  {
    path: '/protocol/',
    title: 'OpenCoven Protocol · Identity, authority, continuity',
    heading: 'Identity is not authority. Continuity is not a copied prompt.',
  },
  {
    path: '/security/',
    title: 'Security · OpenCoven',
    heading: 'Report vulnerabilities privately. Verify what you run.',
  },
  {
    path: '/status/',
    title: 'Status and maturity · OpenCoven',
    heading: 'Status should come from data, not memory.',
  },
  {
    path: '/privacy/',
    title: 'Privacy Policy — OpenCoven',
    heading: 'Privacy Policy',
  },
  {
    path: '/terms/',
    title: 'Terms of Service — OpenCoven',
    heading: 'Terms of Service',
  },
] as const;

for (const route of ROUTES) {
  test(`${route.path} uses the canonical shell and route metadata`, async ({ page }) => {
    await page.goto(route.path);

    await expect(page).toHaveTitle(route.title);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading);
    await expect(page.locator('main#content')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://opencoven.ai${route.path.replace(/\/$/, '')}`,
    );
    await expect(page.locator('[data-oc-primitive="global-navigation"]')).toBeVisible();
  });
}

test('shared desktop and mobile navigation retain GitHub and expose Protocol', async ({ page }) => {
  await page.goto('/protocol/');

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

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = page.locator('[data-mobile-navigation]');
  await expect(mobile.locator('summary')).toBeVisible();
  await mobile.locator('summary').click();
  await expect(mobile).toHaveAttribute('open', '');
  await expect(mobile.getByRole('link', { name: 'Protocol' })).toHaveAttribute(
    'href',
    '/protocol',
  );
  await expect(mobile.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    '/github',
  );
});

test('protocol route preserves one-owner boundaries and maturity distinctions', async ({ page }) => {
  await page.goto('/protocol/');

  await expect(page.getByText('Mixed maturity', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Familiar Contract' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'SPAR Familiar Continuity Profile' }),
  ).toBeVisible();
  await expect(page.getByText('It is not a second identity root or ledger.')).toBeVisible();
  await expect(
    page.getByText('A name in configuration is not sufficient authorization.'),
  ).toBeVisible();

  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).not.toContain('same ai everywhere');
  expect(body).not.toContain('never forgets');
  expect(body).not.toContain('fully compliant');
});

test('security route directs vulnerability details to private channels only', async ({ page }) => {
  await page.goto('/security/');

  await expect(page.getByText('privately DM', { exact: false })).toContainText('@BunsDev');
  await expect(
    page.getByText('Do not post vulnerability details in a public Discord channel.'),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open a private security advisory' }),
  ).toHaveAttribute(
    'href',
    'https://github.com/OpenCoven/coven/security/advisories/new',
  );
  await expect(page.getByText('not a contractual service-level agreement', { exact: false })).toBeVisible();
});

test('status route renders four current products and one archived successor record', async ({ page }) => {
  await page.goto('/status/');

  const active = page.locator('[data-status-active-products] [data-product-id]');
  const archived = page.locator('[data-status-archived-products] [data-product-id]');
  await expect(active).toHaveCount(4);
  await expect(active.locator('h3')).toHaveText([
    'Coven CLI',
    'Coven Code',
    'Coven Cave',
    'OpenCoven for GitHub',
  ]);
  await expect(archived).toHaveCount(1);
  await expect(archived).toContainText('CastCodes');
  await expect(archived).toContainText('Successor: Coven Code');
  await expect(archived).toContainText('coven-code');
});

test('privacy route matches the bounded default-off analytics contract', async ({ page }) => {
  await page.goto('/privacy/');

  await expect(page.getByText('Analytics are disabled by default.', { exact: false })).toBeVisible();
  await expect(page.getByText('The default build does not load the analytics client.')).toBeVisible();
  await expect(page.getByText('We do not sell your data.')).toBeVisible();

  const body = await page.locator('body').innerText();
  expect(body).toContain('session replay');
  expect(body).toContain('heatmaps');
  expect(body).toContain('broad autocapture');
});

test('terms route preserves the dated governing text during shell migration', async ({ page }) => {
  await page.goto('/terms/');

  await expect(page.getByText('Effective date: May 27, 2026', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No Warranty' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Limitation of Liability' })).toBeVisible();
  await expect(page.getByText('State of Texas', { exact: false })).toBeVisible();
});

for (const route of ROUTES) {
  test(`${route.path} reflows at 320 CSS pixels without document overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route.path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.scrollWidth,
      `${route.path} rendered ${dimensions.scrollWidth}px wide in a ${dimensions.clientWidth}px viewport`,
    ).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

for (const route of ROUTES) {
  test(`${route.path} has no automatically detectable WCAG violations`, async ({ page }) => {
    await page.goto(route.path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test.describe('trust routes without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    test(`${route.path} remains readable and navigable`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading);
      await expect(page.locator('main#content')).toBeVisible();

      const menu = page.locator('[data-mobile-navigation]');
      await menu.locator('summary').click();
      await expect(menu).toHaveAttribute('open', '');
      await expect(menu.getByRole('link', { name: 'GitHub' })).toBeVisible();
    });
  }
});
