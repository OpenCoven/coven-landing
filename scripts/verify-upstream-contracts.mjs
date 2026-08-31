import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [manifestRaw, tokens, layout, home] = await Promise.all([
  read('docs/contracts/upstream-web-contracts.json'),
  read('src/styles/tokens.css'),
  read('src/layouts/SiteLayout.astro'),
  read('src/pages/index.astro'),
]);

const manifest = JSON.parse(manifestRaw);
const failures = [];
const require = (condition, message) => {
  if (!condition) failures.push(message);
};

require(manifest.schemaVersion === 'opencoven.landing-upstream-contracts/v1', 'unexpected upstream contract schema');
require(/^([0-9a-f]{40})$/.test(manifest.brand.revision), 'brand revision must be immutable SHA');
require(/^([0-9a-f]{40})$/.test(manifest.ui.revision), 'UI revision must be immutable SHA');
require(manifest.brand.profileVersion === '1.0.0', 'brand web profile pin changed unexpectedly');
require(manifest.ui.contractVersion === '1.0.0', 'UI web contract pin changed unexpectedly');
require(tokens.includes('OpenCoven/brand@4127be6d402089d15953e76988bbeab2db37df54'), 'token provenance header is missing');
for (const token of ['--oc-bg:', '--oc-text:', '--oc-action:', '--oc-presence:', '--oc-radius-4:', '--oc-motion-standard:']) {
  require(tokens.includes(token), `canonical token missing: ${token}`);
}
for (const hook of manifest.ui.stableHooks) {
  require(layout.includes(hook) || home.includes(hook), `stable UI hook is not consumed: ${hook}`);
}
require(layout.includes('data-oc-primitive="global-navigation"'), 'global navigation contract hook missing');
require(layout.includes('data-oc-primitive="mobile-navigation"'), 'mobile navigation contract hook missing');
require(layout.includes('<details class="mobile-nav"'), 'mobile navigation must remain native/static-first');
require(home.includes('data-oc-primitive="guided-proof"'), 'guided proof contract hook missing');
require(home.includes('data-oc-state="idle"'), 'vNext controls must expose explicit shared state semantics');
require(home.includes('Give your agents continuity. Keep authority local.'), 'ratified vNext homepage headline drifted');
require(home.includes('activeProducts'), 'homepage products must come from canonical registry');
require(home.includes('canonicalFoundationCommands'), 'homepage commands must come from canonical registry');
require(!home.includes('https://unpkg.com/three'), 'homepage must not have render-critical remote Three.js');
require(!home.includes('min-width: 1140px'), 'homepage must not restore the old hard responsive floor');
require(!home.includes('data-r="shell"'), 'homepage must not depend on emergency data-r layout hooks');

if (failures.length) {
  console.error('Upstream web contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Verified pinned brand ${manifest.brand.profileVersion} and UI ${manifest.ui.contractVersion} contracts.`);
