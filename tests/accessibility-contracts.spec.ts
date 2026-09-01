import { expect, test, type Page } from '@playwright/test';

const PUBLIC_ROUTES = [
  '/',
  '/download/',
  '/quickstart/',
  '/github/',
  '/how-it-works/',
  '/protocol/',
  '/security/',
  '/status/',
  '/privacy/',
  '/terms/',
] as const;

function durationMilliseconds(value: string) {
  return Math.max(
    ...value.split(',').map((part) => {
      const trimmed = part.trim();
      const amount = Number.parseFloat(trimmed);
      if (!Number.isFinite(amount)) return Number.POSITIVE_INFINITY;
      return trimmed.endsWith('ms') ? amount : amount * 1000;
    }),
  );
}

async function visibleControlMetrics(page: Page) {
  return page
    .locator('button:visible, summary:visible, select:visible, a.action:visible')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.getAttribute('aria-label')
            ?? element.textContent?.replace(/\s+/g, ' ').trim()
            ?? element.tagName,
          tag: element.tagName.toLowerCase(),
          width: rect.width,
          height: rect.height,
          primary:
            element.matches('.action--primary, summary, select, button'),
        };
      }),
    );
}

test('skip link is the first focus stop and transfers focus to main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const box = await skip.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(720);

  await page.keyboard.press('Enter');
  await expect(page.locator('main#content')).toBeFocused();
});

for (const route of PUBLIC_ROUTES) {
  test(`${route} keeps controls at usable target sizes on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);

    const controls = await visibleControlMetrics(page);
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(
        control.width,
        `${route} ${control.tag} “${control.label}” is narrower than 24 CSS px`,
      ).toBeGreaterThanOrEqual(24);
      expect(
        control.height,
        `${route} ${control.tag} “${control.label}” is shorter than 24 CSS px`,
      ).toBeGreaterThanOrEqual(24);
      if (control.primary) {
        expect(
          control.height,
          `${route} primary control “${control.label}” is shorter than 44 CSS px`,
        ).toBeGreaterThanOrEqual(44);
      }
    }
  });
}

test('mobile disclosure focus stays visible and Escape restores the trigger', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/protocol/');

  const disclosure = page.locator('[data-mobile-navigation]');
  const trigger = disclosure.locator('summary');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');

  const firstLink = disclosure.getByRole('link', { name: 'How it works' });
  await firstLink.focus();
  await expect(firstLink).toBeFocused();
  const headerBox = await page.locator('.site-header').boundingBox();
  const linkBox = await firstLink.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(linkBox).not.toBeNull();
  expect(linkBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  expect(linkBox!.y + linkBox!.height).toBeLessThanOrEqual(844);

  await page.keyboard.press('Escape');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
});

test('forced-colors mode preserves borders, text, and visible focus', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/status/');

  expect(
    await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
  ).toBe(true);

  const surfaces = page.locator(
    '.action, .status, .product-card, .evidence-card, summary, select',
  );
  const contracts = await surfaces.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        forcedColorAdjust: style.forcedColorAdjust,
        color: style.color,
      };
    }),
  );

  expect(contracts.length).toBeGreaterThan(0);
  for (const contract of contracts) {
    expect(contract.forcedColorAdjust).not.toBe('none');
    expect(contract.color).not.toBe('rgba(0, 0, 0, 0)');
  }

  const action = page.locator('a.action').first();
  await action.focus();
  const outline = await action.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline.style).not.toBe('none');
  expect(Number.parseFloat(outline.width)).toBeGreaterThan(0);
});

test('reduced-motion preference completes feedback without sustained motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/quickstart/');

  expect(
    await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
  ).toBe(true);
  const motion = await page.locator('.action').first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transitionDuration: style.transitionDuration,
      animationDuration: style.animationDuration,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
  expect(durationMilliseconds(motion.transitionDuration)).toBeLessThanOrEqual(0.02);
  expect(durationMilliseconds(motion.animationDuration)).toBeLessThanOrEqual(0.02);
  expect(motion.scrollBehavior).toBe('auto');
});

for (const route of PUBLIC_ROUTES) {
  test(`${route} remains readable at 200 percent text size`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await page.addStyleTag({
      content: 'html { font-size: 200% !important; }',
    });

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.scrollWidth,
      `${route} overflows after 200% text scaling`,
    ).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}
