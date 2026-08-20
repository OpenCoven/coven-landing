import { test, expect } from '@playwright/test';

// Browser checks for the redesign. The preview server has no /api functions,
// so behaviors fed by /api/site-stats or /stream are asserted in their
// graceful fallback states; production behavior is covered by the api/
// functions themselves.

test('landing renders the hero and adapts the download button', async ({ page }) => {
  // Platform retargeting reads navigator.platform first, because Chrome's UA
  // reduction freezes the UA string to Windows on every desktop OS. Emulate the
  // platform so the machine running the suite cannot decide the expectation.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64', configurable: true });
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/OpenCoven/);
  await expect(page.locator('h1')).toContainText("Stop being your agents' control plane");

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

// The landing page never stops moving: motion.js reveals sections on scroll,
// runBoard swaps the session log lines for ~6s, and runTicks counts the diff
// numbers up. Playwright's actionability check makes a click wait for its
// target to hold still across two animation frames, so a click aimed into that
// demo can spin for tens of seconds and exhaust the whole test budget — a
// traced failure of the session-cell test burned 20.6s inside one click().
// These two tests assert behavior rather than motion, so they drive the page
// in its reduced-motion mode. The redesign scripts already branch on that
// preference, so the assertions still cover shipped code, but the layout
// settles at once and each click lands on the frame it is issued.
test.describe('interactions with the demo held still', () => {
  test.use({ reducedMotion: 'reduce' });

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

  test('clicking a session cell opens the familiar inspector window', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-live-board]').scrollIntoViewIfNeeded();
    const firstRow = page.locator('[data-panel="sessions"] [data-row]').first();
    // initWindows() stamps data-fam while the module boots, so waiting on the
    // attribute waits for the click wiring itself rather than sleeping past it.
    // regression: the fam name must come from its own element, not from
    // splitting textContent on a newline Astro's compiler collapses away
    await expect(firstRow).toHaveAttribute('data-fam', 'Hexi');
    await firstRow.locator(':scope > *').first().click();
    const win = page.locator('[data-win="profile"]');
    await expect(win).toBeVisible();
    await expect(win).toContainText('familiar');
  });
});
