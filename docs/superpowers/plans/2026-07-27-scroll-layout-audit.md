# Comprehensive Scroll and Layout Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every scroll-driven state deterministic, apply the approved homepage scale, and use tablet and short-landscape screen space more efficiently without adding blanket homepage animations.

**Architecture:** Keep the existing Astro components and progressive fallbacks. Add page-scoped zoom, make the continuity observer schedule one geometry-based state selection per frame, throttle the header state writer, and add narrow responsive overrides only for layouts proven to waste horizontal space.

**Tech Stack:** Astro 5, component-scoped CSS, browser JavaScript, Playwright, pnpm

---

## File Map

- Modify `tests/landing.spec.ts`: add contracts for zoom isolation, bidirectional continuity selection, responsive geometry, reveal completion, and header throttling.
- Modify `src/pages/index.astro`: identify the homepage body for page-scoped scaling.
- Modify `src/styles/global.css`: apply homepage zoom and short-landscape GitHub/Quick Start density overrides.
- Modify `src/components/Hero.astro`: keep homepage hero copy and ledger side by side in short landscape.
- Modify `src/components/ContinuityStory.astro`: reduce desktop scroll runway and pair medium-width copy with snapshots.
- Modify `src/components/RuntimeProof.astro`: tighten the short-landscape proof section.
- Modify `src/components/ProductConstellation.astro`: reduce avoidable medium-width card height and short-landscape padding.
- Modify `src/components/QuickStart.astro`: use two columns at medium widths and compact short-landscape spacing.
- Modify `src/scripts/landing.js`: make continuity selection deterministic.
- Modify `src/scripts/main.js`: coalesce header scroll updates into one animation frame.
- Reference `docs/superpowers/specs/2026-07-27-scroll-layout-audit-design.md`.

### Task 1: Lock the homepage scale and continuity behavior

**Files:**

- Modify: `tests/landing.spec.ts:149-173`
- Modify: `tests/landing.spec.ts:1572`
- Modify: `src/pages/index.astro:85`
- Modify: `src/styles/global.css:97-106`
- Modify: `src/scripts/landing.js:46-123`

- [ ] **Step 1: Add the failing homepage scale contract**

Insert before the `visualMatrix` declaration:

```ts
test('homepage applies 116% scale only at tablet and desktop widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const homepageBody = page.locator('body');
  await expect(homepageBody).toHaveClass('home-page');

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 767, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(homepageBody).toHaveCSS('zoom', '1');
  }

  for (const width of [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(homepageBody).toHaveCSS('zoom', '1.16');
  }

  for (const pathname of ['/quickstart', '/github', '/privacy', '/terms']) {
    await page.goto(pathname);
    await expect(page.locator('body')).not.toHaveClass(
      /(?:^|\s)home-page(?:\s|$)/,
    );
    await expect(page.locator('body')).toHaveCSS('zoom', '1');
  }
});
```

- [ ] **Step 2: Strengthen the continuity test to cover reverse scrolling**

Replace the passive-scroll portion of
`continuity anchors and passive scroll select story state` with:

```ts
  await page.goto('/');
  const stages = story.locator('[data-story-stage]');
  const expected = ['summoned', 'learned', 'moved', 'returned'] as const;

  for (const index of [0, 1, 2, 3, 2, 1, 0]) {
    await stages.nth(index).evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top - window.innerHeight * 0.42,
        behavior: 'instant',
      });
    });
    await expect
      .poll(() =>
        story
          .locator('[data-story-stage].is-active')
          .getAttribute('data-story-stage'),
      )
      .toBe(expected[index]);
  }

  await expect(page).toHaveURL('http://127.0.0.1:4173/');
```

- [ ] **Step 3: Build and prove both contracts fail**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts \
  --grep "homepage applies 116% scale only|continuity anchors and passive scroll"
```

Expected: the scale test fails because the body class and zoom are absent; the
continuity test fails while scrolling backward because stages are skipped.

- [ ] **Step 4: Scope the homepage**

In `src/pages/index.astro`, change:

```astro
<body>
```

to:

```astro
<body class="home-page">
```

- [ ] **Step 5: Apply the approved scale**

Immediately after the base `body` rule in `src/styles/global.css`, add:

```css
    @media (min-width: 768px) {
      body.home-page {
        zoom: 116%;
      }
    }
```

- [ ] **Step 6: Replace callback-order continuity selection**

In `wireContinuityStory`, add after `motionOn`:

```js
  var syncFrame = null;
  var activationRatio = 0.42;
```

Add after `paint`:

```js
  function syncActiveStage() {
    syncFrame = null;
    var activationLine = window.innerHeight * activationRatio;
    var nextStage = stages[0];

    stages.forEach(function (stage) {
      if (stage.getBoundingClientRect().top <= activationLine) {
        nextStage = stage;
      }
    });

    paint(nextStage?.getAttribute('data-story-stage'));
  }

  function queueStageSync() {
    if (syncFrame) return;
    syncFrame = window.requestAnimationFrame(syncActiveStage);
  }
```

Replace the observer block with:

```js
  if (!('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(
    queueStageSync,
    { rootMargin: '-42% 0px -57% 0px', threshold: 0 },
  );
  stages.forEach(function (stage) {
    observer.observe(stage);
  });
  window.addEventListener('scroll', queueStageSync, { passive: true });
  window.addEventListener('resize', queueStageSync);
  root.classList.add('is-enhanced');
  queueStageSync();
```

- [ ] **Step 7: Rebuild and prove both contracts pass**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts \
  --grep "homepage applies 116% scale only|continuity anchors and passive scroll"
```

Expected: both focused tests pass at all named widths and in both scroll
directions.

- [ ] **Step 8: Commit the state-controller work**

```bash
git add tests/landing.spec.ts src/pages/index.astro src/styles/global.css src/scripts/landing.js
git commit -m "fix: stabilize homepage scroll state" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Optimize homepage component geometry

**Files:**

- Modify: `tests/landing.spec.ts:514-710`
- Modify: `src/components/Hero.astro:269-315`
- Modify: `src/components/ContinuityStory.astro:99-103`
- Modify: `src/components/ContinuityStory.astro:215-258`
- Modify: `src/components/RuntimeProof.astro:227-296`
- Modify: `src/components/ProductConstellation.astro:266-314`
- Modify: `src/components/QuickStart.astro:229-274`

- [ ] **Step 1: Add failing medium-width layout contracts**

Insert after the product-constellation breakpoint test:

```ts
test('homepage uses medium-width space without unnecessary stacking', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const previewBoxes = await page
    .locator('.quickstart-preview-step')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width };
      }),
    );
  expect(Math.abs(previewBoxes[0].y - previewBoxes[1].y)).toBeLessThanOrEqual(1);
  expect(previewBoxes[2].y).toBeGreaterThan(previewBoxes[0].y);
  expect(previewBoxes[2].width).toBeGreaterThan(previewBoxes[0].width);

  const stage = page.locator('[data-story-stage]').nth(1);
  const stageGeometry = await stage.evaluate((element) => {
    const heading = element.querySelector('h3')!.getBoundingClientRect();
    const snapshot = element
      .querySelector('.stage-snapshot')!
      .getBoundingClientRect();
    return {
      headingRight: heading.right,
      snapshotLeft: snapshot.left,
      headingTop: heading.top,
      snapshotTop: snapshot.top,
    };
  });
  expect(stageGeometry.snapshotLeft).toBeGreaterThan(stageGeometry.headingRight);
  expect(
    Math.abs(stageGeometry.snapshotTop - stageGeometry.headingTop),
  ).toBeLessThanOrEqual(80);
});
```

- [ ] **Step 2: Add the failing short-landscape homepage contract**

Insert after the medium-width test:

```ts
test('homepage hero and proof stay dense in short landscape', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const hero = await page.locator('.hero').evaluate((element) => {
    const copy = element.querySelector('.hero-copy')!.getBoundingClientRect();
    const ledger = element.querySelector('.hero-ledger')!.getBoundingClientRect();
    return {
      height: element.getBoundingClientRect().height,
      copyTop: copy.top,
      ledgerTop: ledger.top,
      copyRight: copy.right,
      ledgerLeft: ledger.left,
    };
  });
  expect(Math.abs(hero.copyTop - hero.ledgerTop)).toBeLessThanOrEqual(80);
  expect(hero.ledgerLeft).toBeGreaterThan(hero.copyRight);
  expect(hero.height).toBeLessThan(700);

  const runtimeHeight = await page
    .locator('.runtime-proof')
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(runtimeHeight).toBeLessThan(760);
});
```

- [ ] **Step 3: Run the geometry tests and verify they fail**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts \
  --grep "medium-width space|short landscape"
```

Expected: the preview and story remain stacked, and the short-landscape hero
exceeds the height threshold.

- [ ] **Step 4: Reduce desktop story runway and pair tablet snapshots**

In `src/components/ContinuityStory.astro`, change the base stage rule to:

```css
  .continuity-stages li {
    min-height: clamp(320px, 42vh, 440px);
    padding: 20px 0 64px 52px;
    scroll-margin-top: 100px;
  }
```

After the existing `@media (max-width: 900px)` block, add:

```css
  @media (min-width: 641px) and (max-width: 900px) {
    .continuity-stages li {
      display: grid;
      grid-template-columns: minmax(0, 0.85fr) minmax(280px, 1.15fr);
      column-gap: 32px;
      align-items: start;
      padding: 20px 0 56px 52px;
    }

    .stage-anchor,
    .continuity-stages h3,
    .continuity-stages li > p {
      grid-column: 1;
    }

    .stage-snapshot {
      grid-column: 2;
      grid-row: 1 / span 3;
      margin-top: 0;
    }
  }
```

- [ ] **Step 5: Use two preview columns at medium widths**

Replace the Quick Start `@media (max-width: 900px)` grid rule with:

```css
  @media (max-width: 900px) {
    .quickstart-preview {
      padding: 88px 20px;
    }

    .quickstart-preview-steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .quickstart-preview-step:last-child {
      grid-column: 1 / -1;
    }
  }
```

At the start of `@media (max-width: 520px)`, add:

```css
    .quickstart-preview-steps {
      grid-template-columns: 1fr;
    }

    .quickstart-preview-step:last-child {
      grid-column: auto;
    }
```

- [ ] **Step 6: Add short-landscape homepage hero density**

Before the `@media (max-width: 520px)` block in `Hero.astro`, add:

```css
  @media (min-width: 700px) and (max-width: 900px) and (max-height: 520px) {
    .hero {
      min-height: calc(100svh - 60px);
      grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.05fr);
      align-items: center;
      gap: 24px;
      padding: 32px 20px 68px;
    }

    .hero-copy,
    .hero-ledger {
      order: initial;
    }

    .hero-kicker {
      margin-bottom: 14px;
    }

    h1 {
      margin-bottom: 16px;
      font-size: clamp(2.25rem, 5vw, 2.75rem);
    }

    .hero-lede {
      margin-bottom: 18px;
      font-size: 0.875rem;
      line-height: 1.55;
    }

    .hero-actions {
      gap: 8px;
    }

    :global(.cave-shortcut) {
      margin-top: 8px;
      font-size: 0.75rem;
    }

    .hero-thread-cue {
      bottom: 12px;
      left: 20px;
    }
  }
```

- [ ] **Step 7: Tighten supporting homepage sections**

Before the `@media (max-width: 767px)` block in `RuntimeProof.astro`, add:

```css
  @media (min-width: 700px) and (max-width: 900px) and (max-height: 520px) {
    .runtime-proof {
      padding: 64px 20px;
    }

    .runtime-header {
      margin-bottom: 36px;
    }

    .runtime-tabs button {
      min-height: 92px;
      padding: 16px;
    }

    .runtime-panels {
      min-height: 300px;
    }

    .runtime-panel {
      padding: 28px;
    }
  }
```

Inside `@media (max-width: 1179px)` in `ProductConstellation.astro`, add:

```css
    .product-card {
      min-height: 300px;
    }
```

Before the `@media (max-width: 767px)` block, add:

```css
  @media (min-width: 700px) and (max-width: 900px) and (max-height: 520px) {
    .product-constellation {
      padding: 64px 20px;
    }

    .constellation-header {
      margin-bottom: 40px;
    }

    .product-card {
      min-height: 280px;
      padding: 22px;
    }
  }
```

- [ ] **Step 8: Rebuild and prove homepage geometry passes**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts \
  --grep "medium-width space|homepage hero and proof"
```

Expected: both geometry tests pass with no horizontal overflow.

- [ ] **Step 9: Commit the homepage density work**

```bash
git add tests/landing.spec.ts src/components/Hero.astro \
  src/components/ContinuityStory.astro src/components/RuntimeProof.astro \
  src/components/ProductConstellation.astro src/components/QuickStart.astro
git commit -m "style: optimize homepage viewport density" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Optimize short-landscape secondary routes

**Files:**

- Modify: `tests/landing.spec.ts:30-53`
- Modify: `src/styles/global.css:1963-2005`

- [ ] **Step 1: Add failing route geometry contracts**

Insert after the existing GitHub layout test:

```ts
test('secondary route heroes use short-landscape width', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });

  await page.goto('/github');
  const github = await page.locator('.github-hero').evaluate((element) => {
    const copy = element.querySelector('.github-hero-copy')!.getBoundingClientRect();
    const visual = element
      .querySelector('.github-hero-visual')!
      .getBoundingClientRect();
    return {
      height: element.getBoundingClientRect().height,
      copyRight: copy.right,
      visualLeft: visual.left,
      topDelta: Math.abs(copy.top - visual.top),
    };
  });
  expect(github.visualLeft).toBeGreaterThan(github.copyRight);
  expect(github.topDelta).toBeLessThanOrEqual(80);
  expect(github.height).toBeLessThan(620);

  await page.goto('/quickstart');
  const quickstart = await page.locator('.onboard-hero').evaluate((element) => {
    const copy = element
      .querySelector('.onboard-hero-copy')!
      .getBoundingClientRect();
    const route = element.querySelector('.onboard-route')!.getBoundingClientRect();
    return {
      height: element.getBoundingClientRect().height,
      copyRight: copy.right,
      routeLeft: route.left,
      topDelta: Math.abs(copy.top - route.top),
    };
  });
  expect(quickstart.routeLeft).toBeGreaterThan(quickstart.copyRight);
  expect(quickstart.topDelta).toBeLessThanOrEqual(80);
  expect(quickstart.height).toBeLessThan(760);

  const productLayout = await page
    .locator('.onboard-product-layout')
    .first()
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(productLayout.split(' ')).toHaveLength(2);
});
```

- [ ] **Step 2: Run the route geometry test and verify it fails**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts \
  --grep "secondary route heroes use short-landscape width"
```

Expected: both heroes are one-column and exceed their height thresholds.

- [ ] **Step 3: Add final short-landscape overrides**

At the end of `src/styles/global.css`, add:

```css
    @media (min-width: 701px) and (max-width: 900px) and (max-height: 520px) {
      .content-section {
        padding-block: 40px;
      }

      .github-hero {
        min-height: auto;
        grid-template-columns: minmax(0, 0.95fr) minmax(340px, 1.05fr);
        gap: 28px;
        padding: 32px 20px 44px;
      }

      .github-hero-visual {
        justify-content: stretch;
      }

      .github-run-card {
        max-width: none;
      }

      .onboard-hero {
        grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
        gap: 28px;
        padding: 40px 20px;
      }

      .onboard-route {
        padding: 22px 20px 24px;
      }

      .onboard-product {
        padding: 32px 28px 36px;
      }

      .onboard-product-layout {
        grid-template-columns: 200px minmax(0, 1fr);
        gap: 24px;
      }

      .onboard-guide-list {
        gap: 20px;
      }
    }
```

- [ ] **Step 4: Rebuild and prove route geometry passes**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts \
  --grep "secondary route heroes use short-landscape width"
```

Expected: the GitHub and Quick Start hero children share a row, the product
layout has two columns, and the height thresholds pass.

- [ ] **Step 5: Commit the secondary-route density work**

```bash
git add tests/landing.spec.ts src/styles/global.css
git commit -m "style: compact short landscape routes" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Verify every reveal and throttle header state writes

**Files:**

- Modify: `tests/landing.spec.ts:828-834`
- Modify: `tests/landing.spec.ts:1534-1541`
- Modify: `src/scripts/main.js:1-9`

- [ ] **Step 1: Add a failing header coalescing contract**

Insert after `header becomes opaque only after scrolling`:

```ts
test('header coalesces repeated scroll events into one frame', async ({ page }) => {
  await page.addInitScript(() => {
    const originalToggle = DOMTokenList.prototype.toggle;
    (window as Window & { __headerToggleCalls?: number }).__headerToggleCalls = 0;
    DOMTokenList.prototype.toggle = function (token, force) {
      if (token === 'is-scrolled') {
        (window as Window & { __headerToggleCalls?: number })
          .__headerToggleCalls! += 1;
      }
      return originalToggle.call(this, token, force);
    };
  });
  await page.goto('/');

  await page.evaluate(() => {
    window.scrollTo(0, 120);
    for (let index = 0; index < 20; index += 1) {
      window.dispatchEvent(new Event('scroll'));
    }
  });
  await page.evaluate(
    () => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    ),
  );

  const calls = await page.evaluate(
    () => (window as Window & { __headerToggleCalls?: number })
      .__headerToggleCalls,
  );
  expect(calls).toBeLessThanOrEqual(2);
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/);
});
```

- [ ] **Step 2: Add a complete reveal lifecycle contract**

Insert after the reduced-motion test:

```ts
test('all secondary-route reveals complete at representative viewports', async ({
  browser,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ]) {
    for (const pathname of ['/github', '/quickstart']) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(pathname);

      const pageHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      for (
        let top = 0;
        top <= pageHeight;
        top += Math.max(160, Math.floor(viewport.height * 0.7))
      ) {
        await page.evaluate((nextTop) => window.scrollTo(0, nextTop), top);
        await page.waitForTimeout(40);
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1_200);

      const incomplete = await page.locator('[data-reveal]').evaluateAll(
        (elements) =>
          elements
            .map((element, index) => {
              const style = getComputedStyle(element);
              return {
                index,
                visible: element.classList.contains('is-visible'),
                opacity: style.opacity,
                transform: style.transform,
              };
            })
            .filter(
              (state) =>
                !state.visible
                || state.opacity !== '1'
                || state.transform !== 'none',
            ),
      );
      expect(incomplete).toEqual([]);
      await context.close();
    }
  }
});
```

- [ ] **Step 3: Run the header and reveal tests**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts \
  --grep "header coalesces|all secondary-route reveals"
```

Expected: the reveal audit passes on the existing implementation; the header
test fails because every dispatched scroll event invokes `classList.toggle`.

- [ ] **Step 4: Coalesce header state writes**

Replace `wireHeader` in `src/scripts/main.js` with:

```js
(function wireHeader() {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var pending = false;
  var scrolled = null;

  var commit = function () {
    pending = false;
    var next = window.scrollY > 12;
    if (next === scrolled) return;
    scrolled = next;
    header.classList.toggle('is-scrolled', next);
  };

  var sync = function () {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(commit);
  };

  commit();
  window.addEventListener('scroll', sync, { passive: true });
})();
```

- [ ] **Step 5: Re-run the focused tests**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts \
  --grep "header becomes opaque|header coalesces|all secondary-route reveals|reduced motion"
```

Expected: all focused scroll and motion tests pass.

- [ ] **Step 6: Commit the scroll lifecycle work**

```bash
git add tests/landing.spec.ts src/scripts/main.js
git commit -m "perf: coalesce scroll lifecycle updates" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: Run the comprehensive validation loop

**Files:**

- Verify: all modified files
- Inspect: `test-results/**/*.png`

- [ ] **Step 1: Run production and static verification**

```bash
CI=true pnpm build
pnpm check
```

Expected: Astro builds five routes and the static verifier exits `0`.

- [ ] **Step 2: Run the complete browser suite**

```bash
pnpm check:browser
```

Expected: every browser test passes with no retries.

- [ ] **Step 3: Re-run the geometry audit**

Use Playwright at `1440x1000`, `1024x768`, `768x1024`, `844x390`, and
`390x844` to record:

```js
{
  zoom: getComputedStyle(document.body).zoom,
  pageHeight: document.documentElement.scrollHeight,
  sections: Array.from(document.querySelectorAll('main > section, main > aside'))
    .map((element) => ({
      id: element.id || element.className,
      height: Math.round(element.getBoundingClientRect().height),
    })),
}
```

Expected:

- homepage zoom is `1.16` at widths `768px` and above;
- non-homepage zoom remains `1`;
- `844x390` homepage hero is below `700px`;
- `844x390` GitHub hero is below `620px`;
- `844x390` Quick Start hero is below `760px`; and
- no route has horizontal overflow above one pixel.

- [ ] **Step 4: Inspect generated screenshots**

```bash
find test-results -type f -name '*.png' -print | sort
```

Open dark and light screenshots for every visual-matrix viewport. Confirm:

- no clipped text, cards, buttons, sticky header, or feedback control;
- medium-width story snapshots sit beside their copy;
- short-landscape heroes use two columns without overlap;
- homepage scale remains visually consistent across header, main, footer, and
  feedback launcher;
- mobile remains single-column and readable; and
- reveal targets are visible in full-page captures.

- [ ] **Step 5: Run final diff checks**

```bash
git diff --check
git status --short
git --no-pager diff --stat HEAD~4..HEAD
```

Expected: no whitespace errors, no unrelated files, and only the planned source,
test, and documentation files changed.

- [ ] **Step 6: Commit any final test-only adjustment**

Only if validation required a test threshold correction that reflects verified
browser geometry:

```bash
git add tests/landing.spec.ts
git commit -m "test: finalize responsive scroll contracts" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 7: Confirm the clean handoff**

```bash
git --no-pager log -5 --oneline
git status --short --branch --untracked-files=all
```

Expected: the implementation commits are present and the working tree is clean.
