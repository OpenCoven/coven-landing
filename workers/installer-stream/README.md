# installer-stream — Cloudflare Worker

The optional browser-native download tier (see the root README for the full
picture): streams the latest Coven Cave installers from Cloudflare's edge so
the large binary delivery stays off the Vercel transfer bill. The Vercel
`/download/:platform` resolver redirects here only when configured; the landing
page remains a normal link and never reads installer bytes.

## What it does

- Routes: `/mac`, `/mac-intel`, `/windows`, `/linux` (anything else 302s to
  the GitHub Releases page).
- Resolves the latest release via the GitHub API, memoized per isolate for
  `RELEASE_TTL_MS` (default 5 min) to protect the rate limit.
- Streams `upstream.body` straight through — the installer is never buffered
  in the isolate.
- Responses carry `Content-Length` (when upstream provides it),
  `Content-Disposition`, and `X-File-Size` (from release metadata), exposed to
  the browser's progress UI via `Access-Control-Expose-Headers`.
- CORS is exact-match against `ALLOWED_ORIGINS` (production origin + local
  dev/preview ports by default). No wildcard, ever. Disallowed origins get no
  `Access-Control-Allow-Origin` (browsers block the read; non-browser clients
  still get the bytes).
- Any upstream failure — GitHub API error, missing asset, failed asset fetch —
  302s to `FALLBACK_ORIGIN/stream/:platform` when configured, or to the GitHub
  Releases page instead of returning a broken download. The Vercel stream
  endpoint has the direct GitHub fallback of its own.

## Configuration

| Name               | Kind   | Purpose                                                       |
| ------------------ | ------ | ------------------------------------------------------------- |
| `ALLOWED_ORIGINS`  | var    | Comma-separated exact-match CORS allowlist (replaces defaults) |
| `RELEASE_TTL_MS`   | var    | Release-metadata cache TTL per isolate (`0` disables the memo) |
| `FALLBACK_ORIGIN`  | var    | Site origin for the Vercel `/stream/:platform` failure fallback |
| `GITHUB_TOKEN`     | secret | Optional; raises the GitHub API rate limit                    |

Deploy credentials live as the repository secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` (see the root README's setup steps).

## Tests

```sh
pnpm test:unit   # from the repo root; runs the node --test suite in this directory
```

Node 24 speaks the same fetch/Request/Response dialect as workerd, so the
handler is exercised directly: asset selection, CORS matrix, fallback
redirects, headers, release caching, and a never-closing upstream stream that
proves the body is passed through unbuffered.
