import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { quickstartProducts } from '../src/data/quickstart';

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

test('GitHub beta and run preview retain their visible layout', async ({ page }) => {
  await page.goto('/github');

  const hero = page.locator('.github-hero');
  const beta = hero.getByText('hosted beta', { exact: true });
  await expect(beta).toBeVisible();
  await expect(beta).toHaveCSS('display', 'flex');

  const runCard = hero.locator('.github-run-card');
  const topbar = runCard.getByText('github · familiar run', {
    exact: true,
  }).locator('..');
  await expect(topbar).toBeVisible();
  await expect(topbar).toHaveCSS('display', 'flex');
  await expect(topbar).toHaveCSS('justify-content', 'space-between');

  const cmdline = runCard.getByText('@Forge assigned to issue #128', {
    exact: true,
  }).locator('..');
  await expect(cmdline).toBeVisible();
  await expect(cmdline).toHaveCSS('display', 'flex');
  await expect(cmdline).toHaveCSS('align-items', 'center');
});

test('hero exposes one primary path and manual familiar tabs', async ({ page }) => {
  await page.goto('/');

  const hero = page.locator('.hero');
  await expect(
    hero.locator('[data-primary-cta][href="/quickstart"]'),
  ).toHaveText('Start with OpenCoven');
  await expect(
    hero.locator('a[href="https://github.com/OpenCoven/coven"]'),
  ).toHaveText('View on GitHub');

  const tabs = hero.locator('[data-familiar-tab]');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
});

test('hero emphasis meets light-theme contrast', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'light');
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const emphasis = page.locator('.hero h1 em');
  await expect(emphasis).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const contrastRatio = await page.evaluate(() => {
    const parseRgb = (value: string) => {
      const channels = value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
      if (!channels || channels.length !== 3) {
        throw new Error(`Unable to parse RGB color: ${value}`);
      }
      return channels;
    };

    const luminance = (value: string) => {
      const [red, green, blue] = parseRgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };

    const foreground = window.getComputedStyle(
      document.querySelector('.hero h1 em')!,
    ).color;
    const background = window.getComputedStyle(document.documentElement)
      .backgroundColor;
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);

    return (
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    );
  });

  expect(contrastRatio).toBeGreaterThanOrEqual(3);
});

test('theme storage failure falls back to the live system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.route('**/*.js', async (route) => route.abort());
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('storage disabled');
    };
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'system');
});

test('continuity anchors and passive scroll select story state', async ({ page }) => {
  await page.goto('/');

  const story = page.locator('[data-continuity-story]');
  await expect(story.locator('[data-story-stage]')).toHaveCount(4);
  await expect(story.locator('[data-story-panel]:not([hidden])')).toHaveAttribute(
    'data-story-panel',
    'summoned',
  );

  await story.locator('a[href="#stage-moved"]').click();
  await expect(page).toHaveURL(/#stage-moved$/);
  await expect(story.locator('[data-story-panel]:not([hidden])')).toHaveAttribute(
    'data-story-panel',
    'moved',
  );

  await page.goto('/');
  await story.locator('#stage-returned').scrollIntoViewIfNeeded();
  await expect(story.locator('[data-story-panel]:not([hidden])')).toHaveAttribute(
    'data-story-panel',
    'returned',
  );
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
});

test('mobile story renders a readable ledger snapshot per stage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const stages = page.locator('[data-story-stage]');
  await expect(stages).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(stages.nth(index).locator('.stage-snapshot')).toBeVisible();
  }
  await expect(page.locator('.story-visual')).toBeHidden();
});

test('desktop story remains complete without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });

  try {
    const page = await context.newPage();
    await page.goto('/');

    const story = page.locator('[data-continuity-story]');
    const stages = story.locator('[data-story-stage]');
    await expect(stages).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expect.soft(stages.nth(index).locator('.stage-snapshot')).toBeVisible();
    }
    await expect.soft(story.locator('.story-visual')).toBeHidden();

    for (const title of [
      'Start inside one explicit project.',
      'Keep the conventions worth carrying.',
      'Change surfaces without starting over.',
      'Resume with the relevant state intact.',
    ]) {
      await expect(
        story.getByRole('heading', { level: 3, name: title, exact: true }),
      ).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

test('runtime proof uses accessible desktop tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const proof = page.locator('[data-runtime-proof]');
  const tabs = proof.locator('[data-runtime-tab]');
  await expect(tabs).toHaveCount(3);
  await expect(page.locator('[id="how-it-works"]')).toHaveCount(1);
  await expect(
    page.locator('footer a[href="/#how-it-works"]'),
  ).toHaveCount(1);
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(
    proof.locator('[data-runtime-panel].is-active'),
  ).toHaveAttribute('data-runtime-panel', 'coven');

  await tabs.nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(
    proof.locator('[data-runtime-panel].is-active'),
  ).toHaveAttribute('data-runtime-panel', 'project');

  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toBeFocused();
});

test('runtime proof synchronizes rapid keyboard selection immediately', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const tabs = page.locator('[data-runtime-proof] [data-runtime-tab]');
  await tabs.nth(0).click();
  await page.waitForTimeout(220);

  const snapshots = await page.evaluate(() => {
    const proof = document.querySelector('[data-runtime-proof]')!;
    const runtimeTabs = Array.from(
      proof.querySelectorAll<HTMLElement>('[data-runtime-tab]'),
    );

    const snapshot = () => ({
      focused: document.activeElement?.getAttribute('data-runtime-tab'),
      selected: runtimeTabs
        .find((tab) => tab.getAttribute('aria-selected') === 'true')
        ?.getAttribute('data-runtime-tab'),
      tabbable: runtimeTabs
        .find((tab) => tab.getAttribute('tabindex') === '0')
        ?.getAttribute('data-runtime-tab'),
      panel: proof
        .querySelector('[data-runtime-panel].is-active')
        ?.getAttribute('data-runtime-panel'),
    });

    runtimeTabs[0].focus();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    const afterFirst = snapshot();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    const afterSecond = snapshot();

    return { afterFirst, afterSecond };
  });

  expect(snapshots).toEqual({
    afterFirst: {
      focused: 'coven',
      selected: 'coven',
      tabbable: 'coven',
      panel: 'coven',
    },
    afterSecond: {
      focused: 'project',
      selected: 'project',
      tabbable: 'project',
      panel: 'project',
    },
  });
});

test('runtime proof becomes native disclosures on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('.runtime-desktop')).toBeHidden();
  const disclosures = page.locator('details.runtime-disclosure');
  await expect(disclosures).toHaveCount(3);
  await expect(disclosures.nth(1)).toHaveAttribute('open', '');
  await disclosures.nth(0).locator('summary').click();
  await expect(disclosures.nth(0)).toHaveAttribute('open', '');
});

test('runtime proof remains complete without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });

  try {
    const page = await context.newPage();
    await page.goto('/');

    const proof = page.locator('[data-runtime-proof]');
    await expect(proof.locator('[data-runtime-tab]')).toHaveCount(3);
    await expect(proof.locator('.runtime-tabs')).toBeHidden();

    const panels = proof.locator('[data-runtime-panel]');
    await expect(panels).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await expect.soft(panels.nth(index)).toBeVisible();
    }

    for (const title of [
      'Harness or product surface',
      'Coven',
      'Your project',
    ]) {
      await expect(
        proof.getByRole('heading', { level: 3, name: title, exact: true }),
      ).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

test('product constellation exposes five complete keyboard links', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const constellation = page.locator('.product-constellation');
  await expect(constellation).toHaveAttribute(
    'aria-describedby',
    'products-foundation-description',
  );
  await expect(constellation).toHaveAccessibleDescription(
    'Coven is the shared local-first runtime foundation behind all five surfaces.',
  );
  await expect(constellation.locator('.constellation-core')).toHaveAttribute(
    'aria-hidden',
    'true',
  );

  const items = constellation.locator(
    '[data-product-constellation] > li',
  );
  const cards = page.locator('[data-product-constellation] .product-card');
  await expect(items).toHaveCount(5);
  await expect(cards).toHaveCount(5);
  expect(
    quickstartProducts.map(({ id, name }) => ({ id, name })),
  ).toEqual(productContracts);

  for (const [index, contract] of productContracts.entries()) {
    const product = quickstartProducts[index];
    const item = items.nth(index);
    const card = cards.nth(index);
    await expect(item.locator(':scope > a.product-card')).toHaveCount(1);
    await expect(card).toHaveAttribute(
      'href',
      `/quickstart#${contract.id}`,
    );
    await expect(card.locator('.product-sigil')).toHaveText(product.sigil);
    await expect(card.locator('.product-heading small')).toHaveText(
      product.eyebrow,
    );
    await expect(card.locator('.product-heading strong')).toHaveText(
      contract.name,
    );
    await expect(card.locator('.product-summary')).toHaveText(product.summary);
    await expect(card.locator('.product-best')).toContainText(product.bestFor);
    await expect(card.locator('.product-meta span').nth(0)).toHaveText(
      product.status,
    );
    await expect(card.locator('.product-meta span').nth(1)).toHaveText(
      product.platforms,
    );
    await expect(card).toHaveAccessibleName(
      [
        product.eyebrow,
        contract.name,
        product.summary,
        'Best for',
        product.bestFor,
        product.status,
        product.platforms,
      ].join(' '),
    );
  }

  await page.locator('.runtime-docs').focus();
  for (const card of await cards.all()) {
    await page.keyboard.press('Tab');
    await expect(card).toBeFocused();
    await expect
      .poll(() =>
        card.evaluate((element) => {
          const focusRingProbe = document.createElement('span');
          focusRingProbe.style.boxShadow = 'var(--oc-focus-ring)';
          document.body.append(focusRingProbe);
          const hasSharedFocusRing =
            element.matches(':focus-visible')
            && window.getComputedStyle(element).boxShadow
              === window.getComputedStyle(focusRingProbe).boxShadow;
          focusRingProbe.remove();
          return hasSharedFocusRing;
        }),
      )
      .toBe(true);
    await expect
      .poll(() =>
        card
          .locator('.product-trace')
          .evaluate((trace) => window.getComputedStyle(trace).opacity),
      )
      .toBe('1');
  }
});

test('product constellation preserves the focus ring while hovered', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const runtimeDocs = page.locator('.runtime-docs');
  const firstCard = page
    .locator('[data-product-constellation] .product-card')
    .first();

  await runtimeDocs.focus();
  await firstCard.hover();
  await expect
    .poll(() => firstCard.evaluate((card) => card.matches(':hover')))
    .toBe(true);
  await expect
    .poll(() =>
      firstCard.evaluate((card) => window.getComputedStyle(card).transform),
    )
    .toBe('matrix(1, 0, 0, 1, 0, -2)');

  await page.keyboard.press('Tab');
  await expect(firstCard).toBeFocused();

  const focusState = await firstCard.evaluate((card) => {
    const focusRingProbe = document.createElement('span');
    focusRingProbe.style.boxShadow = 'var(--oc-focus-ring)';
    document.body.append(focusRingProbe);

    const state = {
      focusVisible: card.matches(':focus-visible'),
      hovered: card.matches(':hover'),
      boxShadow: window.getComputedStyle(card).boxShadow,
      focusRing: window.getComputedStyle(focusRingProbe).boxShadow,
    };

    focusRingProbe.remove();
    return state;
  });

  expect(focusState.focusVisible).toBe(true);
  expect(focusState.hovered).toBe(true);
  expect(focusState.boxShadow).toBe(focusState.focusRing);
  await expect(firstCard).toHaveCSS('transform', 'none');
});

test('product constellation honors approved responsive breakpoints', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const cards = page.locator('[data-product-constellation] .product-card');
  const boxesAt = async (width: number) => {
    await page.setViewportSize({ width, height: 1000 });
    return cards.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
        };
      }),
    );
  };

  const desktop = await boxesAt(1180);
  expect(desktop.map(({ y }) => y)).toEqual([
    desktop[0].y,
    desktop[0].y,
    desktop[0].y,
    desktop[3].y,
    desktop[3].y,
  ]);
  expect(desktop[3].y).toBeGreaterThan(desktop[0].y);
  expect(desktop[3].width).toBeGreaterThan(desktop[0].width);

  for (const width of [1179, 768]) {
    const tablet = await boxesAt(width);
    expect(tablet.map(({ y }) => y)).toEqual([
      tablet[0].y,
      tablet[0].y,
      tablet[2].y,
      tablet[2].y,
      tablet[4].y,
    ]);
    expect(tablet[2].y).toBeGreaterThan(tablet[0].y);
    expect(tablet[4].y).toBeGreaterThan(tablet[2].y);
    expect(tablet[4].x).toBe(tablet[0].x);
    const expectedFullWidth =
      tablet[1].x + tablet[1].width - tablet[0].x;
    expect(Math.abs(tablet[4].width - expectedFullWidth)).toBeLessThanOrEqual(1);
  }

  const mobile = await boxesAt(767);
  expect(new Set(mobile.map(({ y }) => y))).toHaveProperty('size', 5);
  expect(new Set(mobile.map(({ x }) => x))).toHaveProperty('size', 1);
  expect(new Set(mobile.map(({ width }) => width))).toHaveProperty('size', 1);
});

test('Quick Start preview uses three canonical selectable commands', async ({
  page,
}) => {
  await page.goto('/');

  const preview = page.locator('#quickstart');
  const steps = preview.locator('.quickstart-preview-step');
  await expect(steps).toHaveCount(3);

  const expectedCommands = [
    'npm install -g @opencoven/cli',
    'coven doctor',
    'coven run codex "explain this repo in 5 bullets"',
  ];
  for (const [index, expectedCommand] of expectedCommands.entries()) {
    const step = steps.nth(index);
    await expect(step.locator('code')).toHaveText(expectedCommand);
    await expect(step.locator('[data-copy]')).toHaveAttribute(
      'data-copy',
      expectedCommand,
    );
  }

  await expect(preview.locator('a[href="/quickstart"]')).toHaveText(
    'Choose any product',
  );

  const cliChoice = page.locator(
    '[data-product-constellation] a[href="/quickstart#coven-cli"]',
  );
  await cliChoice.click();
  await expect(page).toHaveURL(/\/quickstart#coven-cli$/);
  await expect(
    page.locator('#coven-cli').getByRole('heading', {
      level: 2,
      name: 'Coven CLI',
      exact: true,
    }),
  ).toBeVisible();
});

test('Quick Start mobile controls remain readable and touch sized', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const preview = page.locator('#quickstart');
  const copyControls = preview.locator('.quickstart-copy');
  const expectedResults = preview.locator('.preview-expected');
  await expect(copyControls).toHaveCount(3);
  await expect(expectedResults).toHaveCount(3);

  for (const copyControl of await copyControls.all()) {
    const box = await copyControl.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  for (const expectedResult of await expectedResults.all()) {
    const fontSize = await expectedResult.evaluate((element) =>
      Number.parseFloat(window.getComputedStyle(element).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(13);
  }

  for (const command of await preview.locator('.preview-command').all()) {
    await expect(command).toHaveCSS('overflow-x', 'auto');
  }

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test('closing invitation restores the primary conversion path', async ({
  page,
}) => {
  await page.goto('/');

  const closing = page.locator('.closing-invitation');
  await expect(closing).toContainText(
    'Your familiar, your tools, your machine.',
  );
  await expect(
    closing.locator('[data-primary-cta][href="/quickstart"]'),
  ).toHaveText('Start with OpenCoven');
  await expect(
    closing.locator('a[href="https://discord.gg/opencoven"]'),
  ).toBeVisible();
  await expect(page.locator('.ecosystem-section')).toHaveCount(0);
  await expect(page.locator('a[href="/#ecosystem"]')).toHaveCount(0);
});

test('closing invitation uses the approved mobile layout at 767px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 767, height: 1000 });
  await page.goto('/');

  const layout = await page.locator('.closing-invitation').evaluate((closing) => {
    const copy = closing.querySelector<HTMLElement>('.closing-copy')!;
    const primary = closing.querySelector<HTMLElement>('.closing-primary')!;
    const cta = primary.querySelector<HTMLElement>('[data-primary-cta]')!;
    const copyBox = copy.getBoundingClientRect();
    const primaryBox = primary.getBoundingClientRect();
    const ctaBox = cta.getBoundingClientRect();

    return {
      copy: {
        x: copyBox.x,
        y: copyBox.y,
        width: copyBox.width,
        bottom: copyBox.bottom,
      },
      primary: {
        x: primaryBox.x,
        y: primaryBox.y,
        width: primaryBox.width,
      },
      cta: {
        x: ctaBox.x,
        width: ctaBox.width,
      },
    };
  });

  expect(Math.abs(layout.primary.x - layout.copy.x)).toBeLessThanOrEqual(1);
  expect(layout.primary.y).toBeGreaterThanOrEqual(layout.copy.bottom);
  expect(Math.abs(layout.primary.width - layout.copy.width)).toBeLessThanOrEqual(
    1,
  );
  expect(Math.abs(layout.cta.x - layout.primary.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.cta.width - layout.primary.width)).toBeLessThanOrEqual(
    1,
  );
});

test('mobile menu is modal, traps focus, and restores the opener', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.locator('.mobile-toggle');
  const dialog = page.locator('#mobile-nav');
  const close = dialog.locator('.mobile-nav-close');
  const lastLink = dialog.locator('a').last();
  await expect(page.locator('.site-header')).toContainText('OpenCoven');
  await expect(
    page.locator('.site-header a[aria-label*="GitHub"]'),
  ).toHaveCount(0);

  await toggle.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
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

test('mobile menu marks the GitHub App route as current', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/github');

  await page.locator('.mobile-toggle').click();
  await expect(
    page.locator('#mobile-nav a[href="/github"]'),
  ).toHaveAttribute('aria-current', 'page');
});

test('mobile menu keeps the final keyboard target reachable in a short viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');

  await page.locator('.mobile-toggle').click();
  const dialog = page.locator('#mobile-nav');
  const finalLink = dialog.locator('a').last();
  await expect(dialog.locator('.mobile-nav-close')).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(finalLink).toBeFocused();

  const geometry = await dialog.evaluate((modal) => {
    const anchors = modal.querySelectorAll('a');
    const finalTarget = anchors.item(anchors.length - 1);
    if (!finalTarget) throw new Error('Mobile navigation has no links');
    const targetBox = finalTarget.getBoundingClientRect();
    const style = window.getComputedStyle(modal);
    return {
      clientHeight: modal.clientHeight,
      overflowY: style.overflowY,
      scrollHeight: modal.scrollHeight,
      scrollTop: modal.scrollTop,
      targetBottom: targetBox.bottom,
      targetTop: targetBox.top,
      viewportHeight: window.innerHeight,
    };
  });

  expect.soft(geometry.overflowY).toMatch(/^(auto|scroll)$/);
  expect.soft(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
  expect.soft(geometry.scrollTop).toBeGreaterThan(0);
  expect.soft(geometry.targetTop).toBeGreaterThanOrEqual(0);
  expect.soft(geometry.targetBottom).toBeLessThanOrEqual(
    geometry.viewportHeight,
  );
});

test('mobile menu preserves body state and inerts siblings added while open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.evaluate(() => {
    document.body.style.overflow = 'clip';
    document.querySelector('main')!.inert = true;
  });

  await page.locator('.mobile-toggle').click();
  await page.evaluate(() => {
    const sibling = document.createElement('button');
    sibling.id = 'late-body-sibling';
    sibling.textContent = 'Late action';
    document.body.appendChild(sibling);
  });

  await expect(page.locator('#late-body-sibling')).toHaveJSProperty(
    'inert',
    true,
  );

  await page.keyboard.press('Escape');
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  await expect(page.locator('#late-body-sibling')).toHaveJSProperty(
    'inert',
    false,
  );
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('clip');
});

test('header becomes opaque only after scrolling', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('.site-header');
  await expect(header).not.toHaveClass(/is-scrolled/);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect(header).toHaveClass(/is-scrolled/);
});

test('feedback SDK is absent until the visitor activates feedback', async ({
  page,
}) => {
  const sdkRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/widget/sdk.js')) {
      sdkRequests.push(request.url());
    }
  });
  await page.route('**/api/widget/sdk.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.Quackback = function (command) {
          window.__feedbackCommands = window.__feedbackCommands || [];
          window.__feedbackCommands.push(command);
        };
      `,
    });
  });

  await page.goto('/');
  await page.waitForTimeout(2_300);
  expect(sdkRequests).toEqual([]);

  await page.locator('[data-feedback-launcher]').click();
  await expect.poll(() => sdkRequests.length).toBe(1);
  await expect(page.locator('[data-feedback-status]')).toHaveText(
    'Feedback opened.',
  );
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __feedbackCommands?: string[];
            }
          ).__feedbackCommands,
      ),
    )
    .toEqual(['init', 'open']);
});

test('feedback SDK failure preserves a working Discord fallback', async ({
  page,
}) => {
  await page.route('**/api/widget/sdk.js', async (route) => {
    await route.abort('failed');
  });
  await page.route('https://discord.gg/opencoven', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Discord fallback</title>',
    });
  });

  await page.goto('/');
  const launcher = page.locator('[data-feedback-launcher]');
  await expect(launcher).toHaveAttribute(
    'href',
    'https://discord.gg/opencoven',
  );
  await launcher.click();
  await expect(launcher).toHaveAttribute('data-feedback-state', 'failed');
  await expect(launcher).toContainText(
    'Feedback unavailable · open Discord',
  );
  await expect(page.locator('[data-feedback-status]')).toHaveText(
    'Feedback widget unavailable. Use the Discord fallback link.',
  );

  await launcher.click();
  await expect(page).toHaveURL('https://discord.gg/opencoven');
  await expect(page).toHaveTitle('Discord fallback');
});

test('stalled feedback SDK load fails once and exposes the Discord fallback', async ({
  page,
}) => {
  let releaseSdk: (() => void) | undefined;
  const sdkRelease = new Promise<void>((resolve) => {
    releaseSdk = resolve;
  });
  let sdkRequests = 0;
  await page.route('**/api/widget/sdk.js', async (route) => {
    sdkRequests += 1;
    await sdkRelease;
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'window.Quackback = function () {};',
    });
  });
  await page.route('https://discord.gg/opencoven', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Discord fallback</title>',
    });
  });

  try {
    await page.goto('/');
    expect(sdkRequests).toBe(0);

    const launcher = page.locator('[data-feedback-launcher]');
    await launcher.click();
    await expect.poll(() => sdkRequests).toBe(1);
    await expect(launcher).toHaveAttribute(
      'data-feedback-state',
      'failed',
      { timeout: 7_000 },
    );
    await expect(launcher).not.toHaveAttribute('aria-busy', 'true');

    releaseSdk();
    await page.waitForTimeout(200);
    await expect(launcher).toHaveAttribute('data-feedback-state', 'failed');
    expect(sdkRequests).toBe(1);

    await launcher.click();
    await expect(page).toHaveURL('https://discord.gg/opencoven');
    await expect(page).toHaveTitle('Discord fallback');
  } finally {
    releaseSdk?.();
  }
});

test('later feedback open exceptions fail once and expose the Discord fallback', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/widget/sdk.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.__feedbackOpenCalls = 0;
        window.Quackback = function (command) {
          if (command !== 'open') return;
          window.__feedbackOpenCalls += 1;
          if (window.__feedbackOpenCalls > 1) {
            throw new Error('later open failed');
          }
        };
      `,
    });
  });
  await page.route('https://discord.gg/opencoven', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Discord fallback</title>',
    });
  });

  await page.goto('/');
  const launcher = page.locator('[data-feedback-launcher]');
  await launcher.click();
  await expect(page.locator('[data-feedback-status]')).toHaveText(
    'Feedback opened.',
  );

  await launcher.click();
  await expect(launcher).toHaveAttribute('data-feedback-state', 'failed');
  expect(pageErrors).toEqual([]);

  await launcher.click();
  await expect(page).toHaveURL('https://discord.gg/opencoven');
  await expect(page).toHaveTitle('Discord fallback');
});

test('failed feedback fallback avoids mobile conversion controls', async ({
  page,
}) => {
  await page.route('**/api/widget/sdk.js', async (route) => {
    await route.abort('failed');
  });
  await page.route('https://discord.gg/opencoven', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Discord fallback</title>',
    });
  });

  const protectedSelector = [
    '[data-copy]',
    '[data-primary-cta]',
    '[data-product-constellation] a',
    '.quickstart-actions a',
    '.closing-links a',
    'footer a',
  ].join(',');

  const assertNoVisibleOverlap = async () => {
    const result = await page.evaluate((selector) => {
      const launcher = document.querySelector<HTMLElement>(
        '[data-feedback-launcher]',
      )!;
      const launcherRect = launcher.getBoundingClientRect();
      const collisions = Array.from(
        document.querySelectorAll<HTMLElement>(selector),
      )
        .filter((target) => {
          const style = window.getComputedStyle(target);
          const rect = target.getBoundingClientRect();
          const visible =
            style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0
            && rect.bottom > 0
            && rect.top < window.innerHeight
            && rect.right > 0
            && rect.left < window.innerWidth;
          if (!visible) return false;

          return !(
            rect.right <= launcherRect.left
            || rect.left >= launcherRect.right
            || rect.bottom <= launcherRect.top
            || rect.top >= launcherRect.bottom
          );
        })
        .map(
          (target) =>
            target.getAttribute('aria-label')
            || target.textContent?.trim()
            || target.tagName,
        );

      return {
        collisions,
        launcher: {
          width: launcherRect.width,
          height: launcherRect.height,
        },
      };
    }, protectedSelector);

    expect(result.collisions).toEqual([]);
    expect(result.launcher.width).toBeGreaterThanOrEqual(44);
    expect(result.launcher.height).toBeGreaterThanOrEqual(44);
  };

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');

    const launcher = page.locator('[data-feedback-launcher]');
    await launcher.click();
    await expect(launcher).toHaveAttribute('data-feedback-state', 'failed');
    await expect(launcher).toBeVisible();
    await expect(launcher).toHaveAccessibleName(
      'Feedback unavailable · open Discord',
    );
    await expect(launcher).toHaveAttribute(
      'href',
      'https://discord.gg/opencoven',
    );

    await page.evaluate(() => {
      window.location.hash = 'quickstart';
    });
    await page.locator('#quickstart').scrollIntoViewIfNeeded();
    await assertNoVisibleOverlap();

    for (const copyControl of await page.locator('#quickstart [data-copy]').all()) {
      await copyControl.scrollIntoViewIfNeeded();
      await assertNoVisibleOverlap();
    }

    for (const productCard of await page
      .locator('[data-product-constellation] .product-card')
      .all()) {
      await productCard.scrollIntoViewIfNeeded();
      await assertNoVisibleOverlap();
    }

    for (const section of [
      page.locator('.quickstart-actions'),
      page.locator('.closing-invitation'),
      page.locator('footer'),
    ]) {
      await section.scrollIntoViewIfNeeded();
      await assertNoVisibleOverlap();
    }

    await launcher.scrollIntoViewIfNeeded();
    await assertNoVisibleOverlap();
    await launcher.click();
    await expect(page).toHaveURL('https://discord.gg/opencoven');
    await expect(page).toHaveTitle('Discord fallback');
  }
});

test('clipboard failure selects the command and gives a concrete fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('denied')),
      },
    });
  });
  await page.goto('/');

  const preview = page.locator('#quickstart');
  const button = preview.locator('[data-copy]').first();
  const command = await preview.locator('code').first().textContent();
  await button.click();

  await expect(button).toHaveAttribute(
    'aria-label',
    'Copy unavailable. Select the command and copy manually.',
  );
  await expect(preview.locator('[data-copy-live]')).toContainText(
    'Copy unavailable',
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    command,
  );
});

test('clipboard ignores an older success after a newer failure', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const attempts: Array<{
      resolve: () => void;
      reject: () => void;
    }> = [];
    Object.defineProperty(window, '__clipboardAttempts', {
      value: attempts,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          new Promise<void>((resolve, reject) => {
            attempts.push({
              resolve,
              reject: () => reject(new Error('denied')),
            });
          }),
      },
    });
  });
  await page.goto('/');

  const button = page.locator('#quickstart [data-copy]').first();
  await button.click();
  await button.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __clipboardAttempts: unknown[];
            }
          ).__clipboardAttempts.length,
      ),
    )
    .toBe(2);

  await page.evaluate(() => {
    (
      window as Window & {
        __clipboardAttempts: Array<{ reject: () => void }>;
      }
    ).__clipboardAttempts[1].reject();
  });
  await expect(button).toHaveAttribute(
    'aria-label',
    'Copy unavailable. Select the command and copy manually.',
  );

  await page.evaluate(() => {
    (
      window as Window & {
        __clipboardAttempts: Array<{ resolve: () => void }>;
      }
    ).__clipboardAttempts[0].resolve();
  });
  await expect(button).toHaveAttribute(
    'aria-label',
    'Copy unavailable. Select the command and copy manually.',
  );
});

test('a new clipboard attempt cancels the earlier reset timer', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const attempts: Array<{ resolve: () => void }> = [];
    Object.defineProperty(window, '__clipboardAttempts', {
      value: attempts,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          new Promise<void>((resolve) => {
            attempts.push({ resolve });
          }),
      },
    });
  });
  await page.goto('/');

  const button = page.locator('#quickstart [data-copy]').first();
  await button.click();
  await page.evaluate(() => {
    (
      window as Window & {
        __clipboardAttempts: Array<{ resolve: () => void }>;
      }
    ).__clipboardAttempts[0].resolve();
  });
  await expect(button).toHaveAttribute('aria-label', 'Copied');

  await page.waitForTimeout(1_000);
  await button.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __clipboardAttempts: unknown[];
            }
          ).__clipboardAttempts.length,
      ),
    )
    .toBe(2);
  await page.waitForTimeout(500);

  await expect(button).toHaveAttribute('aria-label', 'Copied');
});

test('core homepage remains complete without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.getByRole('heading', {
    name: 'Summon agents that remember.',
  })).toBeVisible();
  await expect(page.locator('[data-story-stage]')).toHaveCount(4);
  await expect(page.locator('[data-product-constellation] a')).toHaveCount(5);
  await expect(page.locator('.runtime-disclosure')).toHaveCount(3);
  await expect(page.locator('#quickstart code')).toHaveCount(3);
  await expect(page.locator('.mobile-nav-fallback')).toBeVisible();
  await expect(page.locator('.hero [data-primary-cta][href="/quickstart"]')).toBeVisible();

  await context.close();
});

test('reduced motion shows content immediately with no hero animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.locator('html')).not.toHaveClass(/motion-on/);
  await expect(page.locator('.hero-copy')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('[data-story-stage]')).toHaveCount(4);
});

test('light theme keeps immutable dark ledger contrast', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/');

  const ledger = page.locator('.familiar-ledger').first();
  await expect(ledger).toHaveCSS('background-color', 'rgb(11, 9, 16)');
  await expect(ledger).toHaveCSS('color', 'rgb(232, 224, 240)');
  await expect(ledger.locator('.ledger-notes li').first()).toHaveCSS(
    'font-size',
    '12px',
  );
});

for (const colorScheme of ['dark', 'light'] as const) {
  test(`${colorScheme} homepage has no serious axe violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('theme', 'system'));
    await page.goto('/');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (violation) =>
        violation.impact === 'serious'
        || violation.impact === 'critical',
    );
    expect(blocking).toEqual([]);
  });
}

const visualMatrix = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'small-desktop', width: 1024, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small-mobile', width: 320, height: 568 },
  { name: 'short-landscape', width: 844, height: 390 },
];

for (const viewport of visualMatrix) {
  for (const theme of ['dark', 'light'] as const) {
    test(`${viewport.name} ${theme} has no horizontal overflow`, async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem('theme', selectedTheme);
      }, theme);
      await page.goto('/');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      if (viewport.width <= 400) {
        const terminalFontSizes = await page.locator(
          '.familiar-ledger, .familiar-ledger *, .preview-command code',
        ).evaluateAll((elements) =>
          elements
            .filter((element) => element.textContent?.trim())
            .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
        );
        expect(Math.min(...terminalFontSizes)).toBeGreaterThanOrEqual(13);
      }

      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}-${theme}.png`),
        fullPage: true,
      });
      await context.close();
    });
  }
}
