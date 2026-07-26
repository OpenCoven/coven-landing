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
public/         Static assets served at /        (favicon, og image, apple touch icon, logos)
api/            Vercel serverless functions      (download.js — resolves latest installer)
src/
  pages/        Astro routes                     (index, github, privacy, terms)
  components/   Page sections                    (Hero, ContinuityStory, RuntimeProof, QuickStart, …)
  scripts/      Client-side behavior             (main.js — navigation, reveals, downloads, theme;
                                                  landing.js — familiar tabs, continuity, runtime proof)
  styles/       Global stylesheet                (global.css)
scripts/        Build-time sanity checks         (verify-static.mjs)
```

Vercel auto-detects Astro (pnpm via `pnpm-lock.yaml`) and serves `dist/`.
`vercel.json` adds the `/party` and `/weekly` Discord redirects and rewrites
`/download/:platform` to `api/download.js`, which 302s to the latest installer
asset on GitHub Releases.
