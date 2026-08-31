import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [manifestRaw, tokens, mark, layout, home, styles, themeControl] = await Promise.all([
  read('docs/contracts/upstream-web-contracts.json'),
  read('src/styles/tokens.css'),
  read('public/assets/opencoven-mark.svg'),
  read('src/layouts/SiteLayout.astro'),
  read('src/pages/index.astro'),
  read('src/styles/vnext.css'),
  read('src/components/ThemeControl.astro'),
]);

const manifest = JSON.parse(manifestRaw);
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};
const gitBlobSha = (content) => createHash('sha1')
  .update(`blob ${Buffer.byteLength(content)}\0`)
  .update(content)
  .digest('hex');

assert(manifest.schemaVersion === 'opencoven.landing-upstream-contracts/v1', 'unexpected upstream contract schema');
assert(/^([0-9a-f]{40})$/.test(manifest.brand.revision), 'brand revision must be immutable SHA');
assert(/^([0-9a-f]{40})$/.test(manifest.ui.revision), 'UI revision must be immutable SHA');
assert(manifest.brand.profileVersion === '1.0.0', 'brand web profile pin changed unexpectedly');
assert(manifest.ui.contractVersion === '1.0.0', 'UI web contract pin changed unexpectedly');
assert(tokens.includes(`OpenCoven/brand@${manifest.brand.revision}`), 'token provenance header is missing');
for (const token of ['--oc-bg:', '--oc-text:', '--oc-action:', '--oc-presence:', '--oc-radius-4:', '--oc-motion-standard:']) {
  assert(tokens.includes(token), `canonical token missing: ${token}`);
}

assert(manifest.brand.canonicalAsset === 'web/assets/mark.svg', 'canonical brand mark source changed unexpectedly');
assert(manifest.brand.vendoredAssetPath === 'public/assets/opencoven-mark.svg', 'canonical mark vendored path changed unexpectedly');
assert(/^([0-9a-f]{40})$/.test(manifest.brand.canonicalAssetBlob), 'canonical mark blob must be immutable SHA');
assert(gitBlobSha(mark) === manifest.brand.canonicalAssetBlob, 'vendored canonical mark bytes drifted from pinned brand blob');
assert(styles.includes("url('/assets/opencoven-mark.svg')"), 'canonical mark is not consumed through the shared CSS mask');
assert(layout.includes('class="brand-mark brand-mark--header"'), 'shared header does not use the canonical mark');
assert(home.includes('class="brand-mark"'), 'homepage proof surface does not use the canonical mark');
assert(!layout.includes('<img src="/favicon.svg"'), 'favicon must not stand in for the canonical web mark');
assert(!home.includes('<img src="/favicon.svg"'), 'homepage must not use the favicon as its product mark');

for (const hook of manifest.ui.stableHooks) {
  assert(layout.includes(hook) || home.includes(hook) || themeControl.includes(hook), `stable UI hook is not consumed: ${hook}`);
}
assert(layout.includes('data-oc-primitive="global-navigation"'), 'global navigation contract hook missing');
assert(layout.includes('data-oc-primitive="mobile-navigation"'), 'mobile navigation contract hook missing');
assert(/<details[\s\S]*?class="mobile-nav"/.test(layout), 'mobile navigation must remain native/static-first');
assert(layout.includes('data-oc-state="collapsed"'), 'mobile navigation must expose its initial state');
assert(layout.includes("event.key !== 'Escape'"), 'mobile navigation must support Escape close');
assert(layout.includes('!disclosure.contains(event.target)'), 'mobile navigation must support outside close');
assert(layout.includes('primaryNavigation.map'), 'desktop and mobile navigation must consume one data source');
assert((layout.match(/primaryNavigation\.map/g) ?? []).length === 2, 'navigation data source must drive desktop and mobile output exactly once each');
assert(layout.includes('data-oc-part="primary-action"'), 'global Start locally action contract hook missing');

assert(themeControl.includes('data-oc-primitive="theme-control"'), 'three-state theme control primitive is missing');
for (const value of ['system', 'light', 'dark']) {
  assert(themeControl.includes(`value="${value}"`), `theme control is missing ${value}`);
}
assert(!themeControl.includes('type="checkbox"'), 'theme control must not regress to an ambiguous two-state toggle');

for (const metadata of [
  'name="robots"',
  'name="theme-color"',
  'property="og:image:alt"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:image"',
  'name="twitter:image:alt"',
  'rel="apple-touch-icon"',
  'type="application/ld+json"',
]) {
  assert(layout.includes(metadata), `shared metadata contract is missing ${metadata}`);
}
assert(layout.includes('<PosthogSnippet />'), 'shared shell must preserve analytics-off-by-default instrumentation');
assert(layout.includes("'@type': 'Organization'"), 'Organization structured data is missing');
assert(layout.includes("'@type': 'WebSite'"), 'WebSite structured data is missing');

assert(home.includes('data-oc-primitive="guided-proof"'), 'guided proof contract hook missing');
assert(home.includes('data-oc-part="evidence-region"'), 'guided proof evidence region hook missing');
assert(home.includes('Give your agents continuity. Keep authority local.'), 'ratified vNext homepage headline drifted');
assert(home.includes('activeProducts'), 'homepage products must come from canonical registry');
assert(home.includes('canonicalFoundationCommands'), 'homepage commands must come from canonical registry');
assert(!home.includes('https://unpkg.com/three'), 'homepage must not have render-critical remote Three.js');
assert(!home.includes('min-width: 1140px'), 'homepage must not restore the old hard responsive floor');
assert(!home.includes('data-r="shell"'), 'homepage must not depend on emergency data-r layout hooks');
assert(!home.includes('style="'), 'homepage must not reintroduce inline layout coupling');

if (failures.length) {
  console.error('Upstream web contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Verified pinned brand ${manifest.brand.profileVersion}, canonical mark ${manifest.brand.canonicalAssetBlob.slice(0, 12)}, and UI ${manifest.ui.contractVersion} contracts.`);
