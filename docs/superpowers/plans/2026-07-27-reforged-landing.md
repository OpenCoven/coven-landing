# Reforged Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/` with a faithful, accessible Astro implementation of the approved Claude Design Reforged landing page.

**Architecture:** Server-render section components from typed landing data, style
them through one page-scoped CSS file, and add one progressive-enhancement
controller for scroll state, selection, and copy controls. Preserve the other
four routes and their shared files.

**Tech Stack:** Astro 5, TypeScript data modules, self-hosted variable fonts,
browser DOM APIs, Playwright, axe-core.

---

### Task 1: Pin the Reforged contract with failing tests

**Files:**
- Modify: `scripts/verify-static.mjs`
- Modify: `tests/landing.spec.ts`

- [x] Replace legacy homepage copy/structure assertions with the new ordered
  markers: `#top`, `#threshold`, `#runtimes`, `#boundary`, `#surfaces`,
  `#invocation`, `#summon`.
- [x] Assert the exact hero heading, three commands, three surface names, seven
  runtime names, seven `/reforged/` image paths, no editor-only “video slot”
  copy, and no eager third-party runtime.
- [x] Add Playwright cases for runtime command selection, three accessible
  boundary tabs, product-card expansion, invocation step selection, clipboard
  failure guidance, no-JavaScript content, reduced motion, axe, and overflow.
- [x] Run `/opt/homebrew/bin/pnpm build && /opt/homebrew/bin/pnpm check` and
  confirm the static check fails because the old page lacks `#threshold`.
- [x] Run
  `/opt/homebrew/bin/pnpm exec playwright test tests/landing.spec.ts -g "Reforged"`
  and confirm the focused browser contract fails because the new selectors are
  absent.

### Task 2: Add production assets and typed content

**Files:**
- Create: `public/reforged/claude-code-mascot.png`
- Create: `public/reforged/codex-3d.png`
- Create: `public/reforged/grok-3d.png`
- Create: `public/reforged/openclaw-mascot.png`
- Create: `public/reforged/opencode-3d.png`
- Create: `public/reforged/hermes-agent.png`
- Create: `public/reforged/github-copilot.png`
- Create: `src/data/reforged.ts`

- [x] Copy the seven selected exported files byte-for-byte and verify them with
  `shasum -a 256` against their handoff sources.
- [x] Define `runtimeHarnesses`, `boundaryLayers`, `surfaces`, and
  `invocationSteps` with the literal source copy, stable IDs, asset paths, and
  exact commands.
- [x] Run the static check and confirm asset assertions now pass while section
  assertions remain red.

### Task 3: Build the semantic page sections

**Files:**
- Create: `src/components/reforged/ReforgedHeader.astro`
- Create: `src/components/reforged/ReforgedHero.astro`
- Create: `src/components/reforged/Threshold.astro`
- Create: `src/components/reforged/RuntimeMarquee.astro`
- Create: `src/components/reforged/Boundary.astro`
- Create: `src/components/reforged/Surfaces.astro`
- Create: `src/components/reforged/Invocation.astro`
- Create: `src/components/reforged/Summoning.astro`
- Create: `src/components/reforged/ReforgedFooter.astro`
- Modify: `src/pages/index.astro`

- [x] Render each approved narrative section with source-order headings,
  complete static fallback content, real buttons/links, and stable `data-*`
  hooks.
- [x] Preserve homepage metadata and structured data, update descriptions to
  the approved familiar/local-runtime copy, and import only the Reforged
  homepage files.
- [x] Build and run `pnpm check`; confirm the semantic/source contract is green
  before styling interactions.

### Task 4: Reproduce the approved visual system responsively

**Files:**
- Create: `src/styles/reforged.css`
- Modify: `src/pages/index.astro`

- [x] Add page-scoped tokens, fixed mist/dot layers, typography, progress line,
  brand pill, hero card/portal, threshold aperture, marquee, chapter panels,
  3D boundary stack, surface cards, terminal, closing card, and footer.
- [x] Implement desktop pinned heights from the source (`300vh`, `190vh`,
  `340vh`, `280vh`) while keeping their sticky children bounded to `100svh`.
- [x] Add `900px`, `700px`, and `520px` breakpoints that remove sticky/pinned
  choreography, linearize panels, wrap hero downloads, and preserve 44px touch
  targets.
- [x] Add visible focus states and a reduced-motion block that removes all
  transforms/animations and restores normal document flow where needed.
- [x] Run the focused Reforged browser tests until static layout, mobile
  readability, axe, and overflow assertions pass.

### Task 5: Add progressive interaction

**Files:**
- Create: `src/scripts/reforged.js`
- Modify: `src/pages/index.astro`

- [x] Implement one requestAnimationFrame scroll coordinator for progress,
  threshold aperture, boundary active layer, surfaces spotlight, and invocation
  active step.
- [x] Implement click/keyboard selection for runtime, boundary, surfaces, and
  invocation without hiding unselected fallback content before enhancement.
- [x] Implement robust copy behavior: latest request wins, success announces the
  exact command, failure selects code and renders manual-copy guidance.
- [x] Gate enhancement classes on successful controller wiring, feature-detect
  clipboard and matchMedia, and keep reduced-motion transforms disabled.
- [x] Run the focused browser suite and then the complete suite.

### Task 6: Visual critique and completion audit

**Files:**
- Inspect: `src/pages/index.astro`
- Inspect: `src/styles/reforged.css`
- Inspect: `src/scripts/reforged.js`
- Inspect: `tests/landing.spec.ts`
- Modify only the inspected file whose rendered evidence contradicts the
  approved source or verification contract.

- [x] Build and serve the production output.
- [x] Capture 1440×1000 and 390×844 screenshots for the hero, boundary,
  surfaces, invocation, and summoning sections.
- [x] Compare hierarchy, colors, type, spacing, panel dimensions, active states,
  and scroll transitions against `OpenCoven Landing - Reforged.dc.html`.
- [x] Remove one nonessential decoration if the page reads busier than the
  source; preserve the threshold as the single signature moment.
- [x] Run fresh final verification:
  `/opt/homebrew/bin/pnpm build`,
  `/opt/homebrew/bin/pnpm check`,
  `/opt/homebrew/bin/pnpm check:browser`, and `git diff --check`.
- [x] Audit every named asset and objective requirement against the worktree,
  then report any remaining proof gap without claiming completion.
