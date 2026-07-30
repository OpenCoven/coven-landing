# Roadmap

## Where the site's architecture is

The redesign (the v10 "warded braid" landing and How It Works) is fully
ported into this repo's native stack: Astro components under
`src/components/redesign/`, plain script modules under
`src/scripts/redesign/`, self-hosted fonts, and the existing CI (build →
`verify-static` → Playwright). The design-export pipeline that previously
produced these pages (`migrate.py` on Claude Design exports) is retired;
design iteration happens in this repo like any other change.

Two pieces deliberately kept framework-free:

- `public/warded-braid.js` — the WebGL hero, a vanilla custom element with
  its own config block at the top. Tuning the braid means editing that config
  (a parameter playground for it lives in the design workspace's
  `warded-braid-studio`).
- `api/` — plain Vercel functions (`download`, `stream`, `site-stats`).

## Near-term

- **Secondary pages** (`/github`, `/quickstart`, `/privacy`, `/terms`) still
  use the pre-redesign components and design language. Restyle them with the
  redesign nav/footer/tokens, or fold their content into the new pages.
  Until then their in-page anchors to old homepage sections dangle.
- **Product pages** (Cave / CLI / Code) do not exist; the footer's Product
  column ships hidden (`RedesignFooter.astro`, one-line revert).
- **Analytics**: the PostHog kit in `analytics/` is wired
  (`PosthogSnippet.astro` activates when a project key is configured) but no
  workspace is provisioned. Fill the config, run the two scripts, deploy.
- **Domain**: og:url/og:image point at opencoven.ai; confirm at launch.

## Verification contract

`scripts/verify-static.mjs` encodes the site's invariants (narrative order,
load-bearing copy, platform artifact rows, hidden Product column, no direct
GitHub/Discord calls, no design-runtime remnants, initial-JS budget) and
`tests/redesign.spec.ts` drives the shipped pages in a browser — including
platform detection under Chrome's frozen-UA reduction. Keep both green;
they are the definition of "deployable".
