# OpenCoven landing vNext cutover — 2026-08-31

## Reconciliation

- PR #94 canonical shell/homepage is merged.
- PR #95 Quickstart/GitHub outputs were verified byte-identical on `main` despite divergent commit history.
- PR #96/#97 bookkeeping was stale: `main` still retained the legacy How-it-works and legal redesign routes. The cutover branch restores the trust-route architecture and canonical legal shell directly.

## Active route contract

The public route set is `/`, `/quickstart`, `/github`, `/how-it-works`, `/protocol`, `/security`, `/status`, `/privacy`, and `/terms`.

All routes use `SiteLayout`, canonical metadata, the canonical OpenCoven brand/UI contracts, static-first content, and bounded analytics behavior.

## Legacy retirement

The `src/components/redesign` implementation and `src/styles/redesign.css` are retired after their final consumers were migrated. The valid analytics snippet was moved to `src/components/PosthogSnippet.astro` before deletion.

## Required release gates

- unit tests
- production build
- static/truth/registry/analytics verification
- Playwright interaction and Axe coverage
- baseline evidence workflow
- per-route canonical, landmark, and JavaScript budget checks
- default-off analytics verification

## Human evidence still distinct

Manual assistive-technology receipts and moderated comprehension evidence remain human validation artifacts; they must not be fabricated by CI.
