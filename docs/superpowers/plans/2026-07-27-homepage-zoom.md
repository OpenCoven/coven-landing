# Homepage 116% Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the complete homepage at 116% scale on viewports 768px and wider while keeping mobile and every non-homepage route at 100%.

**Architecture:** Scope the behavior with a class on the homepage `<body>`, then apply the layout-aware CSS `zoom` property behind the approved `min-width: 768px` media query. A focused Playwright contract test locks the breakpoint, exact computed scale, and route isolation; the existing visual matrix supplies dark/light screenshots and horizontal-overflow coverage.

**Tech Stack:** Astro 5, CSS, Playwright, pnpm

---

## File Map

- Modify `tests/landing.spec.ts`: add the exact responsive scale and route-isolation browser contract.
- Modify `src/pages/index.astro`: identify only the homepage document body.
- Modify `src/styles/global.css`: own the page-scoped 116% rule next to the existing body foundation styles.

No component, JavaScript, content, route, or design-token file changes.

### Task 1: Add and verify the responsive homepage scale

**Files:**

- Modify: `tests/landing.spec.ts:1572`
- Modify: `src/pages/index.astro:85`
- Modify: `src/styles/global.css:92-106`
- Reference: `docs/superpowers/specs/2026-07-27-homepage-zoom-design.md`

- [ ] **Step 1: Write the failing browser contract**

Insert this test immediately before the existing `visualMatrix` declaration in
`tests/landing.spec.ts`:

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
    const routeBody = page.locator('body');
    await expect(routeBody).not.toHaveClass(
      /(?:^|\s)home-page(?:\s|$)/,
    );
    await expect(routeBody).toHaveCSS('zoom', '1');
  }
});
```

This test fixes the approved mobile sample and the two boundary values
explicitly: 390px and 767px remain at 100%, while 768px switches to 116%. The
wider checks prevent the rule from being limited to a narrow tablet range, and
the route loop prevents the global stylesheet from changing any other page.

- [ ] **Step 2: Build the unchanged site and prove the new contract fails**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts --grep "homepage applies 116% scale only"
```

Expected: the build succeeds, then the focused Playwright test fails because
the homepage body does not yet have the `home-page` class and the 768px+
computed zoom remains `1`.

- [ ] **Step 3: Scope the behavior to the homepage**

In `src/pages/index.astro`, replace the opening body tag:

```astro
<body>
```

with:

```astro
<body class="home-page">
```

Do not add the class to shared components or any other route.

- [ ] **Step 4: Apply the approved layout-aware scale**

In `src/styles/global.css`, immediately after the base `body` rule, add:

```css
    @media (min-width: 768px) {
      body.home-page {
        zoom: 116%;
      }
    }
```

Keep the selector body-scoped so the shared stylesheet remains safe for
`/quickstart`, `/github`, `/privacy`, and `/terms`. Do not add a transform or a
JavaScript fallback; unsupported browsers should retain the current 100%
layout.

- [ ] **Step 5: Rebuild and prove the focused contract passes**

Run:

```bash
CI=true pnpm build
pnpm exec playwright test tests/landing.spec.ts --grep "homepage applies 116% scale only"
```

Expected: the focused Chromium test passes. The computed body zoom is `1` at
390px/767px, `1.16` at 768px/1024px/1440px, and `1` on every non-homepage
route.

- [ ] **Step 6: Run the complete repository verification**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser
```

Expected:

- Astro completes the static production build without warnings or errors.
- `pnpm check` exits 0 after verifying the homepage, GitHub page, and
  comprehensive quickstart contracts.
- The complete Chromium suite exits 0 with no failures or retries.
- Every dark/light entry in the existing visual matrix reports horizontal
  overflow of at most one pixel.

- [ ] **Step 7: Inspect the generated responsive evidence**

List the screenshots emitted by the visual-matrix tests:

```bash
find test-results -type f \
  \( -name 'desktop-*.png' \
  -o -name 'small-desktop-*.png' \
  -o -name 'tablet-*.png' \
  -o -name 'mobile-*.png' \) \
  -print | sort
```

Open the dark and light screenshots for desktop (1440px), small desktop
(1024px), tablet (768px), and mobile (390px). Confirm:

- the 116% layouts retain a complete header, hero, content column, footer, and
  feedback launcher;
- no text, control, panel, or focusable navigation target is clipped;
- sticky and fixed elements remain aligned to their intended edges;
- the 390px layout retains its previous 100% composition; and
- dark and light themes show the same geometry.

If any 116% screenshot clips content despite the automated overflow assertion,
stop and report the exact viewport and element instead of widening the patch
with component-specific overrides.

- [ ] **Step 8: Verify the final patch is minimal**

Run:

```bash
git diff --check
git diff -- tests/landing.spec.ts src/pages/index.astro src/styles/global.css
git status --short
```

Expected: no whitespace errors, and the implementation diff contains only the
new Playwright contract, the one homepage body class, and the one responsive
CSS rule.

- [ ] **Step 9: Commit the verified implementation**

Run:

```bash
git add tests/landing.spec.ts src/pages/index.astro src/styles/global.css
git commit -m "style: enlarge homepage at wider viewports"
```

Expected: the repository secret scan passes and Git creates one implementation
commit containing the test and its minimal production change.

- [ ] **Step 10: Confirm the handoff state**

Run:

```bash
git show --stat --oneline --decorate HEAD
git status --short --branch --untracked-files=all
```

Expected: the implementation commit contains only the three intended files and
the working tree is clean. Do not push or merge unless Val explicitly requests
that separate delivery step.
