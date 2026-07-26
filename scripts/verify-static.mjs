import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

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
  // The sitemap only exists post-build; guard the @astrojs/sitemap
  // integration against accidental removal from astro.config.mjs.
  if (!existsSync(path.join(distDir, 'sitemap-index.xml'))) {
    throw new Error('dist/sitemap-index.xml is missing — is the @astrojs/sitemap integration still configured?');
  }
  const html = await readFile(distIndex, 'utf8');
  const renderedText = toRenderedText(html);
  const requiredCopy = [
    'Persistent AI Familiars',
    'familiars',
    'Coven CLI',
    'Quick Start',
    'https://discord.gg/opencoven',
  ];
  const missingCopy = requiredCopy.filter((needle) => !html.includes(needle));
  if (missingCopy.length > 0) {
    throw new Error(`Missing expected copy in dist/index.html: ${missingCopy.join(', ')}`);
  }

  const requiredHeroCopy = [
    'Summon agents that remember.',
    'Start with OpenCoven',
    'View on GitHub',
    'example · local',
    'Download Coven Cave for macOS',
  ];
  const missingHeroCopy = requiredHeroCopy.filter(
    (needle) => !renderedText.includes(needle),
  );
  if (missingHeroCopy.length > 0) {
    throw new Error(
      `Missing Living Familiar hero copy in dist/index.html: ${missingHeroCopy.join(', ')}`,
    );
  }

  const heroHtml = html.match(
    /<section(?=[^>]*\bclass="hero")(?=[^>]*\bid="top")[^>]*>([\s\S]*?)<\/section>/,
  )?.[1];
  if (!heroHtml) {
    throw new Error('Homepage must render <section class="hero" id="top">');
  }

  if (
    !/<a(?=[^>]*\bdata-primary-cta)(?=[^>]*\bhref="\/quickstart")[^>]*>\s*Start with OpenCoven\s*<\/a>/.test(
      heroHtml,
    )
  ) {
    throw new Error('Hero primary CTA must be Start with OpenCoven → /quickstart');
  }

  const familiarTabs = countMatches(heroHtml, /\bdata-familiar-tab=/g);
  const familiarPanels = countMatches(heroHtml, /\bdata-familiar-panel=/g);
  if (familiarTabs !== 3 || familiarPanels !== 3) {
    throw new Error(
      `Hero must render three manual familiar tabs and panels; found ${familiarTabs} tabs and ${familiarPanels} panels`,
    );
  }

  if (!html.includes('data-download-primary')) {
    throw new Error('Hero must preserve one platform-aware Cave download shortcut');
  }
  if (html.includes('data-download-ios')) {
    throw new Error('The quiet hero shortcut must not render a competing iOS download button');
  }

  const previewClarification =
    "Follow doctor's exact Codex or Claude Code install/auth next step. This compact preview uses Codex; the full product guide includes the Claude run.";
  if (!renderedText.includes(previewClarification)) {
    throw new Error('Homepage compact quickstart must clarify that its Codex preview links to a full guide with the Claude run');
  }

  console.log(
    `Verified ${requiredPublicFiles.length} required public files, canonical favicon + OG logos, and ${requiredCopy.length} required copy strings in dist/index.html.`,
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
const sourceMain = await readFile(path.join(root, 'src/scripts/main.js'), 'utf8');
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

const productContracts = [
  { id: 'coven-cli', name: 'Coven CLI' },
  { id: 'coven-code', name: 'Coven Code' },
  { id: 'coven-cave', name: 'Coven Cave' },
  { id: 'castcodes', name: 'CastCodes' },
  { id: 'github', name: 'OpenCoven for GitHub' },
];

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
