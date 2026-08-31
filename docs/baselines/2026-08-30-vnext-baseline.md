# OpenCoven landing vNext canonical baseline

- **Decision date:** 2026-08-30
- **Baseline owner:** `OpenCoven/coven-landing`
- **Selected implementation:** `main`
- **Selected source revision before this evidence PR:** `4fa92a9871b6329a28846d50bce0f52d36db65a4`
- **Primary tracking issue:** #67
- **Program issue:** #85
- **Status:** canonical starting point for the independently deployable vNext PR stack

## Decision

The landing vNext program continues from the current Astro implementation on
`main`. No historical redesign branch, fork, Reforged route, or simulated
application branch is a competing baseline.

The selected revision contains the immediate trust work that must not be
reintroduced independently:

- explicit privacy-safe analytics mode and event schema;
- browser-native Cave downloads;
- public-truth and qualitative proof fallbacks;
- accepted public positioning and capability-maturity decision;
- optional Cloudflare installer streaming behind the native download contract;
- the first typed public product/onboarding registry and active/archive split.

Every subsequent issue-primary PR must rebase on current `main`, consume those
contracts, remain independently deployable, and preserve a direct rollback.

## Open-work reconciliation

### PR #62 — superseded

The older sponsorship/download implementation was based on a previous landing
generation and overlapped the downloader, public-truth, and current release
work. Useful intent was reimplemented against current `main` through #87, #88,
#90, and #92. It is not a source branch for vNext.

### PR #63 — superseded

The draft combined stale-base work with changes that now have narrower,
reviewable successors. It is not merged wholesale because doing so would revive
obsolete route, downloader, or design-era assumptions.

### PR #64 — closed with no active delta

The branch no longer carried a meaningful destination-relative change. It is
not an implementation or test authority.

### PR #91 — superseded without losing code

GitHub's ready-for-review connector mutation failed on an unrelated GraphQL
schema field. The exact reviewed and CI-green commit was moved byte-for-byte to
an organization-owned branch and merged through #92. PR #91 is therefore a
documented duplicate, not abandoned implementation.

### Active authority

- `main` is the only active public implementation baseline.
- `.github/workflows/ci.yml` is the merge-time source/static/browser gate.
- `.github/workflows/baseline.yml` produces measured route, dependency,
  screenshot, accessibility, runtime, link, and Lighthouse evidence.
- `AGENTS.md` is the repository work router.
- `docs/decisions/2026-08-30-public-positioning-and-claims.md`,
  `src/data/products.ts`, and `docs/public-truth-register.md` are the current
  public-truth hierarchy.

## Reproducible evidence contract

From a clean clone:

```bash
corepack enable
pnpm install --frozen-lockfile
CI=true pnpm build
pnpm check
pnpm test:unit
pnpm baseline:static
pnpm preview
```

With the preview reachable at `http://127.0.0.1:4173`, run:

```bash
pnpm baseline:browser
pnpm baseline:lighthouse
```

The baseline workflow performs the same sequence and uploads one immutable
artifact named for the PR/source SHA. Generated evidence remains outside source
control under `artifacts/baseline/`.

### Static evidence

`static.json` and `static.md` record:

- generated route inventory;
- canonical URL, description, and H1 counts;
- Vercel redirect/rewrite map;
- emitted file and route-level raw/gzip/Brotli sizes;
- initial CSS/JavaScript references, including query strings;
- remote dependency references;
- source-level command occurrences;
- serialized inline-style selector coupling;
- named public-truth sources.

### Browser evidence

`browser.json`, `browser.md`, and `screenshots/` record:

- homepage captures at 320, 360, 390, 430, 768, 1024, 1280, and 1440 px;
- light, dark, system, and reduced-motion states;
- representative mobile and desktop captures for every generated route;
- JavaScript-disabled route readability;
- axe findings;
- internal links and fragments;
- console, page, and failed-request observations;
- request/transfer entries and long-task observations;
- horizontal overflow;
- browser-reported WebGL, memory, and battery-API capability where exposed.

### Lighthouse evidence

The workflow stores full mobile and desktop Lighthouse JSON plus a bounded
summary covering performance, accessibility, best practices, SEO, FCP, LCP,
TBT, CLS, request count, task diagnostics, and transfer weight.

## Dependency and PR sequence

The issue graph in #85 remains canonical. In practical merge order:

1. baseline and immediate truth/privacy/download contracts;
2. positioning and typed product registry;
3. canonical shell, navigation, metadata, brand/UI integration, and CSS
   consolidation;
4. static-first homepage and semantic guided proof;
5. optional warded-braid enhancement and complete performance accounting;
6. product/onboarding and protocol/trust route unification;
7. accessibility and cross-browser release gates;
8. staged release, production evidence, and only then irreversible cleanup.

Parallel work may proceed when it does not fork public data, brand tokens,
interaction semantics, or claim ownership.

## Preview and rollback

### Site changes

Each PR receives an immutable preview deployment. A release can be reversed by
redeploying the last known-good `main` SHA; vNext cleanup must not delete that
recoverable implementation before #83 records a completed observation window.

### Optional installer Worker

Unset `DOWNLOAD_STREAM_ORIGIN` and its compatibility alias, then redeploy. The
browser-native `/download/:platform` route immediately returns to the direct
Vercel/GitHub resolver. Worker removal never requires landing-page code rollback.

### Analytics

Remove or disable the explicit approved analytics mode and redeploy. A key by
itself must not activate tracking. Primary content, navigation, downloads, and
onboarding remain usable when analytics is absent or unavailable.

### Irreversible cleanup

#84 is blocked until #83 explicitly records that rollback and observation gates
have passed. Legacy files may be classified or isolated earlier, but deletion
must retain one named recovery revision and zero-consumer evidence.

## Known baseline debt

The evidence is intended to make debt measurable, not to certify the current
site as complete. Known program work includes:

- route-private shell, metadata, font, and navigation composition;
- three historical CSS eras and inline responsive coupling;
- a Cave-dominant homepage and full board simulation;
- render-critical or incompletely counted enhancement dependencies;
- historical exact-string/video verification and its FFmpeg dependency;
- incomplete registry consumption outside Quickstart;
- incomplete cross-browser, accessibility, performance, and failure-mode gates;
- manual production, supported-platform, assistive-technology, and moderated
  comprehension evidence that cannot be inferred from headless Chromium.

Those items stay attached to #72–#84. A passing baseline capture is not a claim
that their acceptance criteria are already satisfied.

## Evidence limitations

CI provides deterministic lab evidence, not physical-device certification.
Battery drain, GPU cost, Safari/Firefox/WebKit behavior, VoiceOver/NVDA use,
macOS/Windows/Linux installation, production configuration, and first-time
visitor comprehension require the manual and staged receipts in #81 and #83.
Unsupported APIs are recorded as unavailable rather than silently treated as
passing measurements.
