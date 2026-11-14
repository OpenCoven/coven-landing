import AxeBuilder from '@axe-core/playwright';
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

// Landing handoff H1/H2/H9: the session table is the hero visual, the dial is
// gone, Cave is defined under the primary button, and the stats links hold
// their place whether or not /api/site-stats answers (the preview server has
// no /api functions, so this is the failure state).
test('hero is a single column with the session table above the fold', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('[data-action="togglePower"]')).toHaveCount(0);
  await expect(page.locator('warded-braid')).toHaveCount(0);
  await expect(page.getByText('Cave is the desktop app for Coven.')).toBeVisible();

  const proof = page.locator('[data-r="proofrow"] a');
  await expect(proof).toHaveCount(3);
  for (const link of await proof.all()) await expect(link).toBeVisible();
  await expect(page.locator('[data-proof-count]').first()).toHaveText('');

  // header row and at least three session rows show without scrolling
  await expect(page.locator('[data-board][data-board-ready]')).toBeAttached();
  const bottoms = await page
    .locator('[data-panel="sessions"] [data-row][data-proj="opencoven"]')
    .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().bottom));
  expect(bottoms.filter((bottom) => bottom <= 900).length).toBeGreaterThanOrEqual(3);
});

// H4: Docs sits between How it works and GitHub; below 720px the three links
// move into a menu that Escape closes, handing focus back to its button.
test('nav carries Docs and collapses into a menu on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('[data-r="navlinks"] a')).toHaveText(['How it works', 'Docs', 'GitHub']);
  await expect(page.locator('[data-nav-menu]')).toBeHidden();

  await page.setViewportSize({ width: 500, height: 900 });
  const button = page.locator('[data-nav-menu] > summary');
  await expect(button).toBeVisible();
  await expect(button).toHaveAccessibleName('Menu');
  await button.click();
  const items = page.locator('[data-nav-menu-panel] a');
  await expect(items).toHaveText(['How it works', 'Docs', 'GitHub']);
  await expect(items.first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(items.first()).toBeHidden();
  await expect(button).toBeFocused();
});

// H8 and the no-JavaScript edge case: the markup itself is the finished
// overlap frame, so nothing depends on a script or an animation to be read.
test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the page reads as a static overlap frame', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-overlap-banner]')).toBeVisible();
    await expect(page.locator('[data-attention]')).toBeVisible();
    await expect(page.locator('[data-state-text]')).toHaveText('holding');
    await expect(page.locator('[data-tick]').first()).toHaveText('+86');
    await expect(page.locator('[data-board-pause]')).toBeHidden();
    for (const heading of ['One shared record.', 'What changes on day one', 'Install Cave, then open a repo.']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });
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
  await expect(page.locator('[data-r="footcols"] .footer-column')).toHaveCount(4);
  for (const column of await page.locator('.footer-column').all()) {
    await expect(column.locator('a')).toHaveCount(4);
  }
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
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  // The name promised console errors but only uncaught exceptions were
  // watched, so console.error calls and failed subresources went unseen.
  // Watch both, minus the /api routes the preview server genuinely does not
  // serve — those 404s are an artifact of this environment, not the page.
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (msg.location().url.includes('/api/')) return;
    errors.push(`console: ${msg.text()}`);
  });
  await page.goto('/');
  // Replaces a fixed sleep. The slowest thing on the page is the session
  // table's walkthrough, which ends when the overlap is raised, so waiting for
  // the "needs you" chip covers every script that runs before it.
  await expect(page.locator('[data-attention]')).toBeVisible({ timeout: 20_000 });
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
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

  test('download menu opens, switches platform tabs, and closes on Escape', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-action="toggleDownloads"]').first().click();
    const menu = page.locator('[data-dl-menu]').first();
    await expect(menu).toBeVisible();
    const winTab = menu.locator('[data-dl-plat="windows"]');
    // Unconditional on purpose. This was guarded by `if (await winTab.count())`
    // against two attribute spellings the markup never emits, so a renamed
    // attribute would have made the test pass while asserting nothing. Every
    // platform tab is authored statically in DownloadCta.astro.
    await winTab.click();
    await expect(winTab).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  // H2/H6/H12: with reduced motion the demo starts paused on the overlap frame;
  // headers describe themselves, and every cell is a keyboard-operable button.
  test('session table is paused, described, and keyboard operable', async ({ page }) => {
    await page.goto('/');
    const pause = page.getByRole('button', { name: 'Pause demo' });
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-overlap-banner]')).toBeVisible();

    const header = page.locator('[data-col-btn]').first();
    await expect(header).toHaveAccessibleDescription('The familiar attributed to this example session.');
    await header.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#board-col-familiar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#board-col-familiar')).toBeHidden();

    const cell = page.locator('[data-panel="sessions"] [data-row]').first().locator('[data-cell-btn="surface"]');
    await expect(cell).toHaveRole('button');
    await expect(cell).toHaveAccessibleName(/^Hexi, .*open the surface view$/);
    await cell.focus();
    await page.keyboard.press('Enter');
    const win = page.locator('[data-win="surface"]');
    await expect(win).toBeVisible();
    await expect(win.locator('[data-win-close]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(cell).toBeFocused();
  });

  test('the npm chip shows its copy cue at rest and confirms a copy', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    const chip = page.locator('[data-hero] [data-r="copybtn"]');
    const label = chip.locator('[data-copy-label]');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('copy');
    await chip.click();
    await expect(label).toHaveText('copied');
    await expect(page.locator('.cv-sr[role="status"]')).toHaveText('Copied');
    await expect(label).toHaveText('copy', { timeout: 4_000 });
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

test('pausing the demo freezes counters and logs until resume', async ({ page }) => {
  await page.goto('/');
  const pause = page.getByRole('button', { name: 'Pause demo' });
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  const read = () => page.locator('[data-board] [data-tick], [data-board] [data-log]').allTextContents();
  const frozen = await read();
  await page.waitForTimeout(4500);
  expect(await read()).toEqual(frozen);
  await pause.click();
  await expect(page.locator('[data-state-text]')).toHaveText('holding', { timeout: 10000 });
});

test('column help stays visible when the pointer moves onto it', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-col-btn]').first().hover();
  const tooltip = page.locator('#board-col-familiar');
  await expect(tooltip).toBeVisible();
  const box = await tooltip.boundingBox();
  await page.mouse.move(box!.x + 10, box!.y + 10, { steps: 10 });
  await page.waitForTimeout(200);
  await expect(tooltip).toBeVisible();
});

test('successful stats do not move mobile content', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/site-stats', async route => {
    await ready;
    await route.fulfill({ json: { stars: 12345, downloads: 54321, discord: { count: 1234, label: 'members' } } });
  });
  await page.goto('/');
  const row = page.locator('[data-r="proofrow"]');
  const initial = await row.boundingBox();
  release();
  await expect(page.locator('[data-stars-count]')).toHaveText('12k');
  const populated = await row.boundingBox();
  expect(populated!.height).toBe(initial!.height);
});

for (const width of [320, 500, 720, 1040, 1366, 1440]) {
  test(`current homepage reflows at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
}

test('current homepage has no serious or critical accessibility violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
});
