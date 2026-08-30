# coven-landing

Public website and product landing experience for OpenCoven, built with
[Astro](https://astro.build).

## Develop

```sh
pnpm install
pnpm dev
```

Then open <http://localhost:4321>.

## Build and preview

```sh
pnpm build      # outputs static pages to dist/
pnpm preview    # serves dist/ on http://127.0.0.1:4173
```

In non-interactive shells and CI, run `CI=true pnpm build`. Keep the
`allowBuilds` entries for `esbuild` and `sharp` in `pnpm-workspace.yaml`;
without them pnpm blocks those packages' install scripts and the build fails.

## Verify

```sh
pnpm check
pnpm check:browser
```

`pnpm check` verifies required public assets, canonical logo treatment, built
HTML contracts, current public copy, and other deterministic source/build
invariants. Playwright drives the shipped interaction and fallback paths.

## Browser-native Cave downloads

The primary Cave CTA is a normal link:

```text
/download/mac
/download/mac-intel
/download/windows
/download/linux
```

`vercel.json` rewrites that route to `api/download.js`. The function resolves
an allowlisted installer from the latest `OpenCoven/coven-cave` release and
returns a cached redirect to the asset. The browser download manager owns the
binary transfer, retry behavior, and disk write.

The landing page deliberately does **not** fetch the installer into JavaScript,
accumulate chunks, construct an installer-sized `Blob`, or simulate
stream-to-disk progress. Downloads therefore remain usable with JavaScript
disabled and do not consume 100–200 MB of page memory.

The adjacent disclosure is progressive enhancement only. It fetches the small
`/api/site-stats` JSON response to decorate static latest-release links with
current version, filename, size, digest, signature, and attestation metadata.
When that API is unavailable, the static GitHub Releases links remain usable.

`/stream/:platform` remains a compatibility API while downstream references are
audited. It is not used by the current primary landing CTA and can be retired
separately after the release/redirect safety gate.

## Layout

```text
public/         Static assets served from /
api/            Vercel functions
                download.js — browser-native latest-installer resolver
                stream.js — compatibility streaming endpoint, not the page CTA
                site-stats.js — CDN-cached release/community metadata
src/
  pages/        Astro routes
  components/
    redesign/   Current landing, footer, download, and proof components
    …           Earlier secondary-page components pending consolidation
  scripts/
    redesign/   Theme, navigation, metadata decoration, motion, hero, and board
  styles/       Current and historical page styles pending vNext consolidation
scripts/        Build-time verification contracts
analytics/      Optional analytics provisioning kit; never contains secrets
                 in deployed source
tests/          Playwright interaction, fallback, and no-JavaScript coverage
```

The current redesign pages are ordinary Astro components and plain JavaScript
modules. The warded-braid hero remains a framework-free custom element in
`public/warded-braid.js` pending its progressive-enhancement refactor.

Vercel auto-detects Astro and serves `dist/`. `vercel.json` also owns the
`/party` and `/weekly` Discord redirects.
