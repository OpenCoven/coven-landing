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
const require = (condition, message) => {
  if (!condition) failures.push(message);
};
const gitBlobSha = (content) => createHash('sha1')
  .update(`blob ${Buffer.byteLength(content)}\0`)
  .update(content)
  .digest('hex');

require(manifest.schemaVersion === 'opencoven.landing-upstream-contracts/v1', 'unexpected upstream contract schema');
require(/^([0-9a-f]{40})$/.test(manifest.brand.revision), 'brand revision must be immutable SHA');
require(/^([0-9a-f]{40})$/.test(manifest.ui.revision), 'UI revision must be immutable SHA');
require(manifest.brand.profileVersion === '1.0.0', 'brand web profile pin changed unexpectedly');
require(manifest.ui.contractVersion === '1.0.0', 'UI web contract pin changed unexpectedly');
require(tokens.includes(`OpenCoven/brand@${manifest.brand.revision}`), 'token provenance header is missing');
for (const token of ['--oc-bg:', '--oc-text:', '--oc-action:', '--oc-presence:', '--oc-radius-4:', '--oc-motion-standard:']) {
  require(tokens.includes(token), `canonical token missing: ${token}`);
}

require(manifest.brand.canonicalAsset === 'web/assets/mark.svg', 'canonical brand mark source changed unexpectedly');
require(manifest.brand.vendoredAssetPath === 'public/assets/opencoven-mark.svg', 'canonical mark vendored path changed unexpectedly');
require(/^([0-9a-f]{40})$/.test(manifest.brand.canonicalAssetBlob), 'canonical mark blob must be immutable SHA');
require(gitBlobSha(mark) === manifest.brand.canonicalAssetBlob, 'vendored canonical mark bytes drifted from pinned brand blob');
require(styles.includes("url('/assets/opencoven-mark.svg')"), 'canonical mark is not consumed through the shared CSS mask');
require(layout.includes('class="brand-mark brand-mark--header"'), 'shared header does not use the canonical mark');
require(home.includes('class="brand-mark"'), 'homepage proof surface does not use the canonical mark');
require(!layout.includes('<img src="/favicon.svg"'), 'favicon must not stand in for the canonical web mark');
require(!home.includes('<img src="/favicon.svg"'), 'homepage must not use the favicon as its product mark');

for (const hook of manifest.ui.stableHooks) {
  require(layout.includes(hook) || home.includes(hook) || themeControl.includes(hook), `stable UI hook is not consumed: ${hook}`);
}
require(layout.includes('data-oc-primitive="global-navigation"'), 'global navigation contract hook missing');
require(layout.includes('data-oc-primitive="mobile-navigation"'), 'mobile navigation contract hook missing');
require(/<details[\s\S]*?class="mobile-nav"/.test(layout), 'mobile navigation must remain native/static-first');
require(layout.includes('data-oc-state="collapsed"'), 'mobile navigation must expose its initial state');
require(layout.includes("event.key !== 'Escape'"), 'mobile navigation must support Escape close');
require(layout.includes('!disclosure.contains(event.target)'), 'mobile navigation must support outside close');
require(layout.includes('primaryNavigation.map'), 'desktop and mobile navigation must consume one data source');
require((layout.match(/primaryNavigation\.map/g) ?? []).length === 2, 'navigation data source must drive desktop and mobile output exactly once each');
require(layout.includes('data-oc-part="primary-action"'), 'global Start locally action contract hook missing');

require(themeControl.includes('data-oc-primitive="theme-control"'), 'three-state theme control primitive is missing');
for (const value of ['system', 'light', 'dark']) {
  require(themeControl.includes(`value="${value}"`), `theme control is missing ${value}`);
}
require(!themeControl.includes('type="checkbox"'), 'theme control must not regress to an ambiguous two-state toggle');

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
  require(layout.includes(metadata), `shared metadata contract is missing ${metadata}`);
}
require(layout.includes('<PosthogSnippet />'), 'shared shell must preserve analytics-off-by-default instrumentation');
require(layout.includes("'@type': 'Organization'"), 'Organization structured data is missing');
require(layout.includes("'@type': 'WebSite'"), 'WebSite structured data is missing');

require(home.includes('data-oc-primitive="guided-proof"'), 'guided proof contract hook missing');
require(home.includes('data-oc-part="evidence-region"'), 'guided proof evidence region hook missing');
require(home.includes('Give your agents continuity. Keep authority local.'), 'ratified vNext homepage headline drifted');
require(home.includes('activeProducts'), 'homepage products must come from canonical registry');
require(home.includes('canonicalFoundationCommands'), 'homepage commands must come from canonical registry');
require(!home.includes('https://unpkg.com/three'), 'homepage must not have render-critical remote Three.js');
require(!home.includes('min-width: 1140px'), 'homepage must not restore the old hard responsive floor');
require(!home.includes('data-r="shell"'), 'homepage must not depend on emergency data-r layout hooks');
require(!home.includes('style="'), 'homepage must not reintroduce inline layout coupling');

if (failures.length) {
  console.error('Upstream web contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Verified pinned brand ${manifest.brand.profileVersion}, canonical mark ${manifest.brand.canonicalAssetBlob.slice(0, 12)}, and UI ${manifest.ui.contractVersion} contracts.`);
