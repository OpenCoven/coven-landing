// Browser-native download resolver — 302s to the optional Worker when it is
// configured, otherwise to the latest CovenCave installer.
//
// Why a function: GitHub release asset filenames carry version suffixes
// (CovenCave-v0.1.0-aarch64.dmg), so a static redirect breaks on every
// release. Without the Worker, this resolves the *latest* release at request
// time and points the visitor straight at the correct installer file — a real
// download, never the GitHub Releases listing page.
//
// Routed via vercel.json rewrites: /download/:platform → /api/download?platform=:platform
//
// Rate limits: unauthenticated GitHub API is 60 req/hr per outbound IP.
// We cache the 302 at the Vercel CDN (s-maxage) so real traffic almost
// never reaches GitHub, and honour GITHUB_TOKEN if one is configured.

import { MATCHERS, RELEASES_PAGE, REPO } from './_shared.js';

// When configured, the browser-native endpoint hands the request to the
// optional Cloudflare Worker. This keeps the Worker behind the same download
// contract: the page remains a normal link and never reads installer bytes.
// The PUBLIC_ alias keeps existing Worker rollout notes usable; new Vercel
// deployments should prefer the private runtime variable.
export function workerDownloadUrl(
  platform,
  origin = process.env.DOWNLOAD_STREAM_ORIGIN || process.env.PUBLIC_DOWNLOAD_STREAM_ORIGIN,
) {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.pathname.replace(/\/+$/, '')) return null;
    url.search = '';
    url.hash = '';
    url.pathname = `/${encodeURIComponent(platform)}`;
    return url.toString();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const platform = String(req.query.platform || '').toLowerCase();
  const match = MATCHERS[platform];

  // Unknown platform → send them to the human-readable releases page
  // rather than erroring. Not cached, so a fix takes effect immediately.
  if (!match) {
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(302, { Location: RELEASES_PAGE });
    return res.end();
  }

  const workerUrl = workerDownloadUrl(platform);
  if (workerUrl) {
    // Do not cache the handoff: an operator can disable the optional Worker
    // and have the direct resolver take effect on the next request.
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(302, { Location: workerUrl });
    return res.end();
  }

  try {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'opencoven-landing',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const resp = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers });
    if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);

    const release = await resp.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = assets.find((a) => a && typeof a.name === 'string' && !a.name.endsWith('.sig') && match(a.name));

    if (!asset || !asset.browser_download_url) throw new Error(`no asset for ${platform}`);

    // Cache the resolved redirect at the CDN for 10 min, and serve a
    // stale one for up to a day while revalidating — keeps us well under
    // GitHub's rate limit even under load.
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    res.writeHead(302, { Location: asset.browser_download_url });
    return res.end();
  } catch {
    // Any failure (rate limit, network, missing asset) degrades to the
    // releases page so the button always does something useful.
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(302, { Location: RELEASES_PAGE });
    return res.end();
  }
}
