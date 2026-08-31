import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const FORBIDDEN_MARKETING = [
  '$99/mo',
  '$399/mo',
  '14-day trial',
  'Contact for Pricing',
  'Assign it like a teammate',
];

test('GitHub route separates gated hosted interest from the public operator path', async ({ page }) => {
  await page.goto('/github/');

  await expect(page).toHaveTitle(
    'OpenCoven for GitHub · Familiar delivery under human oversight',
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Assign bounded work. Get inspectable delivery back.',
  );

  const hosted = page.getByRole('article').filter({ hasText: 'Hosted beta' });
  const selfHosted = page
    .getByRole('article')
    .filter({ hasText: 'Self-hosted worker' });
  await expect(hosted).toContainText('Hosted access gated');
  await expect(hosted.getByRole('link')).toHaveAttribute(
    'href',
    /github\.com\/OpenCoven\/coven-github\/issues\/new\?/,
  );
  await expect(selfHosted).toContainText('Public operator path');
  await expect(selfHosted.getByRole('link')).toHaveAttribute(
    'href',
    'https://github.com/OpenCoven/coven-github/blob/main/docs/self-hosting.md',
  );
});

test('GitHub route keeps the inspectable delivery loop in source order', async ({ page }) => {
  await page.goto('/github/');

  await expect(page.locator('.proof-step h3')).toHaveText([
    'Assign bounded work.',
    'Watch the Check Run.',
    'Receive familiar status.',
    'Review the draft pull request.',
    'Keep Cave oversight.',
  ]);
});

test('GitHub route omits unsupported pricing, trial, and Offer claims', async ({ page }) => {
  await page.goto('/github/');

  const body = await page.locator('body').innerText();
  for (const forbidden of FORBIDDEN_MARKETING) {
    expect(body).not.toContain(forbidden);
  }

  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const documents = blocks.flatMap((source) => {
    const parsed = JSON.parse(source);
    return Array.isArray(parsed) ? parsed : [parsed];
  });
  const application = documents.find(
    (document) => document['@type'] === 'SoftwareApplication',
  );
  expect(application).toBeTruthy();
  expect(application).not.toHaveProperty('offers');
});

test('GitHub route reflows at 320 CSS pixels without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/github/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test('GitHub route has no automatically detectable WCAG violations', async ({ page }) => {
  await page.goto('/github/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test.describe('GitHub route without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test('keeps availability, deployment paths, evidence links, and navigation readable', async ({ page }) => {
    await page.goto('/github/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Hosted access gated', { exact: true })).toBeVisible();
    await expect(page.getByText('Public operator path', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the repository' })).toBeVisible();

    const menu = page.locator('[data-mobile-navigation]');
    await menu.locator('summary').click();
    await expect(menu).toHaveAttribute('open', '');
  });
});
