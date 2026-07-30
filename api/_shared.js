// Release constants shared by the download endpoints (underscore-prefixed
// files in api/ are not deployed as functions).

export const REPO = 'OpenCoven/coven-cave';
export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

// platform → predicate that picks its installer asset from the release.
// Order matters only within a platform; each predicate must be unique
// enough to match exactly one asset. `.sig` sidecars are always excluded.
// Mirrored in workers/download-proxy/src/index.js — keep in sync.
export const MATCHERS = {
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
