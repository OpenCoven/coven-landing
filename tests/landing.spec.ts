import { expect, test } from '@playwright/test';
import { quickstartProducts } from '../src/data/quickstart';

const productContracts = [
  { id: 'coven-cli', name: 'Coven CLI' },
  { id: 'coven-code', name: 'Coven Code' },
  { id: 'coven-cave', name: 'Coven Cave' },
  { id: 'castcodes', name: 'CastCodes' },
  { id: 'github', name: 'OpenCoven for GitHub' },
] as const;

for (const pathname of ['/', '/quickstart', '/github']) {
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
