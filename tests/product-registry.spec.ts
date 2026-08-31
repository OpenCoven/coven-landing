import { expect, test } from '@playwright/test';

test('quickstart recommends exactly four active products and separates CastCodes', async ({ page }) => {
  await page.goto('/quickstart/');

  const activeGrid = page.locator('[data-active-product-grid]');
  await expect(activeGrid).toBeVisible();
  await expect(activeGrid.locator('[data-product-lifecycle="active"]')).toHaveCount(4);
  await expect(activeGrid.getByText('Coven CLI', { exact: true })).toBeVisible();
  await expect(activeGrid.getByText('Coven Code', { exact: true })).toBeVisible();
  await expect(activeGrid.getByText('Coven Cave', { exact: true })).toBeVisible();
  await expect(activeGrid.getByText('OpenCoven for GitHub', { exact: true })).toBeVisible();
  await expect(activeGrid.getByText('CastCodes', { exact: true })).toHaveCount(0);

  const archived = page.locator('[data-product-lifecycle="archived"]');
  await expect(archived).toHaveCount(1);
  await expect(archived).toContainText('CastCodes');
  await expect(archived).toContainText('Archived · use Coven Code');

  const castArticle = page.locator('article#castcodes');
  await expect(castArticle).toBeAttached();
  await expect(castArticle.locator('#castcodes-heading')).toHaveText('CastCodes');
  await expect(castArticle).toContainText('Archived · use Coven Code');

  const activeGuides = page.locator('[data-active-product-guides] > article');
  await expect(activeGuides).toHaveCount(4);
  await expect(activeGuides.locator('#castcodes')).toHaveCount(0);
  const archiveGuides = page.locator('[data-archived-product-guides] > article');
  await expect(archiveGuides).toHaveCount(1);
});

test('the canonical three-command foundation is visible in order', async ({ page }) => {
  await page.goto('/quickstart/');
  const foundation = page.locator('.onboard-foundation-panel');
  const commands = await foundation.locator('.onboard-command > code').allTextContents();
  expect(commands.slice(0, 3)).toEqual([
    'npm install -g @opencoven/cli',
    'coven doctor',
    'coven',
  ]);
  expect(commands.join('\n')).not.toMatch(/\bcoven init\b/i);
});

test.describe('quickstart remains truthful without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('active and archived product boundaries remain readable', async ({ page }) => {
    await page.goto('/quickstart/');
    await expect(page.locator('[data-active-product-grid]')).toBeVisible();
    await expect(page.locator('[data-product-lifecycle="active"]')).toHaveCount(4);
    await expect(page.locator('[data-product-lifecycle="archived"]')).toHaveCount(1);
    await expect(page.getByRole('heading', {
      name: 'CastCodes is preserved for migration, not new onboarding.',
    })).toBeVisible();
  });
});
