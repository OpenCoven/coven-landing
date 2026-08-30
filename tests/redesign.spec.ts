import { test, expect } from '@playwright/test';

// Browser checks for the redesign. The static preview server does not run the
// Vercel functions, so API-fed release metadata is asserted through its
// graceful static fallback. Primary downloads remain real browser-native links.

test('landing renders the hero and adapts the browser-native download link', async ({ page }) => {
  // Platform retargeting reads navigator.platform first, because Chrome's UA
  // reduction can freeze the UA string to Windows on every desktop OS. Emulate
  // the platform so the host running the suite cannot decide the expectation.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Linux x86_64',
      configurable: true,
    });
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/OpenCoven/);
  await expect(page.locator('h1')).toContainText("Stop being your agents' control plane");

  const link = page.locator('[data-dl-btn]').first();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/download/linux');
  await expect(link).toHaveAttribute('data-dl-platform', 'linux');
  await expect(link).not.toHaveAttribute('data-action', 'startDownload');
  await expect(link.locator('[data-dl-label]')).toHaveText('Download Cave for Linux');
});

test('the braid assembles after idle boot', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('warded-braid canvas')).toBeAttached({ timeout: 15_000 });
});

test('theme toggle flips data-theme and persists', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.locator('[data-action="toggleTheme"]').first().click();
  const after = await html.getAttribute('data-theme');
  expect(after).not.toBe(before);
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', after);
});

test('footer hides the Product column until those pages exist', async ({ page }) => {
  await page.goto('/');
  const heading = page.locator('span', { hasText: /^Product$/ }).first();
  await expect(heading).toBeAttached({ timeout: 15_000 });
  await expect(heading).toBeHidden();
  await expect(page.locator('span', { hasText: /^Docs$/ }).first()).toBeVisible();
});

test('how-it-works renders with its own head and no template bindings', async ({ page }) => {
  await page.goto('/how-it-works/');
  await expect(page).toHaveTitle(/How it works/);
  await expect(page.locator('main')).toBeAttached();
  await expect(page.locator('h2', { hasText: 'own worktree' })).toBeAttached();
});

test('privacy table remains keyboard accessible on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/privacy/');

  const table = page.getByRole('region', { name: 'Data collection details' });
  await expect(table).toHaveAttribute('tabindex', '0');
  await expect.poll(() => table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

  await table.focus();
  await expect(table).toBeFocused();
});

test('no unexpected console errors on the landing page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (message.location().url.includes('/api/')) return;
    errors.push(`console: ${message.text()}`);
  });
  await page.goto('/');
  await expect(page.locator('warded-braid canvas')).toBeAttached({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

// The current board demo continues to animate. These tests assert behavior,
// not animation, so reduced motion keeps actionability deterministic.
test.describe('interactions with the demo held still', () => {
  test.use({ reducedMotion: 'reduce' });

  test('download chooser exposes state, switches tabs, and restores focus on Escape', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-action="toggleDownloads"]').first();
    const menu = page.locator('[data-dl-menu]').first();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-controls', /cave-download-options-/);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();

    const winTab = menu.locator('[data-dl-plat="windows"]');
    const winPanel = menu.locator('[data-dl-pane="windows"]');
    await winTab.click();
    await expect(winTab).toHaveAttribute('aria-selected', 'true');
    await expect(winTab).toHaveAttribute('tabindex', '0');
    await expect(winPanel).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('download platform tabs support arrow-key navigation', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-action="toggleDownloads"]').first().click();
    const menu = page.locator('[data-dl-menu]').first();
    const macTab = menu.locator('[data-dl-plat="mac"]');
    const windowsTab = menu.locator('[data-dl-plat="windows"]');

    await macTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(windowsTab).toBeFocused();
    await expect(windowsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking a session cell opens the familiar inspector window', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-live-board]').scrollIntoViewIfNeeded();
    const firstRow = page.locator('[data-panel="sessions"] [data-row]').first();
    await expect(firstRow).toHaveAttribute('data-fam', 'Hexi');
    await firstRow.locator(':scope > *').first().click();
    const win = page.locator('[data-win="profile"]');
    await expect(win).toBeVisible();
    await expect(win).toContainText('familiar');
  });
});
