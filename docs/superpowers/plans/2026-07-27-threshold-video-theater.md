# Threshold Video Theater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the threshold Play control into an accessible viewport theater that restarts the supplied explainer with audio and gives the video exclusive visual focus.

**Architecture:** Keep the existing muted ambient preview and add a separate native `<dialog>` player backed by the same cached H.264/AAC asset. A small controller owns the open, visibility, and close lifecycles while preserving direct-MP4 navigation as the no-JavaScript fallback.

**Tech Stack:** Astro, semantic HTML `<dialog>`/`<video>`, vanilla JavaScript, page-scoped CSS, Playwright, axe-core, ffmpeg/ffprobe.

---

## Worktree guard

The dedicated worktree is
`/Users/buns/.config/superpowers/worktrees/coven-landing/reforged-landing`.
The approved spec is committed as `29289f5`. The implementation targets are
pre-existing untracked Reforged files, so task-level commits would also capture
broader landing work that predates this feature. Do not commit implementation
files task-by-task. End each task with focused verification and leave the
implementation uncommitted until Val explicitly chooses the full integration
scope.

## File map

- Modify `public/reforged/coven-cave-explainer.mp4`: replace the silent
  derivative with a web-optimized H.264/AAC derivative from the supplied
  original.
- Modify `src/components/reforged/Threshold.astro`: render the progressive Play
  link and native theater dialog.
- Modify `src/scripts/reforged.js`: coordinate ambient playback, theater
  playback, focus, visibility, and dismissal.
- Modify `src/styles/reforged.css`: render the pure-black viewport theater and
  responsive 16:9 player.
- Modify `tests/reforged.spec.ts`: cover markup, open/close state, audio,
  fallback, reduced motion, geometry, and accessibility.
- Modify `scripts/verify-static.mjs`: enforce the server-rendered theater
  contract.
- Modify
  `docs/superpowers/specs/2026-07-27-reforged-landing-design.md`: reconcile the
  original landing design with the approved audio theater.

### Task 1: Restore the production audio stream

**Files:**
- Modify: `public/reforged/coven-cave-explainer.mp4`
- Source only:
  `/Users/buns/Downloads/coven_cave_explainer copy.mp4`

- [ ] **Step 1: Verify the current production asset fails the audio contract**

Run:

```bash
ffprobe \
  -v error \
  -show_entries stream=codec_name,codec_type,channels,sample_rate \
  -of csv=p=0 \
  public/reforged/coven-cave-explainer.mp4
```

Expected: one `h264,video` row and no `aac,audio` row.

- [ ] **Step 2: Produce a temporary H.264/AAC derivative**

Run:

```bash
media_workdir="$(mktemp -d)"
ffmpeg \
  -hide_banner \
  -y \
  -i "/Users/buns/Downloads/coven_cave_explainer copy.mp4" \
  -map 0:v:0 \
  -map 0:a:0 \
  -vf "scale=1280:-2:flags=lanczos" \
  -c:v libx264 \
  -preset slow \
  -crf 24 \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  "$media_workdir/coven-cave-explainer.mp4"
```

Expected: ffmpeg completes with one 1280×720 H.264 video stream and one stereo
AAC audio stream. The original file in Downloads is not modified.

- [ ] **Step 3: Verify the temporary derivative before replacement**

Run:

```bash
ffprobe \
  -v error \
  -show_entries stream=codec_name,codec_type,width,height,pix_fmt,channels \
  -show_entries format=duration \
  -of default=noprint_wrappers=1 \
  "$media_workdir/coven-cave-explainer.mp4"
```

Expected output contains:

```text
codec_name=h264
codec_type=video
width=1280
height=720
pix_fmt=yuv420p
codec_name=aac
codec_type=audio
channels=2
```

- [ ] **Step 4: Replace only the generated production derivative**

Run:

```bash
mv \
  "$media_workdir/coven-cave-explainer.mp4" \
  public/reforged/coven-cave-explainer.mp4
rmdir "$media_workdir"
```

- [ ] **Step 5: Re-run the media contract**

Run:

```bash
media_streams="$(
  ffprobe \
    -v error \
    -show_entries stream=codec_name,codec_type \
    -of csv=p=0 \
    public/reforged/coven-cave-explainer.mp4
)"
printf '%s\n' "$media_streams"
test "$(printf '%s\n' "$media_streams" | rg -c '^h264,video$')" -eq 1
test "$(printf '%s\n' "$media_streams" | rg -c '^aac,audio$')" -eq 1
```

Expected: both tests exit `0`.

### Task 2: Render the progressive theater contract

**Files:**
- Modify: `tests/reforged.spec.ts:44-64`
- Modify: `tests/reforged.spec.ts:524-568`
- Modify: `scripts/verify-static.mjs:246-257`
- Modify: `src/components/reforged/Threshold.astro:12-37`

- [ ] **Step 1: Extend the markup test before changing the component**

Replace the current progressive-media test body with:

```ts
test('threshold renders ambient and theater media progressively', async ({
  page,
}) => {
  await page.goto('/#threshold');

  const ambientVideo = page.locator('[data-threshold-video]');
  await expect(ambientVideo).toHaveCount(1);
  await expect(ambientVideo).toHaveAttribute(
    'poster',
    '/reforged/coven-cave-explainer-poster.webp',
  );
  await expect(ambientVideo).toHaveAttribute('loop', '');
  await expect(ambientVideo).toHaveAttribute('playsinline', '');
  await expect(ambientVideo).toHaveAttribute('preload', 'metadata');
  await expect(ambientVideo).not.toHaveAttribute('autoplay', '');
  await expect(ambientVideo).toHaveJSProperty('muted', true);

  const trigger = page.getByRole('link', {
    name: 'Play Coven Cave explainer with audio',
  });
  await expect(trigger).toHaveAttribute(
    'href',
    '/reforged/coven-cave-explainer.mp4',
  );

  const dialog = page.locator('dialog[data-threshold-theater]');
  await expect(dialog).toHaveCount(1);
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(dialog).toHaveAttribute('id', 'threshold-video-theater');
  await expect(dialog).toHaveAttribute(
    'aria-labelledby',
    'threshold-theater-title',
  );
  await expect(
    page.getByRole('dialog', {
      name: 'Coven Cave explainer',
      includeHidden: true,
    }),
  ).toHaveCount(1);

  const closeButton = dialog.getByRole('button', {
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
});
```

- [ ] **Step 2: Require the direct-media fallback in the no-JavaScript test**

Replace the existing `Continue to supported runtimes` assertion with:

```ts
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
```

- [ ] **Step 3: Add static server-rendered theater markers**

After the `reforgedMedia` loop in `scripts/verify-static.mjs`, add:

```js
for (const marker of [
  'data-threshold-theater-trigger',
  'data-threshold-theater-video',
  'href="/reforged/coven-cave-explainer.mp4"',
]) {
  if (!html.includes(marker)) {
    throw new Error(`Homepage is missing threshold theater marker: ${marker}`);
  }
}

const thresholdTheaterDialog = html.match(
  /<dialog\b[^>]*\bdata-threshold-theater(?:[=\s>])[^>]*>/i,
)?.[0];
if (
  !thresholdTheaterDialog
  || !thresholdTheaterDialog.includes('id="threshold-video-theater"')
  || !thresholdTheaterDialog.includes('aria-labelledby="threshold-theater-title"')
) {
  throw new Error('Homepage is missing threshold theater dialog contract');
}
```

- [ ] **Step 4: Run the focused contracts and verify RED**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm check
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "ambient and theater media progressively|core story remains complete without JavaScript" \
  --project=chromium
```

Expected:

- `pnpm check` fails with
  `Homepage is missing threshold theater marker`;
- Playwright fails because the audio Play link and theater dialog do not exist.

- [ ] **Step 5: Render the progressive link and dialog**

Replace the Play anchor and append the dialog inside `Threshold.astro`:

```astro
<div class="threshold__invitation">
  <p><span></span>the threshold<span></span></p>
  <a
    href="/reforged/coven-cave-explainer.mp4"
    data-threshold-theater-trigger
    aria-label="Play Coven Cave explainer with audio"
  >
    ▶
  </a>
  <h2 id="threshold-heading">Step inside the coven</h2>
  <span>One record. Every supported surface.</span>
</div>
```

Append this after `.threshold__stage` and before `</section>`:

```astro
<dialog
  class="threshold-theater"
  id="threshold-video-theater"
  data-threshold-theater
  aria-labelledby="threshold-theater-title"
>
  <h2 class="threshold-theater__title" id="threshold-theater-title">
    Coven Cave explainer
  </h2>
  <button
    class="threshold-theater__close"
    type="button"
    data-threshold-theater-close
    aria-label="Close video"
  >
    ×
  </button>
  <video
    class="threshold-theater__video"
    data-threshold-theater-video
    controls
    muted
    playsinline
    preload="metadata"
    poster="/reforged/coven-cave-explainer-poster.webp"
    tabindex="0"
    aria-labelledby="threshold-theater-title"
  >
    <source
      src="/reforged/coven-cave-explainer.mp4"
      type="video/mp4"
    />
  </video>
</dialog>
```

- [ ] **Step 6: Build and verify GREEN**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm check
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "ambient and theater media progressively|core story remains complete without JavaScript" \
  --project=chromium
git diff --check
```

Expected: static verification and both focused browser tests pass.

### Task 3: Implement the open lifecycle

**Files:**
- Modify: `tests/reforged.spec.ts:1-3`
- Modify: `tests/reforged.spec.ts:143`
- Modify: `src/scripts/reforged.js:428-475`

- [ ] **Step 1: Add a reusable media-event instrument**

Change the Playwright import and add this helper above `test.describe`:

```ts
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
```

- [ ] **Step 2: Write the failing open-lifecycle test**

Add after the existing ambient playback tests:

```ts
test('play opens a focused audible theater from the beginning', async ({
  page,
}) => {
  await instrumentThresholdMedia(page);
  await page.goto('/#threshold');

  const ambientVideo = page.locator('[data-threshold-video]');
  const theaterVideo = page.locator('[data-threshold-theater-video]');
  await expect
    .poll(() =>
      theaterVideo.evaluate(
        (video: HTMLVideoElement) => video.readyState,
      ),
    )
    .toBeGreaterThanOrEqual(1);
  await theaterVideo.evaluate((video: HTMLVideoElement) => {
    video.currentTime = 12;
  });

  await page
    .getByRole('link', {
      name: 'Play Coven Cave explainer with audio',
    })
    .click();

  const trigger = page.getByRole('link', {
    name: 'Play Coven Cave explainer with audio',
  });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(trigger).toHaveAttribute(
    'aria-controls',
    'threshold-video-theater',
  );

  await expect(page.locator('[data-threshold-theater]')).toHaveAttribute(
    'open',
    '',
  );
  await expect(theaterVideo).toBeFocused();
  await expect(theaterVideo).toHaveJSProperty('muted', false);
  await expect(theaterVideo).toHaveJSProperty('currentTime', 0);
  await expect(page.locator('html')).toHaveClass(/threshold-theater-open/);

  const events = await page.evaluate(
    () => (window as MediaWindow).__mediaEvents,
  );
  expect(events).toContain('ambient:pause');
  expect(events).toContain('theater:play:audible:0');
  await expect(ambientVideo).toHaveJSProperty('muted', true);
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "play opens a focused audible theater" \
  --project=chromium
```

Expected: FAIL because activating the fallback link navigates to the MP4 instead
of opening the dialog.

- [ ] **Step 4: Add the theater controller state and open routine**

Extend the threshold declarations and ambient guard in `reforged.js`:

```js
const thresholdVideo = document.querySelector('[data-threshold-video]');
const thresholdTheaterTrigger = document.querySelector(
  '[data-threshold-theater-trigger]',
);
const thresholdTheater = document.querySelector(
  '[data-threshold-theater]',
);
const thresholdTheaterVideo = document.querySelector(
  '[data-threshold-theater-video]',
);
const thresholdTheaterClose = document.querySelector(
  '[data-threshold-theater-close]',
);
let thresholdVideoInView = false;
let thresholdTheaterOpen = false;
let thresholdTheaterOpener = null;

function syncThresholdVideoPlayback() {
  if (!thresholdVideo) return;
  if (
    thresholdTheaterOpen ||
    prefersReducedMotion() ||
    document.visibilityState === 'hidden' ||
    !thresholdVideoInView
  ) {
    thresholdVideo.pause();
    return;
  }
  thresholdVideo.play().catch(() => {});
}

async function openThresholdTheater(event) {
  if (
    !thresholdTheaterTrigger ||
    !thresholdTheater ||
    !thresholdTheaterVideo ||
    typeof thresholdTheater.showModal !== 'function'
  ) {
    return;
  }

  event.preventDefault();
  thresholdTheaterOpener = event.currentTarget;
  thresholdTheaterOpen = true;
  thresholdVideo?.pause();

  try {
    thresholdTheater.showModal();
  } catch {
    thresholdTheaterOpen = false;
    thresholdTheaterOpener = null;
    syncThresholdVideoPlayback();
    window.location.assign(thresholdTheaterTrigger.href);
    return;
  }

  document.documentElement.classList.add('threshold-theater-open');
  thresholdTheaterVideo.currentTime = 0;
  thresholdTheaterVideo.muted = false;
  thresholdTheaterVideo.focus({ preventScroll: true });

  try {
    await thresholdTheaterVideo.play();
  } catch {
    // Native controls remain focused and usable for a manual retry.
  }
}

if (
  thresholdTheaterTrigger &&
  thresholdTheater &&
  thresholdTheaterVideo &&
  thresholdTheaterClose &&
  typeof thresholdTheater.showModal === 'function'
) {
  thresholdTheaterTrigger.setAttribute('aria-haspopup', 'dialog');
  thresholdTheaterTrigger.setAttribute(
    'aria-controls',
    'threshold-video-theater',
  );
  thresholdTheaterTrigger.addEventListener(
    'click',
    openThresholdTheater,
  );
}
```

Keep the existing IntersectionObserver setup after these declarations.

- [ ] **Step 5: Build and verify GREEN**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "play opens a focused audible theater|threshold explainer" \
  --project=chromium
node --check src/scripts/reforged.js
git diff --check
```

Expected: the new open test and all existing ambient playback tests pass.

### Task 4: Implement dismissal, visibility, and failure behavior

**Files:**
- Modify: `tests/reforged.spec.ts` after the open-lifecycle test
- Modify: `src/scripts/reforged.js:443-475`
- Modify: `src/scripts/reforged.js:606-632`

- [ ] **Step 1: Write the failing close-lifecycle test**

```ts
test('Escape closes theater, resets media, and restores focus', async ({
  page,
}) => {
  await instrumentThresholdMedia(page);
  await page.goto('/#threshold');

  const trigger = page.getByRole('link', {
    name: 'Play Coven Cave explainer with audio',
  });
  const dialog = page.locator('[data-threshold-theater]');
  const theaterVideo = page.locator('[data-threshold-theater-video]');

  await trigger.click();
  await page.evaluate(() => {
    (window as MediaWindow).__mediaEvents.length = 0;
  });
  await page.keyboard.press('Escape');

  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(theaterVideo).toHaveJSProperty('muted', true);
  await expect(theaterVideo).toHaveJSProperty('currentTime', 0);
  await expect(page.locator('html')).not.toHaveClass(
    /threshold-theater-open/,
  );
  await expect(trigger).toBeFocused();

  await expect
    .poll(() =>
      page.evaluate(() => (window as MediaWindow).__mediaEvents),
    )
    .toContain('theater:pause');
  await expect
    .poll(() =>
      page.evaluate(() => (window as MediaWindow).__mediaEvents),
    )
    .toContain('ambient:play:muted:0');
});

test('close button uses the same reset and focus lifecycle', async ({
  page,
}) => {
  await instrumentThresholdMedia(page);
  await page.goto('/#threshold');

  const trigger = page.getByRole('link', {
    name: 'Play Coven Cave explainer with audio',
  });
  const theaterVideo = page.locator('[data-threshold-theater-video]');

  await trigger.click();
  await page
    .getByRole('button', { name: 'Close video' })
    .click();

  await expect(page.locator('[data-threshold-theater]')).not.toHaveAttribute(
    'open',
    '',
  );
  await expect(theaterVideo).toHaveJSProperty('muted', true);
  await expect(theaterVideo).toHaveJSProperty('currentTime', 0);
  await expect(trigger).toBeFocused();
});
```

- [ ] **Step 2: Write the failing backdrop and playback-rejection tests**

```ts
test('theater ignores backdrop clicks', async ({ page }) => {
  await instrumentThresholdMedia(page);
  await page.goto('/#threshold');
  await page
    .getByRole('link', {
      name: 'Play Coven Cave explainer with audio',
    })
    .click();

  await page.mouse.click(5, 5);
  await expect(page.locator('[data-threshold-theater]')).toHaveAttribute(
    'open',
    '',
  );
});

test('playback rejection leaves the theater focused and usable', async ({
  page,
}) => {
  await instrumentThresholdMedia(page, true);
  await page.goto('/#threshold');
  await page
    .getByRole('link', {
      name: 'Play Coven Cave explainer with audio',
    })
    .click();

  const theaterVideo = page.locator('[data-threshold-theater-video]');
  await expect(page.locator('[data-threshold-theater]')).toHaveAttribute(
    'open',
    '',
  );
  await expect(theaterVideo).toBeFocused();
  await expect(theaterVideo).toHaveAttribute('controls', '');
  await expect(theaterVideo).toHaveJSProperty('muted', false);
});
```

- [ ] **Step 3: Write the failing visibility and reduced-motion tests**

```ts
test('hidden theater pauses without resuming audio automatically', async ({
  page,
}) => {
  await instrumentThresholdMedia(page);
  await page.goto('/#threshold');
  await page
    .getByRole('link', {
      name: 'Play Coven Cave explainer with audio',
    })
    .click();

  await page.evaluate(() => {
    const mediaWindow = window as MediaWindow;
    mediaWindow.__mediaEvents.length = 0;
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

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(
    await page.evaluate(() => (window as MediaWindow).__mediaEvents),
  ).not.toContain('theater:play:audible:0');
});

test('reduced motion still permits explicit theater playback', async ({
  page,
}) => {
  await instrumentThresholdMedia(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#threshold');
  await page
    .getByRole('link', {
      name: 'Play Coven Cave explainer with audio',
    })
    .click();

  const events = await page.evaluate(
    () => (window as MediaWindow).__mediaEvents,
  );
  expect(events).toContain('theater:play:audible:0');
  expect(events).not.toContain('ambient:play:muted:0');
});
```

- [ ] **Step 4: Run the lifecycle tests and verify RED**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "Escape closes theater|close button uses|ignores backdrop|playback rejection|hidden theater|reduced motion still permits" \
  --project=chromium
```

Expected: open/rejection behavior may pass, while Escape cleanup, ambient
resumption, and hidden-page theater pause fail because close and visibility
lifecycle handlers do not exist.

- [ ] **Step 5: Add one close routine and visibility handler**

Add after `openThresholdTheater`:

```js
function finishThresholdTheaterClose() {
  if (!thresholdTheaterVideo) return;

  thresholdTheaterVideo.pause();
  thresholdTheaterVideo.currentTime = 0;
  thresholdTheaterVideo.muted = true;
  document.documentElement.classList.remove('threshold-theater-open');
  thresholdTheaterOpen = false;

  const opener = thresholdTheaterOpener;
  thresholdTheaterOpener = null;
  opener?.focus({ preventScroll: true });
  syncThresholdVideoPlayback();
}

function closeThresholdTheater() {
  if (thresholdTheater?.open) thresholdTheater.close();
}

function handleThresholdTheaterCancel(event) {
  event.preventDefault();
  closeThresholdTheater();
}

function handleVisibilityChange() {
  if (
    document.visibilityState === 'hidden' &&
    thresholdTheaterOpen
  ) {
    thresholdTheaterVideo?.pause();
  }
  syncThresholdVideoPlayback();
}
```

Extend the existing theater wiring block:

```js
thresholdTheaterClose.addEventListener(
  'click',
  closeThresholdTheater,
);
thresholdTheater.addEventListener(
  'cancel',
  handleThresholdTheaterCancel,
);
thresholdTheater.addEventListener(
  'close',
  finishThresholdTheaterClose,
);
```

Replace:

```js
document.addEventListener(
  'visibilitychange',
  syncThresholdVideoPlayback,
);
```

with:

```js
document.addEventListener('visibilitychange', handleVisibilityChange);
```

- [ ] **Step 6: Build and verify GREEN**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "Escape closes theater|close button uses|ignores backdrop|playback rejection|hidden theater|reduced motion still permits" \
  --project=chromium
node --check src/scripts/reforged.js
git diff --check
```

Expected: all lifecycle tests pass with no page errors or unhandled playback
rejection.

### Task 5: Give the video exclusive responsive focus

**Files:**
- Modify: `tests/reforged.spec.ts:694-760`
- Modify: `src/styles/reforged.css:30-45`
- Modify: `src/styles/reforged.css:538-610`
- Modify: `src/styles/reforged.css:2541-2591`

- [ ] **Step 1: Write the failing responsive-geometry test**

Add before the existing horizontal-overflow loop:

```ts
for (const viewport of [
  { name: 'desktop theater', width: 1440, height: 1000 },
  { name: 'mobile theater', width: 390, height: 844 },
]) {
  test(`${viewport.name} centers the video inside the viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await instrumentThresholdMedia(page);
    await page.goto('/#threshold');
    await page
      .getByRole('link', {
        name: 'Play Coven Cave explainer with audio',
      })
      .click();

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
        dialog,
        video,
        close,
        viewport: { width: innerWidth, height: innerHeight },
      };
    });

    expect(geometry.dialog?.left).toBe(0);
    expect(geometry.dialog?.top).toBe(0);
    expect(geometry.dialog?.right).toBe(geometry.viewport.width);
    expect(geometry.dialog?.bottom).toBe(geometry.viewport.height);
    expect(geometry.video?.left).toBeGreaterThanOrEqual(0);
    expect(geometry.video?.top).toBeGreaterThanOrEqual(0);
    expect(geometry.video?.right).toBeLessThanOrEqual(
      geometry.viewport.width,
    );
    expect(geometry.video?.bottom).toBeLessThanOrEqual(
      geometry.viewport.height,
    );
    expect(
      Math.abs(
        (geometry.video?.width ?? 0) /
          (geometry.video?.height ?? 1) -
          16 / 9,
      ),
    ).toBeLessThan(0.02);
    expect(geometry.close?.width).toBeGreaterThanOrEqual(44);
    expect(geometry.close?.height).toBeGreaterThanOrEqual(44);
  });
}
```

- [ ] **Step 2: Write the failing open-theater accessibility test**

```ts
test('open theater has no serious axe violations', async ({ page }) => {
  await instrumentThresholdMedia(page);
  await page.goto('/#threshold');
  await page
    .getByRole('link', {
      name: 'Play Coven Cave explainer with audio',
    })
    .click();

  const results = await new AxeBuilder({ page })
    .include('[data-threshold-theater]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
});
```

- [ ] **Step 3: Run the visual contracts and verify RED**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "centers the video inside the viewport|open theater has no serious" \
  --project=chromium
```

Expected: geometry fails because the dialog still has user-agent dimensions and
the theater player has no viewport layout.

- [ ] **Step 4: Add the pure-black theater CSS**

Add near the base `html` and focus rules:

```css
html.threshold-theater-open,
html.threshold-theater-open body {
  overflow: hidden;
}
```

Add after the threshold invitation styles:

```css
.threshold-theater {
  position: fixed;
  inset: 0;
  display: none;
  width: 100dvw;
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 16px;
  border: 0;
  background: #000;
  color: #fff;
}

.threshold-theater[open] {
  display: grid;
  place-items: center;
}

.threshold-theater::backdrop {
  background: #000;
}

.threshold-theater__title {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.threshold-theater__video {
  display: block;
  width: min(
    1280px,
    calc(100dvw - 32px),
    calc(177.78dvh - 56.89px)
  );
  height: auto;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  background: #000;
  object-fit: contain;
  box-shadow: 0 0 80px rgba(154, 142, 205, 0.16);
}

.threshold-theater__video:focus-visible {
  outline: 2px solid var(--violet-hot);
  outline-offset: 4px;
}

.threshold-theater__close {
  position: fixed;
  z-index: 1;
  top: max(16px, env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  background: rgba(4, 3, 7, 0.78);
  color: #f7f3ff;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

.threshold-theater__close:hover {
  border-color: rgba(255, 255, 255, 0.48);
  background: rgba(12, 10, 17, 0.92);
}
```

Do not add theater transitions. The existing reduced-motion block needs no
theater override.

- [ ] **Step 5: Build and verify GREEN**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "centers the video inside the viewport|open theater has no serious|mobile controls preserve" \
  --project=chromium
git diff --check
```

Expected: desktop/mobile geometry, open-dialog axe, and touch-target tests pass.

- [ ] **Step 6: Inspect the live interaction**

Keep the existing dev server at `http://127.0.0.1:4321/` if it is healthy.
Otherwise run:

```bash
/opt/homebrew/bin/pnpm dev --host 127.0.0.1 --port 4321
```

Inspect `http://127.0.0.1:4321/#threshold` at 1440×1000 and 390×844. Confirm:

- Play replaces the page visually with pure black and the centered video;
- playback restarts with audible sound;
- native controls remain usable;
- backdrop clicks do nothing;
- `Escape` closes and restores focus;
- no page chrome or threshold copy competes with the video;
- mobile has no clipped controls or background scroll.

### Task 6: Reconcile documentation and run the complete gate

**Files:**
- Modify:
  `docs/superpowers/specs/2026-07-27-reforged-landing-design.md:34-36`
- Modify:
  `docs/superpowers/specs/2026-07-27-reforged-landing-design.md:60-65`
- Verify all files named in the file map

- [ ] **Step 1: Update the parent Reforged design**

Replace the threshold narrative item with:

```markdown
3. Threshold: a layered cave aperture opens onto the supplied Coven Cave
   explainer. Production uses an optimized H.264/AAC MP4, muted for the ambient
   threshold preview and audible only after explicit theater activation.
```

Replace the threshold playback behavior bullet with:

```markdown
- The threshold preview requests muted playback only while near the viewport.
  The Play control opens a pure-black modal theater, restarts the explainer with
  audio, and exposes native controls. Reduced motion suppresses only the
  ambient loop, not explicitly requested theater playback.
```

- [ ] **Step 2: Run the focused theater suite**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm exec playwright test \
  tests/reforged.spec.ts \
  --grep "threshold|theater|reduced motion" \
  --project=chromium
```

Expected: every threshold/theater test passes with zero failures.

- [ ] **Step 3: Run the full repository verification**

Run:

```bash
/opt/homebrew/bin/pnpm build
/opt/homebrew/bin/pnpm check
/opt/homebrew/bin/pnpm check:browser
node --check src/scripts/reforged.js
git diff --check
```

Expected:

- Astro builds all five routes;
- static verification reports all core/Reforged assets and copy contracts;
- the complete Playwright suite passes with zero failures;
- JavaScript syntax and whitespace checks exit `0`.

- [ ] **Step 4: Verify deployed media shape and live dev responses**

Run:

```bash
ffprobe \
  -v error \
  -show_entries stream=codec_name,codec_type,width,height,pix_fmt,channels \
  -of csv=p=0 \
  public/reforged/coven-cave-explainer.mp4
curl -fsSI \
  http://127.0.0.1:4321/reforged/coven-cave-explainer.mp4
curl -fsSI \
  http://127.0.0.1:4321/reforged/coven-cave-explainer-poster.webp
```

Expected: H.264 1280×720 YUV 4:2:0 video, stereo AAC audio, and HTTP `200` for
both live assets.

- [ ] **Step 5: Audit worktree scope without committing**

Run:

```bash
git status --short
git diff --check
git diff -- \
  scripts/verify-static.mjs \
  package.json \
  src/pages/index.astro \
  tests/landing.spec.ts
rg -n \
  "threshold-theater|Play Coven Cave explainer with audio" \
  src/components/reforged/Threshold.astro \
  src/scripts/reforged.js \
  src/styles/reforged.css \
  tests/reforged.spec.ts \
  scripts/verify-static.mjs
```

Expected: tracked-file diffs remain scoped, every planned theater hook is
present, and whitespace checks pass. Report the proof gap explicitly: the
Reforged component/script/style/test files are pre-existing untracked files, so
Git has no baseline that can isolate their theater-only textual diff.
Implementation remains uncommitted; do not stage or commit without Val's
explicit integration instruction.
