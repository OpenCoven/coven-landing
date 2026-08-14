import { test, expect } from '@playwright/test';

// Browser checks for the redesign. The preview server has no /api functions,
// so behaviors fed by /api/site-stats or /stream are asserted in their
// graceful fallback states; production behavior is covered by the api/
// functions themselves.

test('landing renders the hero and adapts the download button', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/OpenCoven/);
  await expect(page.locator('h1')).toContainText("Stop being your agents' control plane");

  // platform retargeting: chromium reports Linux via navigator.platform even
  // when UA reduction freezes the UA string to Windows
  const btn = page.locator('[data-dl-btn]').first();
  await expect(btn).toBeVisible();
  await expect(btn.locator('[data-dl-label]')).toHaveText('Download Cave for Linux');
  await expect(btn).toHaveAttribute('data-dl-url', '/stream/linux');
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

test('download menu opens, switches platform tabs, and closes on Escape', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-action="toggleDownloads"]').first().click();
  const menu = page.locator('[data-dl-menu]').first();
  await expect(menu).toBeVisible();
  const winTab = menu.locator('[data-dl-plat="win"], [data-dl-plat="windows"], [data-dl-plat="win-x64"]').first();
  if (await winTab.count()) {
    await winTab.click();
    await expect(winTab).toHaveAttribute('aria-selected', 'true');
  }
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
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

test('no unexpected console errors on the landing page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForTimeout(4000);
  expect(errors).toEqual([]);
});

test('clicking a session cell opens the familiar inspector window', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-live-board]').scrollIntoViewIfNeeded();
  // let the demo settle and the window wiring attach
  await page.waitForTimeout(4000);
  const firstRow = page.locator('[data-panel="sessions"] [data-row]').first();
  // regression: the fam name must come from its own element, not from
  // splitting textContent on a newline Astro's compiler collapses away
  await expect(firstRow).toHaveAttribute('data-fam', 'Hexi');
  await firstRow.locator(':scope > *').first().click();
  const win = page.locator('[data-win="profile"]');
  await expect(win).toBeVisible({ timeout: 5000 });
  await expect(win).toContainText('familiar');
});
