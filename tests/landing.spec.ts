import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const productContracts = [
  { id: 'coven-cli', name: 'Coven CLI' },
  { id: 'coven-code', name: 'Coven Code' },
  { id: 'coven-cave', name: 'Coven Cave' },
  { id: 'castcodes', name: 'CastCodes' },
  { id: 'github', name: 'OpenCoven for GitHub' },
] as const;

for (const pathname of ['/', '/quickstart', '/github', '/terms', '/privacy']) {
  test(`${pathname} renders without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    const response = await page.goto(pathname);

    expect(response?.ok()).toBe(true);
    await expect(page.locator('main')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('GitHub beta and run preview retain their visible layout', async ({
  page,
}) => {
  await page.goto('/github');

  const hero = page.locator('.github-hero');
  const beta = hero.getByText('hosted beta', { exact: true });
  await expect(beta).toBeVisible();
  await expect(beta).toHaveCSS('display', 'flex');

  const runCard = hero.locator('.github-run-card');
  const topbar = runCard
    .getByText('github · familiar run', { exact: true })
    .locator('..');
  await expect(topbar).toBeVisible();
  await expect(topbar).toHaveCSS('display', 'flex');
  await expect(topbar).toHaveCSS('justify-content', 'space-between');

  const cmdline = runCard
    .getByText('@Forge assigned to issue #128', { exact: true })
    .locator('..');
  await expect(cmdline).toBeVisible();
  await expect(cmdline).toHaveCSS('display', 'flex');
  await expect(cmdline).toHaveCSS('align-items', 'center');
});

test('Quickstart exposes five complete product guides', async ({ page }) => {
  await page.goto('/quickstart');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Choose your way into OpenCoven.',
    }),
  ).toBeVisible();
  await expect(page.locator('.onboard-product')).toHaveCount(
    productContracts.length,
  );

  for (const product of productContracts) {
    const guide = page.locator(`#${product.id}`);
    await expect(
      guide.getByRole('heading', { level: 2, name: product.name }),
    ).toBeVisible();
    await expect(guide.getByText('Your first success')).toBeVisible();
    await expect(
      page.locator(`.onboard-chooser-card[href="#${product.id}"]`),
    ).toHaveCount(1);
  }

  await expect(
    page.locator('.desktop-nav a[href="/quickstart"]'),
  ).toHaveAttribute('aria-current', 'page');
});

test('Quickstart remains complete without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });

  try {
    const page = await context.newPage();
    await page.goto('/quickstart');

    await expect(page.locator('.onboard-product')).toHaveCount(
      productContracts.length,
    );
    await expect(page.locator('.mobile-nav-fallback')).toBeVisible();
    await expect(page.locator('.onboard-command code').first()).toHaveText(
      'npm install -g @opencoven/cli',
    );
  } finally {
    await context.close();
  }
});

test('Quickstart mobile menu traps focus and restores the opener', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/quickstart');

  const toggle = page.locator('.mobile-toggle');
  const dialog = page.locator('#mobile-nav');
  const close = dialog.locator('.mobile-nav-close');
  const lastLink = dialog.locator('a').last();

  await toggle.click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  await expect(close).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(lastLink).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
});

test('Quickstart theme control cycles system to light to dark', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('theme', 'system'));
  await page.goto('/quickstart');

  const html = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]');
  await expect(html).toHaveAttribute('data-theme-pref', 'system');

  await toggle.click();
  await expect(html).toHaveAttribute('data-theme-pref', 'light');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await toggle.click();
  await expect(html).toHaveAttribute('data-theme-pref', 'dark');
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('Quickstart copy success announces the exact command', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __copied?: string }).__copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          (window as Window & { __copied?: string }).__copied = value;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto('/quickstart');

  const button = page
    .locator('[data-copy="npm install -g @opencoven/cli"]')
    .first();
  await button.click();

  await expect(button).toHaveAttribute('aria-label', 'Copied');
  await expect(page.locator('[data-copy-live]')).toHaveText(
    'Copied: npm install -g @opencoven/cli',
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __copied?: string }).__copied,
    ),
  ).toBe('npm install -g @opencoven/cli');
});

test('Quickstart clipboard failure leaves a manual fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('clipboard denied')),
      },
    });
  });
  await page.goto('/quickstart');

  const button = page
    .locator('[data-copy="npm install -g @opencoven/cli"]')
    .first();
  const surface = button.locator(
    'xpath=ancestor::*[@data-copy-surface][1]',
  );
  await button.click();

  await expect(button).toHaveAttribute(
    'aria-label',
    'Copy unavailable. Select the command and copy manually.',
  );
  await expect(surface.locator('[data-copy-guidance]')).toHaveText(
    'Copy unavailable. Command selected. Press Ctrl+C or Command+C to copy manually.',
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    'npm install -g @opencoven/cli',
  );
});

for (const pathname of ['/quickstart', '/github']) {
  test(`${pathname} has no serious axe violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(pathname);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
  });
}

for (const pathname of ['/quickstart', '/github']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`${pathname} ${viewport.name} has no horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(pathname);

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth + 1,
      );
    });
  }
}
