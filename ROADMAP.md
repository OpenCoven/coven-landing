# Roadmap

## Current architecture

The active homepage and `how-it-works`, `privacy`, and `terms` routes use the
native Astro redesign stack under `src/components/redesign/` and
`src/scripts/redesign/`. The older `github` and `quickstart` routes still use
the earlier global component/style system and are tracked for consolidation.

The design-export migration pipeline is retired. New work happens in normal
Astro components and plain modules. Two framework-free boundaries remain:

- `public/warded-braid.js` — current WebGL hero, pending the static-first,
  capability-gated refactor in issue #77.
- `api/` — Vercel functions for browser-native download resolution,
  compatibility streaming, and CDN-cached public release/community metadata.

The browser-native `/download/:platform` contract is current. The active page
does not fetch installer bytes into JavaScript. `/stream/:platform` remains a
compatibility endpoint until its downstream/reference audit is complete.

Analytics is off by default. The only approved code path requires explicit
`events` mode and disables replay, heatmaps, broad autocapture, page-leave,
automatic pageview, and exception capture. Production activation still
requires the configuration/policy receipt in issue #69.

## Landing vNext program

Issue #85 is the coordinating epic. The program is a controlled consolidation,
not another visual restart.

### Phase 0 — baseline and branch reconciliation

- PRs #62, #63, and #64 were closed as superseded/no-op after final review.
- Baseline commit `bf67a6d682123c5c0fa90575d1f37ae6269154ab` passed CI and both Vercel deployments.
- The reproducible measurement report and rollback receipt remain tracked by #67/#78.

### Phase 1 — correctness and trust

- Privacy-safe analytics guardrail landed in #86.
- Browser-native downloads landed in #87.
- Public truth/onboarding and fallback cleanup continues in #68.
- The broader repository-driven legal/compliance package remains #66.

### Phase 2 — positioning and canonical data

- #70 ratifies public positioning and the capability-maturity claim matrix.
- #71 replaces duplicated product/onboarding arrays with one typed active,
  archived, destination, evidence, and verification registry.
- Removing CastCodes from the current Quickstart contract is a required #71
  migration, not accepted as current product truth.

### Phase 3 — shared foundation

- #72 creates one Astro shell, navigation, footer, theme, SEO, and route metadata system.
- `OpenCoven/brand#2` exports the canonical web surface profile.
- `OpenCoven/ui#4` publishes framework-neutral interaction contracts.
- #73 consumes those contracts without adding a client framework.
- #74 removes inline-style responsive coupling and consolidates the three CSS eras.

### Phases 4–8

- #75 static-first vNext homepage.
- #76 semantic collision → hold → principal-decision proof.
- #77 optional, local, gated, pausable WebGL braid.
- #78 complete performance budgets and privacy-safe Core Web Vitals monitoring.
- #79–#80 product, protocol, legal, security, and maturity route unification.
- #81 WCAG 2.2 AA implementation and manual receipts.
- #82 cross-browser, visual, truth, failure-mode, privacy, and preview release gates.
- #83 staged release, comprehension testing, platform validation, and rollback.
- #84 irreversible legacy cleanup only after stable production evidence.

## Verification contract

Current required commands:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser
```

The contract covers static assets and public copy, analytics mode and
provisioning, browser-native downloads, primary interactions, current
fallbacks, and browser behavior. It will progressively move from historical
string pinning to registry, semantic, accessibility, visual, and complete
performance contracts under #71 and #82.

## Non-negotiable direction

- One public product and onboarding registry.
- One site shell and token source.
- No stale command, unsupported claim, or nonexistent destination.
- No active CastCodes recommendation.
- No page-memory installer buffering.
- No session replay or heatmaps without a separately approved model.
- No essential dependence on JavaScript or WebGL.
- No fourth design/CSS era.
- No irreversible cleanup before the staged-release rollback gate passes.
