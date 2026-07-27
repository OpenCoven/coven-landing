# Homepage 116% Zoom Design

**Date:** 2026-07-27

**Status:** Approved for implementation

## Outcome

Increase the visual scale of the complete OpenCoven homepage to 116% on tablet
and desktop viewports while preserving the existing mobile composition.

The change succeeds when:

- the homepage header, content sections, footer, and fixed feedback control all
  render at a uniform 116% scale at viewport widths of 768px and above;
- viewports below 768px retain the current 100% scale;
- `/quickstart`, `/github`, `/privacy`, and `/terms` remain unchanged;
- the enlarged homepage does not introduce horizontal scrolling, clipped
  controls, or inaccessible navigation; and
- the existing static and browser verification suites still pass.

## Responsive Contract

The scale is page-specific and breakpoint-specific:

| Viewport width | Homepage scale |
| --- | --- |
| Below 768px | 100% |
| 768px and above | 116% |

The 768px boundary aligns with the existing 767px narrow-layout cutoff used by
several homepage sections while protecting the dedicated phone layouts. The
change does not modify the viewport meta tag or the user's browser zoom.

## Approaches Considered

### 1. Page-scoped CSS `zoom` — selected

Apply a homepage-only class to the document body and set `zoom: 116%` inside a
`min-width: 768px` media query.

**Why selected:** CSS `zoom` uniformly magnifies inherited type, fixed pixel
dimensions, spacing, panels, and controls while participating in layout. It
expresses the requested whole-page increase in one isolated rule and leaves
unsupported browsers at the existing 100% presentation.

### 2. Manually enlarge typography and layout values

Increase root type, gutters, section spacing, maximum widths, and component
dimensions separately.

**Trade-off:** This allows component-by-component tuning but does not produce a
uniform increase in a codebase that mixes `rem`, `px`, viewport units, and
percentages. It would also create a broad, fragile patch.

### 3. Transform the complete page

Wrap the page and apply `transform: scale(1.16)`.

**Trade-off:** A transform changes painting without recalculating document
flow. It risks clipping, incorrect scroll geometry, and misplaced fixed or
sticky controls, so it is not suitable for page-level magnification.

## Implementation Boundary

`src/pages/index.astro` will add a homepage-specific class to `<body>`.
`src/styles/global.css` will own the responsive 116% rule. No component markup,
copy, JavaScript behavior, design token, navigation route, or non-homepage
style will change.

The existing source order and interaction architecture remain intact:

- the sticky header remains the first visual navigation surface;
- `main`, all homepage sections, and the footer remain in normal document flow;
- the fixed feedback launcher remains viewport-anchored; and
- the current mobile navigation and progressive fallbacks remain unchanged.

## Accessibility and Compatibility

- Native browser zoom remains available in addition to the page's visual scale.
- Focus order, landmark order, semantic structure, and control labels do not
  change.
- The mobile layout remains at its current scale to preserve its dedicated
  touch and typography sizing.
- Browsers without CSS `zoom` support receive the existing 100% layout rather
  than a transformed fallback.

## Verification

Before the implementation is considered complete:

1. Run `npm run build`.
2. Run `npm run check`.
3. Run `npm run check:browser`.
4. Verify dark and light homepage renders at 1440px, 1024px, and 768px.
5. Verify the homepage remains unchanged at 390px.
6. At every inspected width, confirm:
   - `document.documentElement.scrollWidth` does not exceed the viewport;
   - the header, primary calls to action, theme control, and feedback launcher
     remain visible and operable;
   - the sticky and fixed positioning behavior remains correct; and
   - non-homepage routes retain their original computed scale.

## Non-Goals

- Rebalancing individual components after magnification.
- Changing copy, colors, animation, content order, or responsive breakpoints.
- Applying the scale to non-homepage routes.
- Replacing or restricting user-controlled browser zoom.
