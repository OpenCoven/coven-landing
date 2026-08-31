# Landing vNext release-gate matrix

The landing uses three deliberately separate evidence layers. Passing one layer never implies that another layer passed.

## 1. Fast pull-request gate

**Workflow:** `.github/workflows/ci.yml`  
**Command:** `pnpm check:browser`  
**Engine:** Desktop Chromium  
**Purpose:** inexpensive, deterministic feedback on every pull request.

This gate runs unit tests, the static build, truth and registry checks, analytics and legal checks, the complete Chromium Playwright suite, Axe coverage, no-JavaScript coverage, 320px reflow, forced-colors emulation, target-size checks, reduced-motion checks, and 200% text-size checks.

When the browser step fails, CI uploads `playwright-report/` and `test-results/` rather than leaving only a red status.

## 2. Curated cross-engine release gate

**Workflow:** `.github/workflows/release-gates.yml`  
**Command:** `pnpm check:release`  
**Config:** `playwright.release.config.ts`

| Project | Engine/device profile | Primary coverage |
|---|---|---|
| `release-chromium` | Desktop Chrome | routes, metadata, themes, navigation, reduced motion, no JS |
| `release-firefox` | Desktop Firefox | same curated public-surface contract |
| `release-webkit` | Desktop Safari/WebKit | same curated public-surface contract |
| `release-mobile-chromium` | Pixel 5 profile | mobile navigation, reflow, touch-oriented public routes |
| `release-mobile-webkit` | iPhone 13 profile | Safari/WebKit mobile behavior and static fallback |

The workflow uses one matrix job per project, installs only the required browser engine, builds one static candidate, and uploads HTML, JUnit, trace, screenshot, and retained-on-failure video evidence with `if: always()`.

This suite is intentionally smaller than the complete Chromium suite. It validates the highest-risk browser-independent contracts without multiplying every detailed test across five environments.

## 3. Empirical release evidence

**Template:** `docs/release/accessibility-evidence-template.md`

The following remain human/device gates:

- VoiceOver with Safari on macOS.
- NVDA with Firefox or Chrome on Windows.
- VoiceOver with Safari on a supported iPhone.
- TalkBack with Chrome on a supported Android device.
- Real Windows High Contrast behavior.
- Real supported installer/download flows on macOS, Windows, and Linux.
- Moderated first-time-user comprehension.
- Preview deployment and rollback rehearsal.
- Production observation under the approved privacy model.

Automated WebKit is not a substitute for physical Safari. Forced-colors emulation is not a substitute for Windows High Contrast. An Axe pass is not screen-reader sign-off.

## Local commands

```bash
pnpm install --frozen-lockfile
CI=true pnpm build
pnpm check
pnpm check:browser
pnpm check:accessibility
pnpm check:release
```

To run one release project:

```bash
pnpm exec playwright install --with-deps firefox
pnpm check:release --project=release-firefox
```

## Failure policy

A release-gate failure must preserve diagnostics and block the relevant merge or release decision. Do not rerun until green without first recording whether the failure was:

- product behavior;
- browser compatibility;
- accessibility;
- test flake;
- runner/environment failure; or
- an invalid expectation.

Any narrowed or quarantined test requires a linked issue, owner, rationale, and expiry. Manual evidence remains `unverified` until a named tester records a real receipt.
