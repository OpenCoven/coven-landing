# coven-landing

Landing page for OpenCoven / Coven, built with [Astro](https://astro.build).

## Develop

```sh
npm install
npm run dev
```

Then open <http://localhost:4321>.

## Build + preview

```sh
npm run build      # outputs static site to dist/
npm run preview    # serves dist/ on http://localhost:4173
```

## Verify

```sh
npm run check      # verify-static sanity checks (run after `npm run build`)
```

`verify-static.mjs` confirms required public assets exist, the canonical OpenCoven logo treatment is used in `favicon.svg` and `og.svg`, and that built HTML still contains load-bearing copy.

## Layout

```
public/         Static assets served at /        (favicon, og image, apple touch icon)
src/
  pages/        Astro routes                     (index.astro)
  components/   Page sections                    (Hero, ProofGrid, Familiars, …)
  scripts/      Client-side islands              (main.js — hero card, reveals, parallax, copy)
  styles/       Global stylesheet                (global.css)
scripts/        Build-time sanity checks         (verify-static.mjs)
```

Vercel auto-detects Astro and runs `npm run build`, serving `dist/`.
