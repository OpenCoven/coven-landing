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
workers/        Optional Cloudflare Worker installer stream
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

## Optional Cloudflare Worker download tier

The browser-native Cave link always starts at `/download/:platform`. When the
Vercel runtime variable `DOWNLOAD_STREAM_ORIGIN` is set, `api/download.js`
redirects that link to the matching route on the optional Worker first. The
Worker streams `upstream.body` directly, so installer bytes never enter page
JavaScript or an installer-sized `Blob`. The primary path is a normal browser
navigation and does not require CORS.

If the Worker cannot resolve or stream an asset, its `FALLBACK_ORIGIN` sends the
browser to the site's `/stream/:platform` compatibility endpoint; that
endpoint falls back to the GitHub Releases page. With the Worker variable
unset, the existing Vercel resolver selects the current allowlisted asset and
redirects directly to GitHub. No production enablement is required for the
site to work.

### Setup

1. Deploy `workers/installer-stream/` with `npx wrangler deploy`.
2. Set `FALLBACK_ORIGIN` to the site origin and keep `ALLOWED_ORIGINS` as an
   exact-match list. The optional `GITHUB_TOKEN` Worker secret raises the
   GitHub API rate limit.
3. Set the Vercel runtime variable `DOWNLOAD_STREAM_ORIGIN` to the Worker's
   HTTPS origin, then redeploy the site. (The older
   `PUBLIC_DOWNLOAD_STREAM_ORIGIN` name is accepted as a compatibility alias.)
4. Verify the browser-native link with JavaScript disabled and exercise both
   the Worker and fallback routes before enabling it for all traffic.

Cloudflare deployment credentials are operator-owned: use
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository/deployment
secrets. The Worker may also be deployed manually with Wrangler.

### Rollback

Unset `DOWNLOAD_STREAM_ORIGIN` (and the compatibility alias, if used) in Vercel
and redeploy. The page immediately returns to the existing Vercel resolver;
the Worker can remain deployed or be deleted independently.
