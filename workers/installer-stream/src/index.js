// Cloudflare Workers streaming tier for browser-native installer downloads.
// The Vercel /download/:platform resolver redirects here when configured;
// the page never fetches installer bytes or needs CORS for the primary path.
//
// Same job as api/stream.js (resolve the latest Coven Cave release, pick the
// right installer, pass the bytes through), but from Cloudflare's edge:
// Workers do not separately bill egress, so 100–200 MB installers stop
// counting against the Vercel transfer cap while the landing page and its
// small, cache-friendly APIs stay on Vercel untouched.
//
// On an upstream failure, FALLBACK_ORIGIN can redirect to the site's
// same-origin /stream/:platform compatibility endpoint. That endpoint then
// falls back to the browser's direct GitHub release path. If no fallback is
// configured, this Worker redirects straight to the releases page.
//
// Streams, never buffers: the upstream ReadableStream is handed to the
// Response body directly, so installer bytes flow through the isolate without
// ever being materialized in memory.
//
// Deployed separately from the site (`wrangler deploy`, see workers/
// installer-stream/README.md); configured through the ALLOWED_ORIGINS and
// FALLBACK_ORIGIN vars plus the optional GITHUB_TOKEN secret. The landing page
// treats this Worker as an optional accelerator: without it, the existing
// Vercel resolver answers normally.

const REPO = 'OpenCoven/coven-cave';
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;
const UA = 'opencoven-landing';

// platform → predicate that picks its installer asset from the release.
// Order matters only within a platform; each predicate must be unique
// enough to match exactly one asset. `.sig` sidecars are always excluded.
// Mirrors api/_shared.js — keep in sync.
const MATCHERS = {
  mac:         (n) => n.endsWith('.dmg') && /aarch64|arm64/i.test(n),
  'mac-intel': (n) => n.endsWith('.dmg') && /x86_64|x64|intel/i.test(n),
  windows:     (n) => n.endsWith('.msi'),
  linux:       (n) => n.endsWith('.AppImage'),
};

export function pickAsset(assets, platform) {
  const match = MATCHERS[platform];
  if (!match || !Array.isArray(assets)) return null;
  return (
    assets.find(
      (asset) =>
        asset &&
        typeof asset.name === 'string' &&
        !asset.name.endsWith('.sig') &&
        match(asset.name),
    ) ?? null
  );
}

// CORS is exact-match against this allowlist — production landing origin plus
// the local dev/preview ports, never a wildcard. Setting the ALLOWED_ORIGINS
// var (comma-separated) replaces the defaults so ops can revoke an origin
// without a code change.
const DEFAULT_ORIGINS = [
  'https://opencoven.ai',
  'https://www.opencoven.ai',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export function allowedOrigins(env) {
  const raw = env && typeof env.ALLOWED_ORIGINS === 'string' ? env.ALLOWED_ORIGINS.trim() : '';
  if (!raw) return DEFAULT_ORIGINS;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function safeOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function fallbackUrl(platform, env) {
  const origin = safeOrigin(env && env.FALLBACK_ORIGIN);
  return origin ? `${origin}/stream/${encodeURIComponent(platform)}` : null;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const headers = new Headers({ Vary: 'Origin' });
  // Only the allowlisted origin is echoed back; no Origin header (same-origin
  // request, curl) needs no CORS at all. Disallowed origins get no ACAO, so
  // browsers block the read while non-browser clients still get the bytes.
  if (origin && allowedOrigins(env).includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    // Programmatic cross-origin clients may read these headers; without the
    // expose list the browser hides them from fetch() callers.
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition, X-File-Size');
  }
  return headers;
}

function preflight(request, env) {
  const headers = corsHeaders(request, env);
  if (!headers.has('Access-Control-Allow-Origin')) {
    return new Response('Origin not allowed', { status: 403 });
  }
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}

// Module-scope memo of the latest-release lookup. Isolates persist across
// requests, so warm traffic skips the GitHub API (60 req/hr unauthenticated)
// entirely; a GITHUB_TOKEN secret raises the limit.
let releaseCache = { at: 0, release: null };

export function clearReleaseCache() {
  releaseCache = { at: 0, release: null };
}

async function latestRelease(env) {
  // An explicit RELEASE_TTL_MS (including 0, which disables the memo) wins;
  // anything absent or malformed falls back to five minutes.
  const raw = env && env.RELEASE_TTL_MS !== undefined && env.RELEASE_TTL_MS !== ''
    ? Number(env.RELEASE_TTL_MS)
    : NaN;
  const ttl = Number.isFinite(raw) && raw >= 0 ? raw : 5 * 60 * 1000;
  if (releaseCache.release && Date.now() - releaseCache.at < ttl) {
    return releaseCache.release;
  }
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': UA,
  };
  if (env && env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  const release = await response.json();
  releaseCache = { at: Date.now(), release };
  return release;
}

// Content-Disposition is built from a third-party-provided filename — strip
// anything that could break the header or smuggle characters into it.
function dispositionFor(name) {
  return `attachment; filename="${name.replace(/[\r\n"\\]/g, '')}"`;
}

function redirectTo(location) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store' },
  });
}

function redirectToReleases() {
  return redirectTo(RELEASES_PAGE);
}

export async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') return preflight(request, env);

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, OPTIONS' },
    });
  }

  const platform = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '');
  if (!MATCHERS[platform]) return redirectToReleases();

  try {
    const release = await latestRelease(env);
    const asset = pickAsset(release.assets, platform);
    if (!asset || !asset.browser_download_url) {
      throw new Error(`no asset for ${platform}`);
    }

    const upstream = await fetch(asset.browser_download_url, {
      headers: { 'User-Agent': UA },
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`asset fetch ${upstream.status}`);
    }

    const headers = corsHeaders(request, env);
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', dispositionFor(asset.name));
    headers.set('Cache-Control', 'public, max-age=600');
    const length = upstream.headers.get('Content-Length');
    if (length) headers.set('Content-Length', length);
    // Edge responses can be re-chunked; carry the authoritative size from
    // release metadata for clients that display transfer progress.
    if (asset.size) headers.set('X-File-Size', String(asset.size));

    // Pass the upstream ReadableStream straight through — the bytes are never
    // buffered in the isolate.
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    // Rate limit, missing asset, upstream failure — prefer the configured
    // Vercel streaming fallback, then hand the visitor to GitHub rather than
    // returning a broken download.
    return redirectTo(fallbackUrl(platform, env) || RELEASES_PAGE);
  }
}

export default { fetch: handleRequest };
