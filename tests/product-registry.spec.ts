import { expect, test } from '@playwright/test';

const ACTIVE_NAMES = [
  'Coven CLI',
  'Coven Code',
  'Coven Cave',
  'OpenCoven for GitHub',
];

test('quickstart recommends exactly four active products and separates CastCodes', async ({ page }) => {
  await page.goto('/quickstart/');

  const activeGrid = page.locator('[data-active-product-grid]');
  const activeCards = activeGrid.locator('[data-product-lifecycle="active"]');
  await expect(activeGrid).toBeVisible();
  await expect(activeCards).toHaveCount(4);
  await expect(activeCards.locator('h3')).toHaveText(ACTIVE_NAMES);
  await expect(activeGrid).not.toContainText('CastCodes');

  const archiveGrid = page.locator('[data-archived-product-grid]');
  const archiveCards = archiveGrid.locator('[data-product-lifecycle="archived"]');
  await expect(archiveGrid).toBeVisible();
  await expect(archiveCards).toHaveCount(1);
  await expect(archiveCards).toContainText('CastCodes');
  await expect(archiveCards).toContainText('Archived · use Coven Code');
});

test('quickstart CollectionPage JSON-LD lists active products only', async ({ page }) => {
  await page.goto('/quickstart/');

  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const documents = blocks.flatMap((source) => {
    const parsed = JSON.parse(source);
    return Array.isArray(parsed) ? parsed : [parsed];
  });
  const collection = documents.find((document) => document['@type'] === 'CollectionPage');
  expect(collection).toBeTruthy();

  const items = collection.mainEntity.itemListElement;
  expect(items).toHaveLength(4);
  expect(items.map((item: { name: string }) => item.name)).toEqual(ACTIVE_NAMES);
  expect(items.some((item: { name: string }) => item.name === 'CastCodes')).toBe(false);
});

test('the canonical three-command foundation is visible in registry order', async ({ page }) => {
  await page.goto('/quickstart/');

  await expect(page.locator('[data-copy-surface] [data-oc-part="source"]')).toHaveText([
    'npm install -g @opencoven/cli',
    'coven doctor',
    'coven',
  ]);
  await expect(page.locator('#foundation')).not.toContainText('coven init');
});

test.describe('registry boundary without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('active and archived product boundaries remain readable', async ({ page }) => {
    await page.goto('/quickstart/');
    await expect(page.locator('[data-product-lifecycle="active"]')).toHaveCount(4);
    await expect(page.locator('[data-product-lifecycle="archived"]')).toHaveCount(1);
    await expect(
      page.getByRole('heading', {
        name: 'Historical lineage stays visible, not recommended.',
      }),
    ).toBeVisible();
  });
});
