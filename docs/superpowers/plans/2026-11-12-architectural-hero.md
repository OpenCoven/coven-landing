# Architectural Hero Integration and Review

**Goal:** Deliver the approved architectural hero onto current main while preserving canonical public behavior.

**Spec:** `docs/superpowers/specs/2026-11-12-architectural-hero-design.md`

- [x] Audit divergence between the original landing-based candidate and current main.
- [x] Merge main without force-pushing; construct the integration tree from main, then add only the hero feature.
- [x] Preserve canonical claims, products, commands, static proof, theme/navigation, metadata, native downloads, privacy and support routes.
- [x] Reproduce Copilot's asynchronous visibility finding, repair the post-import guard, and verify retry on visibility restoration.
- [x] Preserve deletion of obsolete landing wrappers and CSS rather than reintroducing the reported mobile-gutter defect.
- [x] Run frozen install, build, complete static/contract checks, unit suite and full browser suite.
- [x] Obtain independent final review and rendered main-specific evidence.

Node 22.23.5 / pnpm 10.34.9: frozen install, build, all static/brand/UI/truth/privacy/release-gate checks, 20 API/Worker tests and 112 browser tests passed. Browser retries were disabled; there were no failures or skips. A temporary Playwright config changed only the preview port to 4182 because 4173 was already occupied; the committed canonical test configuration remains unchanged.

The delayed-import regression was observed failing before the visibility guard fix and passing in the full suite afterward. Independent review found no further material code issues. Receipts remain in `/tmp/hero-main-final-checks.log`, `/tmp/hero-main-race-red.log`, `/tmp/hero-main-1920.png`, `/tmp/hero-main-320.png` and ignored Playwright reports/traces.

Delivery gate: retarget PR #122 to main, publish the integration head, reply to and resolve both Copilot threads, qualify exact-head hosted checks, and merge through the normal GitHub path under the user's explicit authorization. Do not change production branch configuration or merge unrelated landing work.

Hosted review follow-up: the first main head failed Firefox's runtime-error gate when WebGL2 was unavailable. The fallback stayed visible, but Three logged constructor errors. A capability probe now obtains the context before constructing Three and supplies that same context to the renderer. The unavailable-context regression was strengthened to require zero console errors, observed failing before the fix and passing afterward. The full local 112-case suite passed with the preflight fix; all 13 hero cases passed again after correcting the phone assertion to require action-before-art and action within the first viewport, rather than the obsolete legacy 600 px cutoff. Linux's retained screenshot showed the action at 774 px within the 900 px viewport. The canonical copy and readable type sizes remain intact.

Receipts for the follow-up are `/tmp/hero-context-red.log`, `/tmp/hero-main-context-checks.log`, `/tmp/hero-final-fix-checks.log`, `/tmp/hero-firefox.log`, `/tmp/hero-ci-build.log`, and `/tmp/hero-ci-phone.png`. A local Firefox launch could not qualify the fix because macOS SWGL failed to map its framebuffer; exact-head hosted Firefox qualification is required instead.
