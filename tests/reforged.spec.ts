import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const sectionIds = [
  'top',
  'runtimes',
  'boundary',
  'surfaces',
  'invocation',
  'summon',
] as const;

test.describe('Reforged landing', () => {
  test('renders the approved narrative and primary actions', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Summon once. Remember forever.',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Download for macOS/ }),
    ).toHaveAttribute(
      'href',
      'https://github.com/opencoven/coven-cave/releases/latest',
    );
    await expect(
      page.getByRole('link', { name: /Download for iOS/ }),
    ).toHaveAttribute('href', 'https://testflight.apple.com/join/61Dqw8y4');

    for (const id of sectionIds) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    const sectionOrder = await page.evaluate((ids) => {
      return ids.map((id) => document.getElementById(id)?.offsetTop ?? -1);
    }, sectionIds);
    expect(sectionOrder).toEqual([...sectionOrder].sort((a, b) => a - b));
  });

  test('omits the deprecated Threshold section and its video theater', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.locator('#threshold')).toHaveCount(0);
    await expect(page.locator('.hero-cue')).toHaveCount(0);
    await expect(page.locator('[data-threshold-theater]')).toHaveCount(0);
    await expect(page.locator('[data-threshold-theater-trigger]')).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('link', { name: 'Watch the Coven Cave explainer' }),
    ).toHaveAttribute('href', '/reforged/coven-cave-explainer.mp4');
  });

  test('runtime rail exposes seven assets and exact commands', async ({ page }) => {
    await page.goto('/');

    const chips = page.locator('[data-runtime-chip]');
    await expect(chips).toHaveCount(7);
    await expect(chips).toHaveText([
      'OpenAI Codex',
      'Claude Code',
      'GitHub Copilot',
      'OpenCode',
      'Grok Build',
      'Hermes Agent',
      'OpenClaw',
    ]);

    const claude = chips.filter({ hasText: 'Claude Code' }).first();
    await claude.click();
    await expect(claude).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-runtime-command]')).toContainText(
      'coven run claude "explain this repo"',
    );

    const runtimeImages = page.locator('#runtimes img');
    await expect(runtimeImages).toHaveCount(14);
    for (const image of await runtimeImages.all()) {
      await expect(image).toHaveAttribute('loading', 'lazy');
      await expect(image).toHaveAttribute('decoding', 'async');
    }
    const uniqueSources = await runtimeImages.evaluateAll((images) => [
      ...new Set(images.map((image) => image.getAttribute('src'))),
    ]);
    expect(uniqueSources).toEqual([
      '/reforged/codex-3d.png',
      '/reforged/claude-code-mascot.png',
      '/reforged/github-copilot.png',
      '/reforged/opencode-3d.png',
      '/reforged/grok-3d.png',
      '/reforged/hermes-agent.png',
      '/reforged/openclaw-mascot.png',
    ]);
  });

  test('runtime marquee pauses for focus and selection', async ({ page }) => {
    await page.goto('/#runtimes');

    const track = page.locator('[data-runtime-track]').first();
    const firstChip = page.locator('[data-runtime-chip]').first();
    await expect(track).toHaveCSS('animation-name', 'runtime-marquee', {
      timeout: 4_000,
    });

    await firstChip.focus();
    await expect(track).toHaveCSS('animation-play-state', 'paused');

    await firstChip.click();
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await expect(firstChip).toHaveAttribute('aria-pressed', 'true');
    await expect(track).toHaveCSS('animation-play-state', 'paused');
  });

  test('mobile runtime focus keeps the command panel in view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#runtimes');

    const lastChip = page.locator('[data-runtime-chip]').last();
    await lastChip.focus();
    await lastChip.click();

    const geometry = await page.evaluate(() => {
      const section = document.querySelector('#runtimes');
      const panel = document.querySelector('[data-runtime-command-panel]');
      const rect = panel?.getBoundingClientRect();
      return {
        sectionScrollLeft: section?.scrollLeft ?? -1,
        panelLeft: rect?.left ?? -1,
        panelRight: rect?.right ?? -1,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.sectionScrollLeft).toBe(0);
    expect(geometry.panelLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.panelRight).toBeLessThanOrEqual(geometry.viewportWidth);
  });

  test('boundary tabs use immediate roving keyboard selection', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const tabs = page.locator('[data-boundary-tab]');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.locator('[data-boundary-panel]:not([hidden])'),
    ).toHaveAttribute('data-boundary-panel', 'runtime');

    await tabs.nth(1).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(2)).toBeFocused();
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.locator('[data-boundary-panel]:not([hidden])'),
    ).toHaveAttribute('data-boundary-panel', 'boundary');

    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toBeFocused();
    await expect(
      page.locator('[data-boundary-panel]:not([hidden])'),
    ).toHaveAttribute('data-boundary-panel', 'surface');
  });

  test('surface spotlight can be selected without scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const cards = page.locator('[data-surface-card]');
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toHaveAttribute('data-expanded', 'true');

    await cards.nth(1).locator('[data-surface-trigger]').click();
    await expect(cards.nth(1)).toHaveAttribute('data-expanded', 'true');
    await expect(cards.nth(0)).toHaveAttribute('data-expanded', 'false');
    await expect(cards.nth(1).locator('[data-surface-demo]')).toContainText(
      'coven doctor',
    );
    const guide = cards.nth(1).locator('.surface-card__guide');
    await expect(guide).toBeVisible();
    await guide.focus();
    await expect(guide).toBeFocused();

    const codeTrigger = cards.nth(2).locator('[data-surface-trigger]');
    await codeTrigger.focus();
    await expect(cards.nth(2)).toHaveAttribute('data-expanded', 'true');
  });

  test('invocation selection updates the terminal with canonical output', async ({
    page,
  }) => {
    await page.goto('/');

    const steps = page.locator('[data-invocation-step]');
    await expect(steps).toHaveCount(3);
    await steps.nth(2).click();

    await expect(steps.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-terminal-command]')).toHaveText(
      'coven run codex "explain this repo in 5 bullets"',
    );
    await expect(page.locator('[data-terminal-output]')).toContainText(
      'memory project record updated',
    );
  });

  test('active terminal copy resets to the selected command label', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });
    });
    await page.goto('/');

    await page.locator('[data-invocation-step]').nth(2).click();
    const copy = page
      .locator('[data-terminal-command]')
      .locator('xpath=ancestor::*[@data-copy-surface][1]')
      .locator('[data-copy-command]');
    await copy.click();
    await expect(copy).toHaveAttribute('aria-label', 'Copied');
    await expect(page.locator('[data-copy-live]')).toHaveText(
      'Copied: coven run codex "explain this repo in 5 bullets"',
    );
    await expect(copy).toHaveAttribute(
      'aria-label',
      'Copy 03 · Run command',
      { timeout: 2_000 },
    );
  });

  test('newest clipboard request owns shared feedback', async ({ page }) => {
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

    const first = page
      .locator('[data-copy-command="npm install -g @opencoven/cli"]')
      .first();
    const second = page
      .locator('[data-copy-command="coven doctor"]')
      .first();
    await first.click();
    await second.click();
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
    await expect(second).toHaveAttribute(
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
    await expect(first).toHaveAttribute(
      'aria-label',
      'Copy install command',
    );
    await expect(second).toHaveAttribute(
      'aria-label',
      'Copy unavailable. Select the command and copy manually.',
    );
    await expect(page.locator('[data-copy-live]')).toHaveText(
      'Copy unavailable. Command selected. Press Ctrl+C or Command+C to copy manually.',
    );
  });

  test('changing the active command invalidates an older copy attempt', async ({
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
            new Promise<void>((resolve) => attempts.push({ resolve })),
        },
      });
    });
    await page.goto('/');

    const copy = page
      .locator('[data-terminal-command]')
      .locator('xpath=ancestor::*[@data-copy-surface][1]')
      .locator('[data-copy-command]');
    await copy.click();
    await page.locator('[data-invocation-step]').nth(2).click();
    await expect(copy).toHaveAttribute(
      'aria-label',
      'Copy 03 · Run command',
    );

    await page.evaluate(() => {
      (
        window as Window & {
          __clipboardAttempts: Array<{ resolve: () => void }>;
        }
      ).__clipboardAttempts[0].resolve();
    });
    await page.waitForTimeout(200);
    await expect(copy).toHaveAttribute(
      'aria-label',
      'Copy 03 · Run command',
    );
  });

  test('same invocation phase does not cancel clipboard feedback', async ({
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
            new Promise<void>((resolve) => attempts.push({ resolve })),
        },
      });
    });
    await page.goto('/#invocation');

    const copy = page
      .locator('[data-terminal-command]')
      .locator('xpath=ancestor::*[@data-copy-surface][1]')
      .locator('[data-copy-command]');
    await copy.click();
    await page.evaluate(
      () => window.dispatchEvent(new Event('scroll')),
    );
    await page.waitForTimeout(50);
    await page.evaluate(() => {
      (
        window as Window & {
          __clipboardAttempts: Array<{ resolve: () => void }>;
        }
      ).__clipboardAttempts[0].resolve();
    });

    await expect(copy).toHaveAttribute('aria-label', 'Copied');
    await expect(page.locator('[data-copy-live]')).toHaveText(
      'Copied: npm install -g @opencoven/cli',
    );
  });

  test('clipboard failure selects the command and gives manual guidance', async ({
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
    await page.goto('/');

    const button = page
      .locator(
        '[data-copy-command="npm install -g @opencoven/cli"]',
      )
      .first();
    const surface = button.locator('xpath=ancestor::*[@data-copy-surface][1]');
    await button.click();

    await expect(surface.locator('[data-copy-guidance]')).toHaveText(
      'Copy unavailable. Command selected. Press Ctrl+C or Command+C to copy manually.',
    );
    await expect(button).toHaveAttribute(
      'aria-label',
      'Copy unavailable. Select the command and copy manually.',
    );
    expect(
      await page.evaluate(() => window.getSelection()?.toString()),
    ).toBe('npm install -g @opencoven/cli');

    const doctor = page.locator('[data-copy-command="coven doctor"]').first();
    await doctor.click();
    expect(
      await page.evaluate(() => window.getSelection()?.toString()),
    ).toBe('coven doctor');
  });

  test('core story remains complete without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 1000 },
    });
    try {
      const page = await context.newPage();
      await page.goto('/');

      for (const heading of [
        'Summon once. Remember forever.',
        'Three layers. Only one is yours to defend.',
        'One substrate. Three ways in.',
        'Three commands to first summon.',
        'Your familiar. Your tools. Your machine.',
      ]) {
        await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      }

      await expect(page.locator('[data-boundary-panel]')).toHaveCount(3);
      for (const panel of await page.locator('[data-boundary-panel]').all()) {
        await expect(panel).toBeVisible();
      }
      await expect(page.locator('[data-surface-card]')).toHaveCount(3);
      for (const guide of await page.locator('.surface-card__guide').all()) {
        await expect(guide).toHaveCSS('opacity', '1');
        await expect(guide).toHaveCSS('pointer-events', 'auto');
      }
      await expect(page.locator('[data-invocation-step]')).toHaveCount(3);

      const runtimeCommands = [
        'coven run codex "explain this repo"',
        'coven run claude "explain this repo"',
        'coven run copilot "explain this repo"',
        'coven run opencode "explain this repo"',
        'coven run grok "explain this repo"',
        'coven run hermes "explain this repo"',
        'coven run openclaw "explain this repo"',
      ];
      const runtimeFallback = page.locator(
        '[data-runtime-fallback-command]',
      );
      await expect(runtimeFallback).toHaveCount(runtimeCommands.length);
      await expect(runtimeFallback).toHaveText(runtimeCommands);
      for (const command of await runtimeFallback.all()) {
        await expect(command).toBeVisible();
      }

      const invocationFallback = page.locator(
        '[data-invocation-output-fallback]',
      );
      await expect(invocationFallback).toHaveCount(3);
      for (const output of await invocationFallback.all()) {
        await expect(output).toBeVisible();
      }
      await expect(invocationFallback.nth(0)).toContainText(
        'Expect: the help screen lists every top-level command.',
      );
      await expect(invocationFallback.nth(1)).toContainText(
        'Expect: actionable guidance for any missing setup.',
      );
      await expect(invocationFallback.nth(2)).toContainText(
        'Expect: the history row shows id, harness, title, status.',
      );
    } finally {
      await context.close();
    }
  });

  test('tablet pinned chapters still advance with scroll position', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/#boundary');

    await expect(page.locator('[data-boundary]')).toHaveAttribute(
      'data-active-layer',
      'surface',
    );
  });

  test('short landscape keeps the hero compact and uses its available width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const geometry = await page.locator('.reforged-hero').evaluate((hero) => {
      const card = hero.querySelector('.hero-card')?.getBoundingClientRect();
      const portal = hero
        .querySelector('.hero-portal')
        ?.getBoundingClientRect();
      const rect = hero.getBoundingClientRect();

      return {
        height: rect.height,
        cardRight: card?.right ?? -1,
        cardTop: card?.top ?? -1,
        portalLeft: portal?.left ?? -1,
        portalTop: portal?.top ?? -1,
      };
    });

    expect(geometry.portalLeft).toBeGreaterThan(geometry.cardRight);
    expect(Math.abs(geometry.portalTop - geometry.cardTop)).toBeLessThanOrEqual(
      80,
    );
    expect(geometry.height).toBeLessThanOrEqual(390);
  });

  test('pinned chapters select the same phase while scrolling forward and back', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const scrollChapter = async (id: string, progress: number) => {
      await page.evaluate(
        ({ targetId, nextProgress }) => {
          const chapter = document.getElementById(targetId);
          if (!chapter) throw new Error(`Missing chapter: ${targetId}`);
          const previous = document.documentElement.style.scrollBehavior;
          document.documentElement.style.scrollBehavior = 'auto';
          window.scrollTo(
            0,
            chapter.offsetTop +
              (chapter.offsetHeight - window.innerHeight) * nextProgress,
          );
          document.documentElement.style.scrollBehavior = previous;
        },
        { targetId: id, nextProgress: progress },
      );
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    };

    const chapters = [
      {
        id: 'boundary',
        read: () =>
          page.locator('[data-boundary]').getAttribute('data-active-layer'),
        phases: ['surface', 'runtime', 'boundary', 'runtime', 'surface'],
      },
      {
        id: 'surfaces',
        read: () =>
          page
            .locator('[data-surface-card][data-expanded="true"]')
            .getAttribute('data-surface-card'),
        phases: ['cave', 'cli', 'code', 'cli', 'cave'],
      },
      {
        id: 'invocation',
        read: () =>
          page
            .locator('[data-invocation-step][aria-pressed="true"]')
            .getAttribute('data-invocation-step'),
        phases: ['install', 'check', 'run', 'check', 'install'],
      },
    ];

    for (const chapter of chapters) {
      for (const [index, progress] of [0.1, 0.45, 0.85, 0.45, 0.1].entries()) {
        await scrollChapter(chapter.id, progress);
        await expect.poll(chapter.read).toBe(chapter.phases[index]);
      }
    }
  });

  test('resizing keeps the hero presentation stable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await expect(page.locator('.hero-card')).toHaveCSS('opacity', '1');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.hero-card')).toHaveCSS('opacity', '1');
  });

  test('core enhancement survives without matchMedia', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: undefined,
      });
    });
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Summon once. Remember forever.',
      }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/reforged-ready/);
    expect(errors).toEqual([]);
  });

  test('reduced motion disables the runtime marquee', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('[data-runtime-track]').first()).toHaveCSS(
      'animation-name',
      'none',
    );
  });

  test('dark page has no serious axe violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
  });

  test('mobile controls preserve 44px touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const undersized = await page.locator('a[href], button').evaluateAll(
      (controls) =>
        controls.flatMap((control) => {
          const style = getComputedStyle(control);
          const rect = control.getBoundingClientRect();
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            rect.width === 0 ||
            rect.height === 0
          ) {
            return [];
          }
          if (rect.width >= 44 && rect.height >= 44) return [];
          return [
            {
              label:
                control.getAttribute('aria-label') ??
                control.textContent?.trim().replace(/\s+/g, ' ') ??
                control.tagName,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          ];
        }),
    );

    expect(undersized).toEqual([]);
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 1024, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(
        dimensions.clientWidth + 1,
      );
    });
  }
});
