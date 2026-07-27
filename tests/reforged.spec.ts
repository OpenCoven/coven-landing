import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

type MediaWindow = Window & {
  __mediaEvents: string[];
  __rejectTheaterPlay: boolean;
};

async function instrumentThresholdMedia(
  page: Page,
  rejectTheaterPlay = false,
) {
  await page.addInitScript(({ reject }) => {
    const mediaWindow = window as MediaWindow;
    mediaWindow.__mediaEvents = [];
    mediaWindow.__rejectTheaterPlay = reject;

    HTMLMediaElement.prototype.play = function () {
      const role = this.hasAttribute('data-threshold-theater-video')
        ? 'theater'
        : 'ambient';
      mediaWindow.__mediaEvents.push(
        `${role}:play:${this.muted ? 'muted' : 'audible'}:${Math.round(this.currentTime)}`,
      );
      if (role === 'theater' && mediaWindow.__rejectTheaterPlay) {
        return Promise.reject(
          new DOMException('Playback blocked', 'NotAllowedError'),
        );
      }
      return Promise.resolve();
    };

    HTMLMediaElement.prototype.pause = function () {
      const role = this.hasAttribute('data-threshold-theater-video')
        ? 'theater'
        : 'ambient';
      mediaWindow.__mediaEvents.push(`${role}:pause`);
    };
  }, { reject: rejectTheaterPlay });
}

async function activateThresholdTheater(page: Page) {
  const trigger = page.getByRole('link', {
    name: 'Play Coven Cave explainer with audio',
  });
  const theater = page.locator('[data-threshold-theater]');
  const theaterVideo = page.locator('[data-threshold-theater-video]');

  await page.evaluate(() => {
    const threshold = document.querySelector('[data-threshold]');
    if (!threshold) return;
    window.scrollTo(
      0,
      threshold.offsetTop + threshold.offsetHeight - window.innerHeight,
    );
  });
  await expect(page.locator('.threshold__invitation')).toHaveCSS('opacity', '1');
  await expect(page.locator('.threshold__invitation')).toHaveCSS(
    'pointer-events',
    'auto',
  );
  await trigger.click();

  return { theater, theaterVideo, trigger };
}

const sectionIds = [
  'top',
  'threshold',
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

  test('threshold renders ambient and theater media progressively', async ({
    page,
  }) => {
    await page.goto('/#threshold');

    const video = page.locator('[data-threshold-video]');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute(
      'poster',
      '/reforged/coven-cave-explainer-poster.webp',
    );
    await expect(video).toHaveAttribute('loop', '');
    await expect(video).toHaveAttribute('playsinline', '');
    await expect(video).toHaveAttribute('preload', 'metadata');
    await expect(video).not.toHaveAttribute('autoplay', '');
    await expect(video).toHaveJSProperty('muted', true);
    await expect(video.locator('source')).toHaveAttribute(
      'src',
      '/reforged/coven-cave-explainer.mp4',
    );

    const trigger = page.getByRole('link', {
      name: 'Play Coven Cave explainer with audio',
    });
    await expect(trigger).toHaveAttribute(
      'href',
      '/reforged/coven-cave-explainer.mp4',
    );

    const theater = page.locator('dialog[data-threshold-theater]');
    await expect(theater).toHaveCount(1);
    await expect(theater).not.toHaveAttribute('open', '');
    await expect(theater).toHaveAttribute('id', 'threshold-video-theater');
    await expect(theater).toHaveAttribute(
      'aria-labelledby',
      'threshold-theater-title',
    );
    await expect(
      page.getByRole('dialog', {
        name: 'Coven Cave explainer',
        includeHidden: true,
      }),
    ).toHaveCount(1);

    const closeButton = theater.getByRole('button', {
      name: 'Close video',
      includeHidden: true,
    });
    await expect(closeButton).toHaveCount(1);
    await expect(closeButton).toHaveAttribute('type', 'button');
    await expect(closeButton).toHaveAttribute('data-threshold-theater-close', '');

    const theaterVideo = page.locator('[data-threshold-theater-video]');
    await expect(theaterVideo).toHaveAttribute('controls', '');
    await expect(theaterVideo).toHaveAttribute('playsinline', '');
    await expect(theaterVideo).toHaveAttribute('preload', 'metadata');
    await expect(theaterVideo).not.toHaveAttribute('loop', '');
    await expect(theaterVideo).not.toHaveAttribute('autoplay', '');
    await expect(theaterVideo).toHaveJSProperty('muted', true);
    await expect(theaterVideo.locator('source')).toHaveAttribute(
      'src',
      '/reforged/coven-cave-explainer.mp4',
    );
  });

  test('threshold explainer does not request playback with reduced motion', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const requests: string[] = [];
      Object.defineProperty(window, '__mediaRequests', {
        value: requests,
      });
      HTMLMediaElement.prototype.play = function () {
        requests.push('play');
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        requests.push('pause');
      };
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#threshold');

    await expect(page.locator('[data-threshold-video]')).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __mediaRequests: string[];
              }
            ).__mediaRequests,
        ),
      )
      .toContain('pause');
    expect(
      await page.evaluate(
        () =>
          (
            window as Window & {
              __mediaRequests: string[];
            }
          ).__mediaRequests,
      ),
    ).not.toContain('play');
  });

  test('threshold explainer requests playback when it enters view', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const requests: string[] = [];
      Object.defineProperty(window, '__mediaRequests', {
        value: requests,
      });
      HTMLMediaElement.prototype.play = function () {
        requests.push('play');
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        requests.push('pause');
      };
    });
    await page.goto('/#threshold');

    await expect(page.locator('[data-threshold-video]')).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                __mediaRequests: string[];
              }
            ).__mediaRequests,
        ),
      )
      .toContain('play');
  });

  test('play opens a focused audible theater from the beginning', async ({
    page,
  }) => {
    await instrumentThresholdMedia(page);
    await page.goto('/#threshold');

    const ambientVideo = page.locator('[data-threshold-video]');
    const theaterVideo = page.locator('[data-threshold-theater-video]');

    await expect.poll(() => theaterVideo.evaluate((video) => video.readyState))
      .toBeGreaterThanOrEqual(1);
    await theaterVideo.evaluate((video) => {
      video.currentTime = 12;
    });

    const { theater, trigger } = await activateThresholdTheater(page);

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute(
      'aria-controls',
      'threshold-video-theater',
    );
    await expect(theater).toHaveAttribute('open', '');
    await expect(theaterVideo).toBeFocused();
    await expect(theaterVideo).toHaveJSProperty('muted', false);
    await expect.poll(() => theaterVideo.evaluate((video) => video.currentTime))
      .toBe(0);
    await expect(page.locator('html')).toHaveClass(/threshold-theater-open/);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as MediaWindow).__mediaEvents,
        ),
      )
      .toEqual(expect.arrayContaining(['ambient:pause', 'theater:play:audible:0']));
    await expect(ambientVideo).toHaveJSProperty('muted', true);
  });

  test('Escape closes theater, resets media, and restores focus', async ({
    page,
  }) => {
    await instrumentThresholdMedia(page);
    await page.goto('/#threshold');

    const { theater, theaterVideo, trigger } = await activateThresholdTheater(
      page,
    );
    await expect(theater).toHaveAttribute('open', '');
    await page.evaluate(() => {
      (window as MediaWindow).__mediaEvents = [];
    });
    await page.keyboard.press('Escape');

    await expect(theater).not.toHaveAttribute('open', '');
    await expect(theaterVideo).toHaveJSProperty('muted', true);
    await expect.poll(() => theaterVideo.evaluate((video) => video.currentTime))
      .toBe(0);
    await expect(page.locator('html')).not.toHaveClass(/threshold-theater-open/);
    await expect(trigger).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(() => (window as MediaWindow).__mediaEvents),
      )
      .toEqual(
        expect.arrayContaining([
          'theater:pause',
          expect.stringMatching(/^ambient:play:muted:/),
        ]),
      );
  });

  test('close button uses the same reset and focus lifecycle', async ({
    page,
  }) => {
    await instrumentThresholdMedia(page);
    await page.goto('/#threshold');

    const { theater, theaterVideo, trigger } = await activateThresholdTheater(
      page,
    );
    await theaterVideo.evaluate((video) => {
      video.currentTime = 8;
    });
    await theater.getByRole('button', { name: 'Close video' }).click();

    await expect(theater).not.toHaveAttribute('open', '');
    await expect(theaterVideo).toHaveJSProperty('muted', true);
    await expect.poll(() => theaterVideo.evaluate((video) => video.currentTime))
      .toBe(0);
    await expect(page.locator('html')).not.toHaveClass(/threshold-theater-open/);
    await expect(trigger).toBeFocused();
  });

  test('theater surface clicks do not dismiss playback', async ({ page }) => {
    await instrumentThresholdMedia(page);
    await page.goto('/#threshold');

    const { theater, theaterVideo } = await activateThresholdTheater(page);
    const surfacePoint = await theater.evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      const video = dialog
        .querySelector('[data-threshold-theater-video]')
        ?.getBoundingClientRect();
      const close = dialog
        .querySelector('[data-threshold-theater-close]')
        ?.getBoundingClientRect();
      const candidates = [
        { x: rect.left + 24, y: rect.top + 24 },
        { x: rect.left + 24, y: rect.bottom - 24 },
        { x: rect.right - 24, y: rect.bottom - 24 },
        { x: rect.right - 24, y: rect.top + 80 },
      ];
      return (
        candidates.find(
          ({ x, y }) => {
            const overlaps = (target: DOMRect | undefined) =>
              target &&
              x >= target.left &&
              x <= target.right &&
              y >= target.top &&
              y <= target.bottom;
            return (
              x >= 0 &&
              x < window.innerWidth &&
              y >= 0 &&
              y < window.innerHeight &&
              !overlaps(video) &&
              !overlaps(close) &&
              document.elementFromPoint(x, y) === dialog
            );
          },
        ) ?? null
      );
    });
    expect(surfacePoint).not.toBeNull();
    if (!surfacePoint) throw new Error('No available theater surface point');

    await page.mouse.click(surfacePoint.x, surfacePoint.y);

    await expect(theater).toHaveAttribute('open', '');
    expect(
      await theater.evaluate((dialog) => dialog.matches(':modal')),
    ).toBe(true);
    await expect(theaterVideo).toHaveJSProperty('muted', false);
    await expect
      .poll(() => page.evaluate(() => (window as MediaWindow).__mediaEvents))
      .not.toContain('theater:pause');
  });

  test('playback rejection leaves the theater focused and usable', async ({
    page,
  }) => {
    await instrumentThresholdMedia(page, true);
    await page.goto('/#threshold');

    const { theater, theaterVideo } = await activateThresholdTheater(page);

    await expect(theater).toHaveAttribute('open', '');
    await expect(theaterVideo).toBeFocused();
    await expect(theaterVideo).toHaveAttribute('controls', '');
    await expect(theaterVideo).toHaveJSProperty('muted', false);
  });

  test('hidden theater pauses without resuming audio automatically', async ({
    page,
  }) => {
    await instrumentThresholdMedia(page);
    await page.goto('/#threshold');

    const { theater } = await activateThresholdTheater(page);
    await page.evaluate(() => {
      (window as MediaWindow).__mediaEvents = [];
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect
      .poll(() =>
        page.evaluate(() => (window as MediaWindow).__mediaEvents),
      )
      .toContain('theater:pause');
    const eventCountAfterHidden = await page.evaluate(
      () => (window as MediaWindow).__mediaEvents.length,
    );

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(
      await page.evaluate(
        (eventCount) =>
          (window as MediaWindow).__mediaEvents.slice(eventCount),
        eventCountAfterHidden,
      ),
    ).not.toContain(expect.stringMatching(/^theater:play:/));
    await expect(theater).toHaveAttribute('open', '');
  });

  test('reduced motion still permits explicit theater playback', async ({
    page,
  }) => {
    await instrumentThresholdMedia(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#threshold');

    await activateThresholdTheater(page);

    const events = await page.evaluate(
      () => (window as MediaWindow).__mediaEvents,
    );
    expect(events).toContain('theater:play:audible:0');
    expect(events).not.toContain(expect.stringMatching(/^ambient:play:/));
  });

  test('unsupported dialog keeps the direct media fallback unenhanced', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      HTMLDialogElement.prototype.showModal = undefined as never;
    });
    await page.goto('/#threshold');

    const trigger = page.getByRole('link', {
      name: 'Play Coven Cave explainer with audio',
    });
    await expect(trigger).toHaveAttribute(
      'href',
      '/reforged/coven-cave-explainer.mp4',
    );
    await expect(trigger).not.toHaveAttribute('aria-haspopup');
    await expect(trigger).not.toHaveAttribute('aria-controls');
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
      const playLink = page.getByRole('link', {
        name: 'Play Coven Cave explainer with audio',
      });
      await expect(playLink).toBeVisible();
      await expect(playLink).toHaveAttribute(
        'href',
        '/reforged/coven-cave-explainer.mp4',
      );
      expect(await playLink.getAttribute('aria-haspopup')).toBeNull();
      expect(await playLink.getAttribute('aria-controls')).toBeNull();
      await expect(page.locator('[data-threshold-video]')).toBeVisible();
      await expect(page.locator('[data-threshold-video] source')).toHaveAttribute(
        'src',
        '/reforged/coven-cave-explainer.mp4',
      );
      await expect(page.locator('.threshold__invitation')).toHaveCSS(
        'opacity',
        '1',
      );
      await expect(page.locator('.threshold__invitation')).toHaveCSS(
        'pointer-events',
        'auto',
      );

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

  test('resizing out of pinned choreography restores hero presentation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/#threshold');
    await expect(page.locator('.hero-card')).toHaveCSS('opacity', '0.38');

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

  test('reduced motion disables marquee and threshold transforms', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('[data-runtime-track]').first()).toHaveCSS(
      'animation-name',
      'none',
    );
    await expect(page.locator('[data-threshold-aperture]')).toHaveCSS(
      'transform',
      'none',
    );
  });

  test('reduced-motion mobile threshold remains inside its stage', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#threshold');

    const geometry = await page.evaluate(() => {
      const stage = document
        .querySelector('.threshold__stage')
        ?.getBoundingClientRect();
      const windowPanel = document
        .querySelector('.threshold__window')
        ?.getBoundingClientRect();
      return {
        stageLeft: stage?.left ?? -1,
        stageRight: stage?.right ?? -1,
        panelLeft: windowPanel?.left ?? -1,
        panelRight: windowPanel?.right ?? -1,
      };
    });
    expect(geometry.panelLeft).toBeGreaterThanOrEqual(geometry.stageLeft);
    expect(geometry.panelRight).toBeLessThanOrEqual(geometry.stageRight);
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'landscape mobile', width: 844, height: 390 },
  ]) {
    test(`${viewport.name} centers the video inside the viewport`, async ({
      page,
    }) => {
      await instrumentThresholdMedia(page);
      await page.setViewportSize(viewport);
      await page.goto('/#threshold');

      const { theater, theaterVideo } = await activateThresholdTheater(page);
      const close = theater.getByRole('button', { name: 'Close video' });
      const geometry = await page.evaluate(() => {
        const dialog = document
          .querySelector('[data-threshold-theater]')
          ?.getBoundingClientRect();
        const video = document
          .querySelector('[data-threshold-theater-video]')
          ?.getBoundingClientRect();
        const close = document
          .querySelector('[data-threshold-theater-close]')
          ?.getBoundingClientRect();
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          dialogLeft: dialog?.left ?? -1,
          dialogTop: dialog?.top ?? -1,
          dialogWidth: dialog?.width ?? -1,
          dialogHeight: dialog?.height ?? -1,
          videoLeft: video?.left ?? -1,
          videoTop: video?.top ?? -1,
          videoRight: video?.right ?? -1,
          videoBottom: video?.bottom ?? -1,
          videoWidth: video?.width ?? -1,
          videoHeight: video?.height ?? -1,
          closeWidth: close?.width ?? -1,
          closeHeight: close?.height ?? -1,
        };
      });

      await expect(theater).toHaveAttribute('open', '');
      await expect(theaterVideo).toHaveAttribute('controls', '');
      await expect(close).toBeVisible();
      expect(geometry.dialogLeft).toBe(0);
      expect(geometry.dialogTop).toBe(0);
      expect(geometry.dialogWidth).toBe(geometry.viewportWidth);
      expect(geometry.dialogHeight).toBe(geometry.viewportHeight);
      expect(geometry.videoLeft).toBeGreaterThanOrEqual(0);
      expect(geometry.videoTop).toBeGreaterThanOrEqual(0);
      expect(geometry.videoRight).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(geometry.videoBottom).toBeLessThanOrEqual(
        geometry.viewportHeight,
      );
      expect(geometry.videoWidth / geometry.videoHeight).toBeCloseTo(16 / 9, 2);
      expect(geometry.videoLeft + geometry.videoWidth / 2).toBeCloseTo(
        geometry.viewportWidth / 2,
        1,
      );
      expect(geometry.videoTop + geometry.videoHeight / 2).toBeCloseTo(
        geometry.viewportHeight / 2,
        1,
      );
      expect(geometry.closeWidth).toBeGreaterThanOrEqual(44);
      expect(geometry.closeHeight).toBeGreaterThanOrEqual(44);
    });
  }

  test('open theater has no serious or critical axe violations', async ({
    page,
  }) => {
    await instrumentThresholdMedia(page);
    await page.goto('/#threshold');
    await activateThresholdTheater(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
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
