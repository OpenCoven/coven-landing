# Comprehensive Quickstart Design

**Date:** 2026-07-26  
**Status:** Approved for implementation under the autonomous quickstart objective

## Outcome

Create a dedicated `/quickstart` page that lets a new visitor choose any
first-party OpenCoven product and reach a clearly identified first success
without having to infer how the products relate.

The page succeeds when it:

- covers Coven CLI, Coven Code, Coven Cave, CastCodes, and OpenCoven for GitHub;
- distinguishes products, platforms, maturity, prerequisites, and ideal users;
- gives each product a short ordered path with copyable commands or direct
  actions;
- states what success looks like and where to recover when a step fails;
- links to canonical product docs, releases, repositories, or beta signup;
- remains useful without JavaScript and works with keyboard, screen reader,
  reduced-motion, light-theme, and narrow-screen settings; and
- is discoverable from the header, mobile menu, footer, homepage quickstart,
  sitemap, and page metadata.

## Validation Loop

1. Compare product instructions against current OpenCoven repositories and
   canonical docs.
2. Build the static Astro site and run the repository's static-output checks.
3. Add static assertions for the quickstart route, product coverage, primary
   commands, and canonical destination links.
4. Start the built preview and verify the route and anchor targets over HTTP.
5. Inspect desktop and mobile renders, including light and dark themes.
6. Exercise keyboard navigation, native disclosure controls, and every copy
   button; confirm the page remains complete with JavaScript disabled.

## Product Scope

The page covers the five user-facing products currently represented by the
OpenCoven website, documentation, or public product repositories:

| Product | First success | Availability posture |
| --- | --- | --- |
| Coven CLI | A recorded, project-scoped harness session appears in `coven sessions --plain` | Recommended foundation; npm package |
| Coven Code | The coding TUI connects to a provider and completes a first task | Beta; installed and managed by the unified `coven` CLI |
| Coven Cave | The native app opens and connects to the local Coven daemon | macOS, Windows, Linux; iOS via TestFlight |
| CastCodes | A local project opens and a Coven-backed session is visible for review | Linux preview |
| OpenCoven for GitHub | An assigned issue produces visible Check Run or status activity | Hosted beta or advanced self-hosting |

Experimental libraries, internal infrastructure repositories, SDKs, and
research projects are outside this onboarding page. They remain discoverable
through the OpenCoven organization and product documentation.

## Approaches Considered

### 1. Dedicated onboarding hub — selected

Add `/quickstart`, keep the homepage's existing three-command module as a
compact preview, and route all navigation to the full hub.

**Why:** The content can be comprehensive without overwhelming the landing
page. Each product gets a stable anchor, SEO metadata, and a complete success
loop. The hub can grow as product availability changes.

### 2. Expand the homepage quickstart

Replace the existing three cards with all product guides inline.

**Trade-off:** Fewer clicks, but five onboarding paths would interrupt the
landing narrative, increase homepage weight, and make deep links less useful.

### 3. Send users directly to documentation

Change "Quick Start" navigation to the existing docs getting-started guide.

**Trade-off:** Minimal landing-site code, but the docs currently lead with the
runtime and do not provide one product-choice surface. New users would still
need to understand the ecosystem before choosing a path.

## Information Architecture

The page reads top to bottom as a decision followed by execution:

1. **Hero:** Sets the promise: choose a product and reach a verifiable first
   success. It includes a compact "foundation" note explaining that Coven is
   the shared local substrate.
2. **Product chooser:** Five anchor cards show purpose, best fit, platform,
   status, and estimated setup shape. Cards do not filter or hide content.
3. **Shared foundation:** A small prerequisite panel explains Git, provider
   authentication, local-first behavior, and when the Coven runtime is needed.
4. **Product guides:** Five complete sections, each with:
   - identity, status, platform, and best-for summary;
   - prerequisites;
   - ordered steps with copyable commands or direct-action links;
   - a prominent success check;
   - concise troubleshooting guidance;
   - canonical docs/source/download links.
5. **Cross-product next step:** Explains that users can add another surface
   without losing their Coven session history.
6. **Support:** Links to docs, GitHub issues, and Discord without presenting
   community signup as a setup requirement.

## Content Rules

- Prefer released behavior and current canonical docs over aspirational
  language.
- Mark beta, preview, TestFlight, hosted-waitlist, and self-hosting paths
  explicitly.
- Never imply that Coven owns provider credentials; Codex, Claude Code, and
  Coven Code provider authentication remain provider-owned.
- Recommend the unified `@opencoven/cli` path for Coven Code while linking the
  direct engine install as an advanced alternative.
- Do not present Cast Code grammar as stable onboarding syntax.
- Keep GitHub self-hosting concise and route operators to the canonical
  security and registration guide rather than duplicating it.
- Every shell sequence includes a visible expected result or success check.
- Product links use current canonical locations:
  `docs.opencoven.ai`, `OpenCoven/coven`, `OpenCoven/coven-code`,
  `OpenCoven/coven-cave`, `OpenCoven/cast-codes`, and
  `OpenCoven/coven-github`.

## Component and Data Boundaries

### `src/data/quickstart.ts`

Owns typed product content: identifiers, labels, summaries, metadata, steps,
success checks, troubleshooting items, and external links. Commands remain
plain strings so display and copied values cannot drift.

### `src/components/QuickstartProduct.astro`

Renders one product guide from the typed content. It owns no product-specific
logic. Native ordered lists and `<details>` elements preserve no-JavaScript
usability.

### `src/pages/quickstart.astro`

Owns the route shell, SEO/structured metadata, hero, chooser, shared
foundation, product-guide composition, and closing help panel. It reuses the
existing Header, MobileNav, Footer, Ambient, ThemeInit, fonts, and main script.

### Existing navigation and homepage

Header, mobile menu, and footer Quick Start links point to `/quickstart`.
The homepage section remains a fast CLI preview and adds a clear link to all
product guides.

### Styling

Add route-specific styles to the existing global stylesheet using a
`quickstart-page` namespace. Reuse existing color, spacing, panel, focus,
typography, light-theme, and motion tokens. The visual direction is an
onboarding "mission map": product sigils and a subtle threaded route connect
selection to verified arrival without introducing a new brand language.

## Interaction and Accessibility

- Chooser cards are ordinary anchor links, not JavaScript tabs.
- Product headings receive stable IDs and `scroll-margin-top` for the sticky
  header.
- Copy controls reuse the existing `.qs-copy[data-copy]` behavior and shared
  live region.
- Clipboard absence leaves commands selectable and readable.
- Troubleshooting uses native `<details>` and `<summary>`.
- Decorative sigils and route lines are hidden from assistive technology.
- Status, platform, and success information is text, never color alone.
- Focus order follows document order; no content is visually reordered ahead
  of its heading.
- Responsive behavior moves from a five-card desktop grid to two columns and
  then one column while preserving the same content.

## Error and Recovery Design

Each guide addresses only the highest-frequency blocker:

- CLI: command missing, harness missing, or rejected project root.
- Coven Code: provider not connected or stale binary on `PATH`.
- Cave: daemon unavailable or unsupported install channel.
- CastCodes: wrong Linux package, checksum failure, or daemon unavailable.
- GitHub: hosted access not yet granted, App permissions/configuration
  incomplete, or unsigned webhook smoke test behavior misunderstood.

Errors are never hidden behind optimistic success copy. Advanced recovery
routes link to canonical troubleshooting or self-hosting documentation.

## Verification Changes

Extend `scripts/verify-static.mjs` to require `dist/quickstart/index.html` and
assert:

- all five product headings are present;
- the canonical CLI install and first-session commands are present;
- Cave, CastCodes, GitHub adapter, docs, releases, and TestFlight destinations
  are present;
- success-check language is rendered; and
- global navigation points to `/quickstart`.

No new test runner or browser dependency is introduced.

## Non-Goals

- Rewriting product documentation.
- Building an account system, setup wizard, or persisted checklist.
- Detecting installed local products from the browser.
- Claiming cross-platform support that current release artifacts do not show.
- Onboarding every repository in the OpenCoven organization.
- Changing product packaging, provider authentication, or runtime behavior.
