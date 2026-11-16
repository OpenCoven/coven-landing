import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const route of ['privacy', 'support']) {
  test(`Coven Remote ${route} is public, readable and accessible`, async ({ page }, testInfo) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport);
      const response = await page.goto(`/remote/${route}`);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(new RegExp(`Coven Remote .*${route === 'privacy' ? 'Privacy' : 'Support'}`));
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main a[href="mailto:hello@opencoven.ai"]').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const theme = page.locator('html');
      const initial = await theme.getAttribute('data-theme');
      await page.locator('[data-action="toggleTheme"]').click();
      await expect(theme).not.toHaveAttribute('data-theme', initial!);
      await page.locator('[data-action="toggleTheme"]').click();
      if (viewport.width < 720) {
        const menu = page.locator('[data-nav-menu]');
        const summary = menu.locator('summary');
        await summary.click();
        await expect(menu).toHaveAttribute('open', '');
        await page.keyboard.press('Escape');
        await expect(menu).not.toHaveAttribute('open', '');
        await expect(summary).toBeFocused();
        await summary.click();
        await page.mouse.click(8, 400);
        await expect(menu).not.toHaveAttribute('open', '');
      }
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${route}-${viewport.width}.png`), fullPage: true });
    }
  });
}
