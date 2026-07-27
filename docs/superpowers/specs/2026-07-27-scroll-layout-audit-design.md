# Comprehensive Scroll and Layout Audit Design

**Date:** 2026-07-27

**Status:** Approved for autonomous implementation

## Outcome

Review and correct the size, screen-space usage, and scroll-driven behavior of
the OpenCoven landing surfaces without replacing the site's restrained motion
language.

The work succeeds when:

- the approved homepage-wide `116%` scale applies at widths of `768px` and
  above, while mobile and non-homepage routes remain at `100%`;
- every scroll-triggered state resolves deterministically in both directions,
  including direct jumps and rapid scrolling;
- no reveal target remains hidden after entering the viewport;
- reduced-motion visitors receive complete content without motion-dependent
  delays;
- tablet and short-landscape layouts avoid avoidable one-column stacking and
  oversized empty regions;
- sticky, fixed, and anchored controls remain visible and correctly aligned;
- no inspected route introduces horizontal overflow; and
- the static build, browser suite, accessibility checks, and responsive visual
  matrix pass.

## Baseline Findings

The existing 64-test browser suite passes, but a direct scroll audit exposed a
real continuity-story defect. Scrolling forward selects:

`summoned -> learned -> moved -> returned`

Scrolling backward can skip stages:

`returned -> learned -> summoned`

The current `IntersectionObserver` callback paints every intersecting entry in
callback order. Adjacent tall stages can intersect the narrow activation band
at the same time, so callback ordering decides the final state.

The geometry audit also found avoidable vertical expansion:

- the homepage is `8,627px` tall at `844x390`;
- its hero is `912px` tall at that viewport because the copy and ledger stack;
- the continuity story is `2,712px` tall there because every stage stacks above
  a ledger snapshot;
- the compact homepage Quick Start is `1,236px` tall there because all three
  preview cards stack;
- the GitHub hero is `842px` tall at `844x390`; and
- the comprehensive Quick Start hero is `1,038px` tall at `844x390`.

These layouts are readable, but they underuse the available landscape width.

## Approaches Considered

### 1. Apply only the approved whole-page zoom

This is the smallest patch and correctly increases the homepage's visual scale.
It does not fix the reverse-scroll stage skipping and makes existing tall stacks
physically taller.

### 2. Replace all motion with a new scroll-animation system

A centralized timeline or animation library could coordinate every section.
This would conflict with the homepage's explicit no-blanket-reveal constraint,
increase JavaScript, weaken progressive fallback behavior, and create a broad
regression surface.

### 3. Targeted layout density plus deterministic controllers — selected

Keep the existing architecture and visual language. Apply the already-approved
homepage zoom, repair the two scroll controllers that write state, and add
responsive overrides only where the audit proves width is being wasted.

This approach fixes the root causes without adding a dependency or animating
previously static homepage content.

## Layout Design

### Homepage scaling

Add `class="home-page"` to the homepage body and apply `zoom: 116%` inside
`@media (min-width: 768px)`. The selector remains page-scoped. Unsupported
browsers retain the current layout.

### Continuity story

For enhanced desktop layouts, reduce each stage's oversized scroll runway while
retaining enough height for the sticky ledger to settle before the next state.

At medium widths where the sticky visual is disabled, use the available width:
stage copy and its compact ledger snapshot sit side by side. Narrow phones keep
the current stacked snapshot layout.

### Homepage Quick Start

At medium widths, use a two-column grid with the final preview step spanning the
row. Narrow phones remain single-column. This preserves readable commands while
removing one full card-height of unnecessary scrolling.

### Short-landscape heroes

At widths suitable for a split layout and heights at or below `520px`:

- the homepage hero keeps copy and ledger side by side with tighter vertical
  padding and type;
- the GitHub hero keeps copy and run preview side by side; and
- the comprehensive Quick Start hero keeps copy and mission trace side by side.

The breakpoint is orientation/height-aware, so portrait tablet and phone
layouts are unchanged.

### Dense supporting layouts

At medium or short-landscape widths:

- reduce excessive product-card minimum height where content already defines a
  sufficient height;
- keep comprehensive Quick Start prerequisites beside their steps when
  landscape width can support both columns; and
- reduce vertical section padding only for short landscape viewports.

Touch target minimums, content order, and text size floors remain unchanged.

## Scroll and Animation Design

### Continuity state selection

The continuity story keeps its progressive fallback: without
`IntersectionObserver`, all static snapshots remain visible and no enhanced
state is required.

When enhancement is available, observer notifications schedule one state sync
with `requestAnimationFrame`. The sync examines all stage rectangles and selects
the last stage whose top has crossed the activation line. It paints exactly one
state per frame, independent of observer entry order.

Anchor activation still paints immediately. Scroll, resize, hash jumps, large
wheel deltas, and reverse scrolling all converge on the same geometric rule.

### Header scroll state

Throttle the sticky-header state update through one animation frame and avoid
rewriting the class when the state has not changed. This preserves the existing
12px threshold while preventing repeated style invalidation during dense scroll
events.

### One-shot reveals

The homepage continues to contain no `data-reveal` attributes. GitHub and
Quick Start retain their existing one-shot reveal system. The audit will add
browser coverage that scrolls every reveal target into view at representative
viewport heights and proves it reaches visible, transform-free state.

Reduced-motion and no-observer fallbacks continue to mark reveal content visible
immediately.

## Accessibility and Progressive Fallbacks

- The DOM order, heading order, focus order, and link targets do not change.
- No content becomes dependent on JavaScript.
- Mobile snapshots and native disclosures remain available.
- The global reduced-motion rule continues to disable transitions and
  animations.
- Scroll state is visual enhancement only; the complete story remains readable
  without it.
- Touch targets remain at least `44px`.

## Verification

Implementation is complete only after:

1. A browser test proves continuity selection in forward and reverse order.
2. A browser test proves the homepage zoom boundary and route isolation.
3. Geometry tests prove the approved medium and short-landscape layouts.
4. Every `data-reveal` target on GitHub and Quick Start becomes visible after
   scrolling at desktop, mobile, and short-landscape heights.
5. Reduced-motion and no-observer fallbacks remain complete.
6. The complete viewport matrix has no horizontal overflow.
7. `CI=true pnpm build`, `pnpm check`, and `pnpm check:browser` pass.
8. Dark and light full-page screenshots are inspected at `1440x1000`,
   `1024x768`, `768x1024`, `844x390`, `390x844`, and `320x568`.

## Implementation Boundary

Expected production changes are limited to:

- `src/pages/index.astro`
- `src/styles/global.css`
- `src/components/Hero.astro`
- `src/components/ContinuityStory.astro`
- `src/components/ProductConstellation.astro`
- `src/components/QuickStart.astro`
- `src/scripts/main.js`
- `src/scripts/landing.js`

The browser contract changes live in `tests/landing.spec.ts`.

Copy, route order, product data, theme tokens, external dependencies, and legal
pages are out of scope.
