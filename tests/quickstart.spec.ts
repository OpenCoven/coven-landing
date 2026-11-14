import { expect, test, type Locator, type Page } from '@playwright/test';

// Browser coverage for /quickstart.
//
// The page's markup, copy, canonical links, JSON-LD, and list semantics are
// already pinned by scripts/verify-static.mjs against the built HTML, so these
// tests deliberately avoid re-asserting structure. They cover the parts of the
// page that only exist at runtime and had no coverage at all: the
// copy-to-clipboard subsystem in src/scripts/main.js (wireCopyControls), its
// manual-copy fallback for browsers that refuse the Clipboard API, and the
// scroll offset that keeps a chosen product clear of the sticky header.

// Both commands are also required copy in verify-static.mjs, so they cannot
// drift here without failing there first. They are scoped to the Coven CLI
// guide because the install command is repeated across four product guides.
const INSTALL_COMMAND = 'npm install -g @opencoven/cli';
const DOCTOR_COMMAND = 'coven doctor';
const FALLBACK_MESSAGE =
  'Copy unavailable. Command selected. Press Ctrl+C or Command+C to copy manually.';
const FALLBACK_LABEL = 'Copy unavailable. Select the command and copy manually.';

const cliGuide = (page: Page): Locator => page.locator('article#coven-cli');

const copyButton = (page: Page, command: string): Locator =>
  cliGuide(page).locator(`.qs-copy[data-copy="${command}"]`);

const commandSurface = (page: Page, command: string): Locator =>
  // The `has` locator is resolved relative to each [data-copy-surface] match,
  // so it must be a bare selector rather than the article-scoped one above.
  cliGuide(page).locator('[data-copy-surface]', {
    has: page.locator(`.qs-copy[data-copy="${command}"]`),
  });

const liveRegion = (page: Page): Locator => page.locator('[data-copy-live]');

test.describe('quickstart copy controls', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copying a command puts exactly that command on the clipboard', async ({ page }) => {
    await page.goto('/quickstart/');

    const button = copyButton(page, INSTALL_COMMAND);
    await expect(button).toBeVisible();
    await button.click();

    // The clipboard itself is the contract; the visual confirmation is only
    // believable if the write actually happened.
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(INSTALL_COMMAND);

    await expect(button).toHaveClass(/is-copied/);
    await expect(button).toHaveAttribute('aria-label', 'Copied');
    // Sighted users get the check icon; everyone else gets this announcement.
    await expect(liveRegion(page)).toHaveAttribute('aria-live', 'polite');
    await expect(liveRegion(page)).toHaveText(`Copied: ${INSTALL_COMMAND}`);
  });

  test('the copied state reverts so the next command can be copied', async ({ page }) => {
    await page.goto('/quickstart/');

    const install = copyButton(page, INSTALL_COMMAND);
    const idleLabel = await install.getAttribute('aria-label');
    expect(idleLabel).toBeTruthy();
    expect(idleLabel).not.toBe('Copied');

    await install.click();
    await expect(install).toHaveAttribute('aria-label', 'Copied');

    // The handler restores the button on a 1.4s timer. A retrying assertion
    // waits exactly as long as that takes rather than sleeping past it, and
    // fails if the timer never fires and the button stays stuck on "Copied".
    await expect(install).toHaveAttribute('aria-label', idleLabel!);
    await expect(install).not.toHaveClass(/is-copied/);

    // Each button must copy its own command, not the last one wired.
    const doctor = copyButton(page, DOCTOR_COMMAND);
    await doctor.click();
    await expect(doctor).toHaveAttribute('aria-label', 'Copied');
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(DOCTOR_COMMAND);
  });
});

// Two ways a real browser refuses the Clipboard API: the object is absent
// (insecure context, older browsers) and the write is rejected (permission
// denied). The handler funnels both into the same catch, so both are asserted
// to keep either branch from rotting unnoticed.
const CLIPBOARD_FAILURES: Record<string, () => void> = {
  'the Clipboard API is unavailable': () => {
    Object.defineProperty(navigator, 'clipboard', {
      get: () => undefined,
      configurable: true,
    });
  },
  'the write is rejected': () => {
    Object.defineProperty(navigator, 'clipboard', {
      get: () => ({ writeText: () => Promise.reject(new Error('denied')) }),
      configurable: true,
    });
  },
};

test.describe('quickstart copy fallback', () => {
  for (const [condition, stubClipboard] of Object.entries(CLIPBOARD_FAILURES)) {
    test(`offers manual copy when ${condition}`, async ({ page }) => {
      await page.addInitScript(stubClipboard);
      await page.goto('/quickstart/');

      const button = copyButton(page, INSTALL_COMMAND);
      await button.click();

      await expect(button).toHaveClass(/is-copy-failed/);
      await expect(button).not.toHaveClass(/is-copied/);
      await expect(button).toHaveAttribute('aria-label', FALLBACK_LABEL);

      const surface = commandSurface(page, INSTALL_COMMAND);
      await expect(surface).toHaveClass(/has-copy-guidance/);
      await expect(surface.locator('[data-copy-guidance]')).toHaveText(FALLBACK_MESSAGE);
      await expect(liveRegion(page)).toHaveText(FALLBACK_MESSAGE);

      // The point of the fallback: the guidance tells the visitor to press
      // Ctrl+C / Command+C, which only copies anything because the handler
      // selected the command for them.
      await expect
        .poll(() => page.evaluate(() => String(window.getSelection())))
        .toBe(INSTALL_COMMAND);

      // A second failure moves the advice to the command the visitor just
      // tried instead of leaving stale guidance behind on the first one.
      await copyButton(page, DOCTOR_COMMAND).click();
      await expect(commandSurface(page, DOCTOR_COMMAND)).toHaveClass(/has-copy-guidance/);
      await expect(surface).not.toHaveClass(/has-copy-guidance/);
      await expect(page.locator('[data-copy-guidance]:not([hidden])')).toHaveCount(1);
    });
  }
});

test.describe('quickstart product chooser', () => {
  // Reduced motion turns the smooth scroll into a jump, so the settled
  // position is reached in one frame instead of being polled through an
  // animation. The offset under test is CSS geometry and is unaffected.
  test.use({ reducedMotion: 'reduce' });

  test('choosing a product lands it clear of the sticky header', async ({ page }) => {
    await page.goto('/quickstart/');

    const guide = page.locator('article#coven-cave');
    await page.locator('.onboard-chooser-card[href="#coven-cave"]').click();
    await expect(page).toHaveURL(/\/quickstart\/#coven-cave$/);

    // .onboard-product carries scroll-margin-top: 96px precisely because
    // .site-header is position: sticky. Wait for the jump first — the guide
    // starts ~5000px down, so "below the header" is trivially true before the
    // click and would pass without ever scrolling.
    await expect
      .poll(async () => Math.round((await guide.boundingBox())!.y), { timeout: 5_000 })
      .toBeLessThan(200);

    const guideTop = (await guide.boundingBox())!.y;
    const header = page.locator('.site-header').first();
    const headerBox = (await header.boundingBox())!;
    expect(guideTop).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    await expect(page.locator('#coven-cave-heading')).toBeInViewport();
  });
});

test.describe('quickstart runtime health', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('no unexpected console errors on the quickstart page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      // The preview server serves no /api functions; those 404s are an
      // artifact of this environment, not of the page.
      if (msg.location().url.includes('/api/')) return;
      errors.push(`console: ${msg.text()}`);
    });

    await page.goto('/quickstart/');
    // Proves the inline head script ran; main.js is a module script and so has
    // already executed by the time `load` resolves.
    await expect(page.locator('html')).toHaveClass(/js-on/);

    // Drive the page's asynchronous paths rather than sleeping next to them:
    // scrolling fires every reveal IntersectionObserver, and a copy runs the
    // async click handler plus its deferred reset.
    await page.locator('#onboard-support-heading').scrollIntoViewIfNeeded();
    const button = copyButton(page, INSTALL_COMMAND);
    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Copied');
    await expect(button).not.toHaveClass(/is-copied/);

    expect(errors).toEqual([]);
  });
});
