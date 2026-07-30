# coven-landing

Landing page for OpenCoven / Coven, built with [Astro](https://astro.build).

## Develop

```sh
pnpm install
pnpm dev
```

Then open <http://localhost:4321>.

## Build + preview

```sh
pnpm build      # outputs static site to dist/
pnpm preview    # serves dist/ on http://localhost:4173
```

In non-interactive shells (CI, agents), run `CI=true pnpm build`. Keep the
`allowBuilds` entries for `esbuild`/`sharp` in `pnpm-workspace.yaml` — without
them pnpm blocks those packages' install scripts and the build fails.

## Verify

```sh
pnpm check      # verify-static sanity checks (run after `pnpm build`)
```

`verify-static.mjs` confirms required public assets exist, the canonical OpenCoven logo treatment is used in `favicon.svg` and `og.svg`, and that built HTML still contains load-bearing copy.

## Layout

```
public/         Static assets served at /        (favicon, og image, logos, warded-braid.js —
                                                  the WebGL hero, a vanilla custom element)
api/            Vercel serverless functions      (download.js — latest-installer 302;
                                                  stream.js — same-origin streaming proxy;
                                                  site-stats.js — CDN-cached GitHub/Discord stats)
src/
  pages/        Astro routes                     (index + how-it-works are the redesign;
                                                  github, quickstart, privacy, terms predate it)
  components/
    redesign/   Redesign sections                (Hero, Board, DownloadCta, Outcomes, Footer, …)
    …           Pre-redesign components          (used by the secondary pages)
  scripts/
    redesign/   Redesign behavior modules        (theme, nav, downloads, stats, motion, hero, board)
  styles/       Stylesheets                      (redesign.css — tokens + page/component CSS)
scripts/        Build-time sanity checks         (verify-static.mjs)
analytics/      PostHog provisioning kit         (never deployed; see analytics/README.md)
tests/          Playwright suite                 (redesign.spec.ts)
```

The redesign pages were ported from Claude Design exports into ordinary Astro
components and plain script modules; design iteration now happens in this
repo. The hero braid stays a framework-free custom element in `public/`.

Vercel auto-detects Astro (pnpm via `pnpm-lock.yaml`) and serves `dist/`.
`vercel.json` adds the `/party` and `/weekly` Discord redirects and rewrites
`/download/:platform` to `api/download.js`, which 302s to the latest installer
asset on GitHub Releases.
