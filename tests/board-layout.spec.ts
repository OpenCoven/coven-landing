import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('taller board and expanded inspector contents do not need inner scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const board = page.locator('[data-board]');
  const box = await board.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(590);
  expect(box!.height).toBeLessThanOrEqual(630);
  const row = page.locator('[data-panel="sessions"] [data-row][data-proj="opencoven"]').first();
  await expect(row).toHaveAttribute('data-fam', 'Hexi');
  await row.locator('[data-cell-btn="profile"]').click();
  const profile = page.locator('[data-win="profile"]');
  await expect(profile).toBeVisible();
  const scrolling = () => profile.evaluate(el => [el, ...el.querySelectorAll('*')].filter(node => {
    const element = node as HTMLElement;
    const style = getComputedStyle(element);
    return element.clientHeight > 0 && element.getClientRects().length && /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
  }).length);
  await expect.poll(scrolling).toBe(0);
  const project = profile.locator('[data-proj-toggle]').first();
  await project.click();
  await expect(project).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(scrolling).toBe(0);
  expect(await profile.locator('[data-wp-projects]').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
});

for (const width of [320, 1440]) {
  test(`detail views reflow without nested scroll areas at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const kind of ['profile', 'surface', 'state', 'diff']) {
      const cell = page.locator('[data-panel="sessions"] [data-row][data-proj="opencoven"]').first().locator(`[data-cell-btn="${kind}"]`);
      await cell.click();
      const win = page.locator(`[data-win="${kind}"]`);
      await expect(win).toBeVisible();
      const assertNoScroll = async () => {
        const scrolling = await win.evaluate(el => [el, ...el.querySelectorAll('*')].filter(node => {
          const element = node as HTMLElement;
          const style = getComputedStyle(element);
          return element.clientHeight > 0 && element.getClientRects().length && /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
        }).length);
        expect(scrolling).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      };
      await assertNoScroll();
      for (const tab of await win.locator('[data-wp-tab]:visible').all()) {
        await tab.click();
        await assertNoScroll();
      }
      await win.locator('[data-win-close]').click();
    }
  });
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`project rail keeps its space after returning and resizing with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('/');
    const cell = page.locator('[data-panel="sessions"] [data-row][data-proj="opencoven"]').first().locator('[data-cell-btn="profile"]');
    await cell.click();
    const profile = page.locator('[data-win="profile"]');
    await expect(profile).toBeVisible();
    await profile.locator('[data-win-close]').click();
    for (const width of [800, 320, 800]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.locator('[data-view="board"]').evaluate(board => {
        const rail = board.querySelector('[data-r="rail"]')!.getBoundingClientRect();
        const sessions = board.querySelector('[data-panel="sessions"]')!.getBoundingClientRect();
        const projects = [...board.querySelectorAll('[data-board-proj]')].map(el => el.getBoundingClientRect());
        return projects.every(box => box.bottom <= rail.bottom + 1) && rail.bottom <= sessions.top + 1;
      })).toBe(true);
    }
  });
}
