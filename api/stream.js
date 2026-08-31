// Same-origin streaming proxy — the optional Vercel fallback for the
// browser-native download route.
//
// The primary CTA points at /download/:platform, which normally redirects
// straight to the current GitHub release asset. If the optional Cloudflare
// Worker cannot resolve or stream an installer, it may redirect here through
// FALLBACK_ORIGIN; this endpoint passes the body through same-origin and
// redirects to the GitHub Releases page on failure.
//
// Each stream served here counts against Vercel data transfer. It remains a
// compatibility endpoint and is not fetched by landing-page JavaScript.
//
// Edge runtime, not Node: an in-flight streaming response has no
// wall-clock cap here, while Node functions are killed at maxDuration —
// which would truncate a 73 MB installer on a slow connection.
//
// Routed via vercel.json rewrites: /stream/:platform → /api/stream?platform=:platform

import { MATCHERS, RELEASES_PAGE, REPO, pickAsset } from './_shared.js';

export const config = { runtime: 'edge' };

// Module-scope memo of the latest-release lookup. Edge isolates persist
// across requests, so warm traffic skips the GitHub API (60 req/hr
// unauthenticated) entirely; a GITHUB_TOKEN env var raises the limit.
let releaseCache = { at: 0, release: null };
const RELEASE_TTL_MS = 5 * 60 * 1000;

async function latestRelease() {
  if (releaseCache.release && Date.now() - releaseCache.at < RELEASE_TTL_MS) {
    return releaseCache.release;
  }
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'opencoven-landing',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers },
  );
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  const release = await response.json();
  releaseCache = { at: Date.now(), release };
  return release;
}

export default async function handler(request) {
  const platform = new URL(request.url).searchParams.get('platform') ?? '';
  if (!MATCHERS[platform]) {
    return Response.redirect(RELEASES_PAGE, 302);
  }

  try {
    const release = await latestRelease();
    const asset = pickAsset(release.assets, platform);
    if (!asset || !asset.browser_download_url) {
      throw new Error(`no asset for ${platform}`);
    }

    const upstream = await fetch(asset.browser_download_url, {
      headers: { 'User-Agent': 'opencoven-landing' },
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`asset fetch ${upstream.status}`);
    }

    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${asset.name}"`,
      'Cache-Control': 'public, max-age=600',
    });
    const length = upstream.headers.get('Content-Length');
    if (length) headers.set('Content-Length', length);
    // Vercel's edge streams chunked and drops Content-Length; carry the
    // real size in a custom header so progress UIs can still compute %.
    if (asset.size) headers.set('X-File-Size', String(asset.size));

    return new Response(upstream.body, { status: 200, headers });
  } catch {
    // Rate limit, missing asset, upstream failure — the client treats
    // the resulting HTML redirect as "not streamable" and falls back to
    // its native download path.
    return Response.redirect(RELEASES_PAGE, 302);
  }
}
