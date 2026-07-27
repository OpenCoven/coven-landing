import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { quickstartProducts } from '../src/data/quickstart.ts';

/**
 * Sanity checks for the Astro landing site.
 * Run after `npm run build` (or as part of `npm run check`).
 *
 * Checks:
 *  - required public assets exist (favicon, apple-touch-icon, OG image+svg)
 *  - canonical OpenCoven logo treatment in favicon.svg and og.svg
 *  - rendered dist/index.html exists and contains load-bearing copy
 *  - rendered dist/github/index.html exists and contains hosted GitHub beta copy
 *  - rendered dist/quickstart/index.html exists and contains the comprehensive quickstart page
 */

const root = process.cwd();
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');

function verifyCovenCaveExplainerStreams() {
  const explainer = path.join(
    publicDir,
    'reforged',
    'coven-cave-explainer.mp4',
  );
  let inspection;
  try {
    inspection = execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'stream=codec_type,codec_name,channels',
        '-of',
        'json',
        explainer,
      ],
      { encoding: 'utf8' },
    );
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(
        'ffprobe is required to verify public/reforged/coven-cave-explainer.mp4; install FFmpeg and retry.',
      );
    }
    const details = error?.stderr?.toString().trim() || error?.message;
    throw new Error(
      `ffprobe could not inspect public/reforged/coven-cave-explainer.mp4: ${details}`,
    );
  }

  let metadata;
  try {
    metadata = JSON.parse(inspection);
  } catch (error) {
    throw new Error(
      `ffprobe returned invalid JSON for public/reforged/coven-cave-explainer.mp4: ${error.message}`,
    );
  }
  if (
    !metadata
    || typeof metadata !== 'object'
    || Array.isArray(metadata)
    || !Array.isArray(metadata.streams)
  ) {
    throw new Error(
      'ffprobe returned malformed stream metadata for public/reforged/coven-cave-explainer.mp4; expected a JSON object with a streams array.',
    );
  }
  const { streams } = metadata;

  const videoStreams = streams.filter((stream) => stream.codec_type === 'video');
  if (videoStreams.length !== 1) {
    throw new Error(
      'public/reforged/coven-cave-explainer.mp4 must contain exactly one video stream.',
    );
  }
  if (videoStreams[0].codec_name !== 'h264') {
    throw new Error(
      'public/reforged/coven-cave-explainer.mp4 video stream must use H.264.',
    );
  }

  const audioStreams = streams.filter((stream) => stream.codec_type === 'audio');
  if (audioStreams.length !== 1) {
    throw new Error(
      'public/reforged/coven-cave-explainer.mp4 must contain exactly one audio stream.',
    );
  }
  if (audioStreams[0].codec_name !== 'aac') {
    throw new Error(
      'public/reforged/coven-cave-explainer.mp4 audio stream must use AAC.',
    );
  }
  if (audioStreams[0].channels !== 2) {
    throw new Error(
      'public/reforged/coven-cave-explainer.mp4 must contain stereo AAC audio.',
    );
  }

  console.log(
    'Verified Coven Cave explainer MP4 streams: H.264 video and one stereo AAC audio stream.',
  );
}

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const countMatches = (content, pattern) =>
  [...content.matchAll(pattern)].length;

const toRenderedText = (content) =>
  content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/(?:&#39;|&#x27;)/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

async function getInitialJavascriptBudget(htmlContent) {
  const modulePaths = [];
  const scriptTags = htmlContent.match(/<script\b[^>]*>/g) ?? [];
  for (const tag of scriptTags) {
    if (!/\btype="module"/.test(tag)) continue;
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    if (src?.startsWith('/') && src.endsWith('.js')) {
      modulePaths.push(src);
    }
  }

  const seen = new Set();
  const queue = [...modulePaths];
  let moduleGzipBytes = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    const absolute = path.join(distDir, current.replace(/^\//, ''));
    const source = await readFile(absolute, 'utf8');
    moduleGzipBytes += gzipSync(source).byteLength;

    const importPattern = /(?:from\s*|import\s*)["']([^"']+\.js)["']/g;
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;
      queue.push(
        path.posix.normalize(
          path.posix.join(path.posix.dirname(current), specifier),
        ),
      );
    }
  }

  const inlineScripts = [
    ...htmlContent.matchAll(
      /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ].map((match) => match[1]);
  const inlineGzipBytes = inlineScripts.reduce(
    (total, source) => total + gzipSync(source).byteLength,
    0,
  );

  return {
    bytes: moduleGzipBytes + inlineGzipBytes,
    modules: [...seen],
  };
}

const productContracts = [
  { id: 'coven-cli', name: 'Coven CLI' },
  { id: 'coven-code', name: 'Coven Code' },
  { id: 'coven-cave', name: 'Coven Cave' },
  { id: 'castcodes', name: 'CastCodes' },
  { id: 'github', name: 'OpenCoven for GitHub' },
];

const registryProductContracts = quickstartProducts.map(({ id, name }) => ({
  id,
  name,
}));
if (
  JSON.stringify(registryProductContracts)
  !== JSON.stringify(productContracts)
) {
  throw new Error(
    'quickstartProducts IDs, names, or order drifted from the canonical product contract',
  );
}

const requiredPublicFiles = [
  'favicon.svg',
  'apple-touch-icon.png',
  'og.png',
  'og.svg',
  'robots.txt',
];

const missing = requiredPublicFiles.filter(
  (file) => !existsSync(path.join(publicDir, file)),
);
if (missing.length > 0) {
  throw new Error(`Missing required public files: ${missing.join(', ')}`);
}

verifyCovenCaveExplainerStreams();

const assertCanonicalLogoSvg = (content, label) => {
  if (content.includes('currentColor')) {
    throw new Error(
      `${label} still uses the generated/currentColor mark instead of canonical logo fills`,
    );
  }
  // Accept either the full hex form or SVGO's optimized shorthand.
  const hasBlack = /fill="#0{3,6}"/i.test(content);
  const hasWhite = /fill="#f{3,6}"/i.test(content) || /fill="#FFFFFF"/i.test(content);
  if (!hasBlack || !hasWhite) {
    throw new Error(`${label} must use the white-on-black OpenCoven logo variant`);
  }
};

const favicon = await readFile(path.join(publicDir, 'favicon.svg'), 'utf8');
if (!favicon.includes('viewBox="0 0 2272 2272"')) {
  throw new Error('public/favicon.svg is not the canonical OpenCoven logo viewBox');
}
assertCanonicalLogoSvg(favicon, 'public/favicon.svg');

const og = await readFile(path.join(publicDir, 'og.svg'), 'utf8');
if (!og.includes('Approved OpenCoven logo treatment: white icon on black')) {
  throw new Error('public/og.svg does not document the approved OpenCoven logo treatment');
}
assertCanonicalLogoSvg(og, 'public/og.svg');

const distIndex = path.join(distDir, 'index.html');
if (existsSync(distIndex)) {
  if (!existsSync(path.join(distDir, 'sitemap-index.xml'))) {
    throw new Error('dist/sitemap-index.xml is missing — is the @astrojs/sitemap integration still configured?');
  }
  const html = await readFile(distIndex, 'utf8');
  const renderedText = toRenderedText(html);
  const narrativeOrder = [
    'id="top"',
    'id="threshold"',
    'id="runtimes"',
    'id="boundary"',
    'id="surfaces"',
    'id="invocation"',
    'id="summon"',
  ];
  let previousPosition = -1;
  for (const marker of narrativeOrder) {
    const position = html.indexOf(marker);
    if (position <= previousPosition) {
      throw new Error(
        `Homepage narrative marker ${marker} is missing or out of order`,
      );
    }
    previousPosition = position;
  }

  const javascriptBudget = await getInitialJavascriptBudget(html);
  const maximumInitialJavascript = 20 * 1024;
  if (javascriptBudget.bytes >= maximumInitialJavascript) {
    throw new Error(
      `Homepage initial JavaScript is ${javascriptBudget.bytes} gzip bytes; budget is below ${maximumInitialJavascript}`,
    );
  }
  console.log(
    `Verified homepage initial JavaScript: ${javascriptBudget.bytes} gzip bytes across ${javascriptBudget.modules.length} module files.`,
  );

  const requiredReforgedCopy = [
    'Persistent AI Familiars',
    'Summon once. Remember forever.',
    'A familiar is an AI agent with a memory, bound to your project.',
    'the runtimes it speaks',
    'Three layers. Only one is yours to defend.',
    'One substrate. Three ways in.',
    'Three commands to first summon.',
    'Your familiar. Your tools. Your machine.',
    'Coven Cave',
    'Coven CLI',
    'Coven Code',
    'OpenAI Codex',
    'Claude Code',
    'GitHub Copilot',
    'OpenCode',
    'Grok Build',
    'Hermes Agent',
    'OpenClaw',
    'npm install -g @opencoven/cli',
    'coven doctor',
    'coven run codex "explain this repo in 5 bullets"',
    'https://discord.gg/opencoven',
    'https://testflight.apple.com/join/61Dqw8y4',
  ];
  const missingCopy = requiredReforgedCopy.filter(
    (needle) => !renderedText.includes(needle) && !html.includes(needle),
  );
  if (missingCopy.length > 0) {
    throw new Error(
      `Missing Reforged copy in dist/index.html: ${missingCopy.join(', ')}`,
    );
  }

  const reforgedAssets = [
    'claude-code-mascot.png',
    'codex-3d.png',
    'grok-3d.png',
    'openclaw-mascot.png',
    'opencode-3d.png',
    'hermes-agent.png',
    'github-copilot.png',
  ];
  const missingAssets = reforgedAssets.filter(
    (file) => !existsSync(path.join(publicDir, 'reforged', file)),
  );
  if (missingAssets.length > 0) {
    throw new Error(`Missing Reforged public assets: ${missingAssets.join(', ')}`);
  }
  for (const asset of reforgedAssets) {
    if (!html.includes(`/reforged/${asset}`)) {
      throw new Error(`Homepage does not render /reforged/${asset}`);
    }
  }

  const reforgedMedia = [
    'coven-cave-explainer.mp4',
    'coven-cave-explainer-poster.webp',
  ];
  for (const media of reforgedMedia) {
    if (!existsSync(path.join(publicDir, 'reforged', media))) {
      throw new Error(`Missing Reforged media asset: ${media}`);
    }
    if (!html.includes(`/reforged/${media}`)) {
      throw new Error(`Homepage does not render /reforged/${media}`);
    }
  }

  for (const marker of [
    'data-threshold-theater-trigger',
    'data-threshold-theater-video',
    'href="/reforged/coven-cave-explainer.mp4"',
  ]) {
    if (!html.includes(marker)) {
      throw new Error(`Homepage is missing threshold theater marker: ${marker}`);
    }
  }

  const thresholdTheaterDialog = html.match(
    /<dialog\b[^>]*\bdata-threshold-theater(?:[=\s>])[^>]*>/i,
  )?.[0];
  if (
    !thresholdTheaterDialog
    || !thresholdTheaterDialog.includes('id="threshold-video-theater"')
    || !thresholdTheaterDialog.includes('aria-labelledby="threshold-theater-title"')
  ) {
    throw new Error('Homepage is missing threshold theater dialog contract');
  }

  const runtimeChips = countMatches(html, /\bdata-runtime-chip=/g);
  const boundaryTabs = countMatches(html, /\bdata-boundary-tab=/g);
  const boundaryPanels = countMatches(html, /\bdata-boundary-panel=/g);
  const surfaceCards = countMatches(html, /\bdata-surface-card=/g);
  const invocationSteps = countMatches(html, /\bdata-invocation-step=/g);
  if (runtimeChips !== 7) {
    throw new Error(`Homepage must render seven runtime chips; found ${runtimeChips}`);
  }
  if (boundaryTabs !== 3 || boundaryPanels !== 3) {
    throw new Error(
      `Homepage must render three boundary tabs and panels; found ${boundaryTabs} and ${boundaryPanels}`,
    );
  }
  if (surfaceCards !== 3) {
    throw new Error(`Homepage must render three surface cards; found ${surfaceCards}`);
  }
  if (invocationSteps !== 3) {
    throw new Error(`Homepage must render three invocation steps; found ${invocationSteps}`);
  }

  const canonicalCopyValues = countMatches(
    html,
    /\bdata-copy-command="(?:npm install -g @opencoven\/cli|coven doctor|coven run codex (?:&quot;|&#34;)explain this repo in 5 bullets(?:&quot;|&#34;))"/g,
  );
  if (canonicalCopyValues < 3) {
    throw new Error(
      `Homepage must expose the three canonical copied commands; found ${canonicalCopyValues}`,
    );
  }

  for (const forbidden of [
    'video slot',
    'Drop a file into the project',
    'set Video source in Tweaks',
    'support.js',
    'OpenCoven Landing - Reforged.dc.html',
    'fonts.googleapis.com',
  ]) {
    if (renderedText.includes(forbidden) || html.includes(forbidden)) {
      throw new Error(`Homepage retains prototype-only content or dependency: ${forbidden}`);
    }
  }

  console.log(
    `Verified ${requiredPublicFiles.length} core assets, ${reforgedAssets.length} Reforged assets, and ${requiredReforgedCopy.length} Reforged copy contracts in dist/index.html.`,
  );
} else {
  console.log(
    `Verified ${requiredPublicFiles.length} required public files and canonical favicon + OG logos. (Skipped dist/index.html copy check — run \`npm run build\` first.)`,
  );
}

const distGithub = path.join(distDir, 'github', 'index.html');
if (existsSync(distGithub)) {
  const githubHtml = await readFile(distGithub, 'utf8');
  const requiredGithubCopy = [
    'Assign it like a teammate. Get a PR back.',
    'OpenCoven lets your team deploy a trusted familiar to GitHub.',
    'Your familiar on your GitHub',
    'Join the hosted beta',
    'Self-host the adapter',
    'launch pricing',
    '$99/mo',
    '$399/mo',
    'Contact for Pricing',
    '14-day trial',
    'Hosted beta waitlist',
    'docs/demo.md',
  ];
  const missingGithubCopy = requiredGithubCopy.filter((needle) => !githubHtml.includes(needle));
  if (missingGithubCopy.length > 0) {
    throw new Error(`Missing expected copy in dist/github/index.html: ${missingGithubCopy.join(', ')}`);
  }

  console.log(
    `Verified ${requiredGithubCopy.length} required copy strings in dist/github/index.html.`,
  );
} else {
  console.log('Skipped dist/github/index.html copy check — run `npm run build` first.');
}

const sourceCss = await readFile(path.join(root, 'src/styles/global.css'), 'utf8');
if (/(?:^|\n)\s*\.hero\s*(?:\{|,)/.test(sourceCss)) {
  throw new Error(
    'Global CSS must not retain exact .hero selectors; homepage hero styles are component-scoped',
  );
}
const sourceMain = await readFile(path.join(root, 'src/scripts/main.js'), 'utf8');
const sourceLanding = await readFile(
  path.join(root, 'src/scripts/landing.js'),
  'utf8',
);
const sourceIndex = await readFile(
  path.join(root, 'src/pages/index.astro'),
  'utf8',
);
if (
  /import\s+Ambient\s+from\s+['"]\.\.\/components\/Ambient\.astro['"]/.test(
    sourceIndex,
  )
  || /<Ambient\b/.test(sourceIndex)
) {
  throw new Error('Homepage must omit the cursor-tracked Ambient component');
}
const sourceFooter = await readFile(
  path.join(root, 'src/components/Footer.astro'),
  'utf8',
);
if (
  sourceLanding.includes('requestIdleCallback')
  || sourceLanding.includes("addEventListener('load', schedule")
) {
  throw new Error('Feedback must not schedule itself on load or idle');
}
if (
  !sourceLanding.includes("addEventListener('click', activateFeedback)")
  || !sourceLanding.includes("window.Quackback('open')")
) {
  throw new Error(
    'Feedback SDK must load and open only from launcher activation',
  );
}
if (
  sourceIndex.includes('OpenCovenFeedback')
  || sourceIndex.includes('requestIdleCallback')
  || sourceIndex.includes("addEventListener('load', schedule")
) {
  throw new Error(
    'Homepage source must not retain the obsolete eager feedback scheduler',
  );
}
for (const [label, source] of [
  ['src/components/Footer.astro', sourceFooter],
  ['src/styles/global.css', sourceCss],
]) {
  if (
    source.includes('Ecosystem')
    || source.includes('/#ecosystem')
    || source.includes('ecosystem-section')
    || source.includes('.ecosystem-')
    || source.includes('.eco-')
  ) {
    throw new Error(`${label} retains source for the removed Ecosystem section`);
  }
}
const requiredDownloadSubs = [
  'CovenCave · .dmg · signed · free',
  'CovenCave · .msi · signed · free',
  'CovenCave · .AppImage · x86_64 · free',
  'CovenCave · TestFlight · iPhone & iPad',
];
const missingDownloadSubs = requiredDownloadSubs.filter(
  (sub) => !sourceMain.includes(sub),
);
if (missingDownloadSubs.length > 0) {
  throw new Error(
    `Download CTA compatibility COPY is missing platform sublabels: ${missingDownloadSubs.join(', ')}`,
  );
}
if (sourceMain.includes('setInterval(rotate')) {
  throw new Error('Hero familiars must not rotate automatically');
}
const sourceLandingData = await readFile(
  path.join(root, 'src/data/landing.ts'),
  'utf8',
);
const sourceLedger = await readFile(
  path.join(root, 'src/components/FamiliarLedger.astro'),
  'utf8',
);
const sourceProductConstellation = await readFile(
  path.join(root, 'src/components/ProductConstellation.astro'),
  'utf8',
).catch(() => '');
const sourceQuickStart = await readFile(
  path.join(root, 'src/components/QuickStart.astro'),
  'utf8',
);

if (
  !sourceProductConstellation.includes(
    "import { quickstartProducts } from '../data/quickstart'",
  )
  || !sourceProductConstellation.includes('quickstartProducts.map')
) {
  throw new Error(
    'ProductConstellation must render from the shared quickstartProducts registry',
  );
}
for (const field of [
  'id',
  'sigil',
  'eyebrow',
  'name',
  'summary',
  'bestFor',
  'status',
  'platforms',
]) {
  if (!sourceProductConstellation.includes(`product.${field}`)) {
    throw new Error(
      `ProductConstellation must render product.${field} from the shared quickstartProducts registry`,
    );
  }
}
if (sourceProductConstellation.includes('will-change: transform')) {
  throw new Error(
    'ProductConstellation cards must not keep a permanent will-change layer',
  );
}

if (
  !sourceQuickStart.includes(
    "import { quickstartProducts } from '../data/quickstart'",
  )
  || !sourceQuickStart.includes("product.id === 'coven-cli'")
  || !sourceQuickStart.includes('previewIndexes')
) {
  throw new Error(
    'Homepage QuickStart must derive its compact commands from the Coven CLI quickstart record',
  );
}

for (const exportName of [
  'heroFamiliars',
  'storyStages',
  'trustStatements',
  'runtimeLayers',
]) {
  if (!sourceLandingData.includes(`export const ${exportName}`)) {
    throw new Error(`src/data/landing.ts must export ${exportName}`);
  }
}

for (const terminalToken of [
  '--ledger-bg: #0b0910',
  '--ledger-text: #e8e0f0',
  '--ledger-muted: #aaa1b8',
]) {
  if (!sourceLedger.includes(terminalToken)) {
    throw new Error(
      `FamiliarLedger must own immutable terminal token ${terminalToken}`,
    );
  }
}

function getCssDeclarationBlock(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|})\\s*${escapedSelector}\\s*{([^}]*)}`, 'm'))?.[1] ?? '';
}

if (!sourceCss.includes('.motion-on.reveal-ready [data-reveal]')) {
  throw new Error('Scroll reveal hidden state must wait for the reveal-ready class so first paint is readable');
}
if (!sourceMain.includes("document.documentElement.classList.add('reveal-ready')")) {
  throw new Error('Scroll reveal script must enable reveal-ready only after marking initial in-view content visible');
}

const distQuickstart = path.join(distDir, 'quickstart', 'index.html');
if (!existsSync(distQuickstart)) {
  throw new Error('dist/quickstart/index.html is missing — the onboarding hub must ship at /quickstart');
}

const quickstartHtml = await readFile(distQuickstart, 'utf8');
const quickstartText = toRenderedText(quickstartHtml);
const requiredQuickstartCopy = [
  'Choose your way into OpenCoven.',
  'Coven CLI',
  'Coven Code',
  'Coven Cave',
  'CastCodes',
  'OpenCoven for GitHub',
  'npm install -g @opencoven/cli',
  'coven doctor',
  'coven run codex',
  'coven run claude "explain this repo in 5 bullets"',
  'coven sessions --plain',
  'macOS Apple Silicon · glibc Linux x64 · Windows x64',
  'Local product paths start inside a Git-tracked project you already control. Hosted or self-hosted GitHub automation begins with repository and access setup.',
  'For local provider-backed paths, connect Anthropic or OpenAI directly; those credentials remain provider-owned. Self-hosted GitHub workers require their own provider setup, while hosted beta users follow the access path they receive.',
  'Coven CLI, Coven Code, Cave, and CastCodes share a local runtime and session history, so switching among those surfaces does not restart what you already built.',
  'Add local surfaces one at a time without repeating their shared setup. GitHub automation has separate hosted-access or self-hosted operator setup.',
  'Coven CLI, Coven Code, Cave, and CastCodes share the runtime and session history you already set up. GitHub automation has its own hosted or self-hosted access path.',
  'Coven CLI, Coven Code, Cave, and CastCodes reuse the local runtime, provider connection, and session history. GitHub automation connects separately through the hosted beta or a self-hosted deployment.',
  'Complete the prerequisites named by your guide — provider, account, runtime, or repository access — before you run anything.',
  "Follow the guide's exact steps for one small, bounded task — the same loop you can repeat after this.",
  'Your first success',
];
const missingQuickstartCopy = requiredQuickstartCopy.filter((needle) => !quickstartText.includes(needle));
if (missingQuickstartCopy.length > 0) {
  throw new Error(`Missing expected copy in dist/quickstart/index.html: ${missingQuickstartCopy.join(', ')}`);
}

const requiredQuickstartLinks = [
  'https://docs.opencoven.ai/docs/guides/install-and-first-run',
  'https://github.com/OpenCoven/coven-code',
  'https://github.com/OpenCoven/coven-cave/releases/latest',
  'https://testflight.apple.com/join/61Dqw8y4',
  'https://github.com/OpenCoven/cast-codes/releases/latest',
  'https://github.com/OpenCoven/coven-github',
];
const missingQuickstartLinks = requiredQuickstartLinks.filter(
  (needle) => !quickstartHtml.includes(`href="${needle}"`),
);
if (missingQuickstartLinks.length > 0) {
  throw new Error(`Missing canonical links in dist/quickstart/index.html: ${missingQuickstartLinks.join(', ')}`);
}

const lightThemeCommandCode = getCssDeclarationBlock(
  sourceCss,
  'html[data-theme="light"] .quickstart-page .onboard-command code',
);
const hasLightThemeCommandReset = [
  /background\s*:\s*transparent\s*;/,
  /color\s*:\s*rgba\(\s*232\s*,\s*224\s*,\s*240\s*,\s*0\.92\s*\)\s*;/,
  /border\s*:\s*0\s*;/,
  /padding\s*:\s*0\s*;/,
].every((declaration) => declaration.test(lightThemeCommandCode));
if (!hasLightThemeCommandReset) {
  throw new Error('Light-theme quickstart commands must reset inline-code chrome on the dark command surface');
}

if (!/<ol\s+class="onboard-route-list"\s+role="list"\s*>/.test(quickstartHtml)) {
  throw new Error('Quickstart route must preserve ordered-list semantics with role="list"');
}

const productProcedureLists =
  quickstartHtml.match(/<ol\s+class="onboard-steps"\s+role="list"\s*>/g) ?? [];
if (productProcedureLists.length !== 5) {
  throw new Error('Quickstart product procedures must include exactly five ordered lists with role="list"');
}

const foundationListMatches = quickstartHtml.match(
  /<ul\s+class="onboard-foundation-grid"\s+role="list"\s*>/g,
) ?? [];
if (foundationListMatches.length !== 1) {
  throw new Error(
    'Quickstart foundation list semantics must render exactly one <ul class="onboard-foundation-grid" role="list"> in dist/quickstart/index.html',
  );
}

const prerequisiteListMatches = quickstartHtml.match(
  /<ul\s+class="onboard-requirements-list"\s+role="list"\s*>/g,
) ?? [];
if (prerequisiteListMatches.length !== 5) {
  throw new Error(
    'Quickstart prerequisite list semantics must render exactly five <ul class="onboard-requirements-list" role="list"> blocks in dist/quickstart/index.html',
  );
}

if (!quickstartHtml.includes('Step 1 of 4:') || !quickstartHtml.includes('Step 4 of 4:')) {
  throw new Error('Quickstart ordered lists must include accessible spoken step labels');
}

const chooserHtml = quickstartHtml.match(
  /<nav\s+class="onboard-chooser-nav"[^>]*>([\s\S]*?)<\/nav>/,
)?.[1];
if (!chooserHtml) {
  throw new Error('Quickstart product chooser navigation is missing');
}

for (const { id, name } of productContracts) {
  const escapedId = escapeRegExp(id);
  const escapedName = escapeRegExp(name);
  const articlePattern = new RegExp(
    `<article(?=[^>]*\\bid="${escapedId}")(?=[^>]*\\baria-labelledby="${escapedId}-heading")[^>]*>`,
    'g',
  );
  const articleCount = countMatches(quickstartHtml, articlePattern);
  if (articleCount !== 1) {
    throw new Error(
      `${name} must render exactly one product article with id="${id}" and aria-labelledby="${id}-heading"; found ${articleCount}`,
    );
  }

  const headingPattern = new RegExp(
    `<h2\\s+id="${escapedId}-heading">${escapedName}</h2>`,
    'g',
  );
  const headingCount = countMatches(quickstartHtml, headingPattern);
  if (headingCount !== 1) {
    throw new Error(
      `${name} must render exactly one <h2 id="${id}-heading">${name}</h2>; found ${headingCount}`,
    );
  }

  const chooserLinkPattern = new RegExp(`href="#${escapedId}"`, 'g');
  const chooserLinkCount = countMatches(chooserHtml, chooserLinkPattern);
  if (chooserLinkCount !== 1) {
    throw new Error(
      `${name} chooser must render exactly one href="#${id}" link; found ${chooserLinkCount}`,
    );
  }
}

const arrivalCount = countMatches(
  quickstartHtml,
  /<div\s+class="onboard-arrival">/g,
);
if (arrivalCount !== 5) {
  throw new Error(`Quickstart must render exactly five .onboard-arrival success blocks; found ${arrivalCount}`);
}

const recoveryCount = countMatches(
  quickstartHtml,
  /<details\s+class="onboard-recovery">/g,
);
if (recoveryCount !== 5) {
  throw new Error(`Quickstart must render exactly five <details class="onboard-recovery"> disclosures; found ${recoveryCount}`);
}

const currentQuickstartLinkCount = countMatches(
  quickstartHtml,
  /href="\/quickstart"\s+aria-current="page"/g,
);
if (currentQuickstartLinkCount !== 3) {
  throw new Error(
    `Quickstart page must render exactly three current /quickstart links across desktop, mobile, and footer navigation; found ${currentQuickstartLinkCount}`,
  );
}

const expectedQuickstartTitle =
  '<title>OpenCoven Quickstart — Choose Your First Product</title>';
if (!quickstartHtml.includes(expectedQuickstartTitle)) {
  throw new Error(`Quickstart page must render the expected title: ${expectedQuickstartTitle}`);
}
const expectedQuickstartCanonical =
  '<link rel="canonical" href="https://opencoven.ai/quickstart">';
if (!quickstartHtml.includes(expectedQuickstartCanonical)) {
  throw new Error(`Quickstart page must render the exact canonical link: ${expectedQuickstartCanonical}`);
}

const jsonLdSource = quickstartHtml.match(
  /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/,
)?.[1];
if (!jsonLdSource) {
  throw new Error('Quickstart page must render an application/ld+json script');
}

let quickstartJsonLd;
try {
  quickstartJsonLd = JSON.parse(jsonLdSource);
} catch (error) {
  throw new Error(`Quickstart application/ld+json must be valid JSON: ${error.message}`);
}
if (quickstartJsonLd['@type'] !== 'CollectionPage') {
  throw new Error('Quickstart JSON-LD @type must be CollectionPage');
}
if (quickstartJsonLd.mainEntity?.['@type'] !== 'ItemList') {
  throw new Error('Quickstart JSON-LD mainEntity @type must be ItemList');
}

const expectedJsonLdItems = productContracts.map(({ id, name }, index) => ({
  '@type': 'ListItem',
  position: index + 1,
  name,
  url: `https://opencoven.ai/quickstart#${id}`,
}));
if (
  JSON.stringify(quickstartJsonLd.mainEntity.itemListElement)
  !== JSON.stringify(expectedJsonLdItems)
) {
  throw new Error(
    'Quickstart JSON-LD must list exactly the five product contracts in chooser order with matching positions, names, and canonical fragment URLs',
  );
}

const lightThemeCurrentLink = getCssDeclarationBlock(
  sourceCss,
  'html[data-theme="light"] a[aria-current="page"]',
);
if (!/color\s*:\s*var\(--vtext\)\s*;/.test(lightThemeCurrentLink)) {
  throw new Error('Light-theme current-page links must explicitly use color: var(--vtext);');
}

for (const { id, name } of productContracts.filter(({ id }) =>
  ['coven-cli', 'coven-code', 'coven-cave'].includes(id)
)) {
  const articleHtml = quickstartHtml.match(
    new RegExp(
      `<article(?=[^>]*\\bid="${escapeRegExp(id)}")[^>]*>[\\s\\S]*?</article>`,
    ),
  )?.[0];
  if (!articleHtml) {
    throw new Error(`Could not extract the ${name} product article for cross-platform command checks`);
  }
  if (articleHtml.includes('/path/to/your/project')) {
    throw new Error(`${name} must not use the POSIX-specific /path/to/your/project placeholder`);
  }
  if (/&&|&amp;&amp;|&#38;&#38;|&#x26;&#x26;/i.test(articleHtml)) {
    throw new Error(`${name} must not use POSIX compound && commands in copied command blocks`);
  }
}

console.log(
  `Verified quickstart content, five product contracts, discovery links, navigation, command portability, and structured data in dist/quickstart/index.html.`,
);
