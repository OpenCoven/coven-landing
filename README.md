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
asset on GitHub Releases, and `/stream/:platform` to `api/stream.js` (see
below).

## Download pipeline

The hero's primary download card detects the visitor's platform
(`src/scripts/download-platform.js`, shared with the classic landing) and
streams the installer in-page with progress rendered in the button itself
(`src/scripts/reforged.js`). Streaming needs byte access via fetch, which
GitHub's asset hosting blocks cross-origin, so the client walks a cascade
at click time — whichever source works first wins, and every failure mode
degrades one tier without user-visible errors:

1. **Cloudflare Worker** (`workers/download-proxy/`) — CORS streaming
   proxy with free egress. Tried first when `PUBLIC_DOWNLOAD_STREAM_ORIGIN`
   is set at build time. Deployed automatically by
   `.github/workflows/deploy-download-worker.yml` on pushes to `main`.
2. **Vercel edge proxy** (`api/stream.js`, same-origin `/stream/:platform`)
   — zero-setup fallback; bytes count against Vercel data transfer, so if
   a usage cap pauses functions this tier fails and the cascade moves on.
3. **Native navigation** (`/download/:platform` → `api/download.js` 302) —
   always works, and is also the server-rendered no-JS default.

Tiers 2 and 3 need no configuration — they deploy with the site. Tier 1
is opt-in for maintainers (until the secrets below exist, the deploy
workflow skips green and the cascade simply starts at tier 2). The worker
must run on the project's own Cloudflare account: whoever controls it
controls the bytes visitors save as an installer. One-time setup:

1. Cloudflare dashboard → API token with **Workers Scripts: Edit**; add it
   and the account ID as repo secrets `CLOUDFLARE_API_TOKEN` /
   `CLOUDFLARE_ACCOUNT_ID`, then run the deploy workflow once.
2. Set `PUBLIC_DOWNLOAD_STREAM_ORIGIN` in Vercel to the worker URL
   (e.g. `https://coven-download.<account>.workers.dev`) and redeploy.
3. Optional: `wrangler secret put GITHUB_TOKEN` (worker) and a
   `GITHUB_TOKEN` env var (Vercel) raise the GitHub API rate limit for
   release resolution; both endpoints cache lookups regardless.

Worker unit tests: `node --test "workers/download-proxy/test/*.test.mjs"`
(also run by the deploy workflow before deploying).
