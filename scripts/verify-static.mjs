import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');

const requiredPublicFiles = [
  'favicon.svg',
  'apple-touch-icon.png',
  'og.png',
  'og.svg',
  'robots.txt',
];
const missingPublic = requiredPublicFiles.filter(
  (file) => !existsSync(path.join(publicDir, file)),
);
if (missingPublic.length) {
  throw new Error(`Missing required public files: ${missingPublic.join(', ')}`);
}

const favicon = await readFile(path.join(publicDir, 'favicon.svg'), 'utf8');
if (!favicon.includes('viewBox="0 0 512 512"')) {
  throw new Error('public/favicon.svg is not the expected OpenCoven favicon viewBox');
}
if (!/#0{3,6}/i.test(favicon) || !/#f{3,6}/i.test(favicon)) {
  throw new Error('public/favicon.svg must retain a high-contrast monochrome treatment');
}

const routeFiles = {
  home: 'index.html',
  quickstart: 'quickstart/index.html',
  github: 'github/index.html',
  howItWorks: 'how-it-works/index.html',
  protocol: 'protocol/index.html',
  security: 'security/index.html',
  status: 'status/index.html',
  privacy: 'privacy/index.html',
  terms: 'terms/index.html',
};

for (const route of Object.values(routeFiles)) {
  if (!existsSync(path.join(distDir, route))) {
    throw new Error(`Missing built route: dist/${route}`);
  }
}
if (!existsSync(path.join(distDir, 'sitemap-index.xml'))) {
  throw new Error('dist/sitemap-index.xml is missing');
}

const entries = await Promise.all(
  Object.entries(routeFiles).map(async ([key, route]) => [
    key,
    await readFile(path.join(distDir, route), 'utf8'),
  ]),
);
const pages = Object.fromEntries(entries);
const {
  home,
  quickstart,
  github,
  howItWorks,
  protocol,
  security,
  status,
  privacy,
  terms,
} = pages;

const renderedText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/(?:&#39;|&#x27;)/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const assertContains = (content, needles, label) => {
  const missing = needles.filter((needle) => !content.includes(needle));
  if (missing.length) {
    throw new Error(`${label} is missing: ${missing.join(', ')}`);
  }
};

const assertCanonical = (html, pathName) => {
  const expected = new URL(pathName, 'https://opencoven.ai').toString();
  if (
    !html.includes(`<link rel="canonical" href="${expected}">`)
    && !html.includes(`<link rel="canonical" href="${expected}"`)
  ) {
    throw new Error(`${pathName} is missing canonical URL ${expected}`);
  }
};

const jsonLdDocuments = (html) => {
  const blocks = [...html.matchAll(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )].map((match) => JSON.parse(match[1]));
  return blocks.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
};

for (const [key, route] of Object.entries(routeFiles)) {
  const pathname = route === 'index.html'
    ? '/'
    : `/${route.replace(/\/index\.html$/, '')}`;
  assertCanonical(pages[key], pathname);
}

const homeText = renderedText(home);
assertContains(
  homeText,
  [
    'Give your agents continuity. Keep authority local.',
    'Trust starts with boundaries.',
    'Identity → authority → continuity.',
    'A concrete local proof.',
    'Two sessions claim the same surface.',
    'Coven holds the second protected write.',
    'The principal decides.',
    'Choose the surface that matches the job.',
    'One canonical local start.',
    'npm install -g @opencoven/cli',
    'coven doctor',
    'coven',
  ],
  'vNext homepage',
);

for (const hook of [
  'data-oc-primitive="global-navigation"',
  'data-oc-primitive="mobile-navigation"',
  'data-oc-primitive="guided-proof"',
  'data-oc-state=',
]) {
  if (!home.includes(hook)) throw new Error(`Homepage is missing ${hook}`);
}

for (const forbidden of [
  'https://unpkg.com/three',
  'min-width: 1140px',
  'data-r="shell"',
  "Stop being your agents' control plane.",
]) {
  if (home.includes(forbidden)) {
    throw new Error(`Homepage retains retired vNext content or dependency: ${forbidden}`);
  }
}

if (!/<details[^>]*class="mobile-nav"/.test(home)) {
  throw new Error('Mobile navigation must remain a native details/summary disclosure');
}
if (/role="dialog"[^>]*aria-modal="true"/.test(home)) {
  throw new Error('Site navigation must not be exposed as a modal dialog');
}

for (const [key, html] of Object.entries(pages)) {
  if (!/<main\b/.test(html)) {
    throw new Error(`Built page ${key} has no main landmark`);
  }
  const h1Count = (html.match(/<h1\b/g) ?? []).length;
  if (h1Count !== 1) {
    throw new Error(`Built page ${key} must contain exactly one h1; found ${h1Count}`);
  }
  if (html.includes('fonts.googleapis.com')) {
    throw new Error(`Built page ${key} loads a remote Google Fonts stylesheet`);
  }
  if (/\bstyle="/.test(html)) {
    throw new Error(`Built page ${key} contains inline presentation styles`);
  }
}

async function initialJavascriptGzip(html) {
  const paths = [
    ...html.matchAll(
      /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*>/g,
    ),
  ]
    .map((match) => match[1])
    .filter((src) => src.startsWith('/') && src.split('?')[0].endsWith('.js'));
  const seen = new Set();
  const queue = [...paths];
  let total = 0;
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    const clean = current.split('?')[0];
    const absolute = path.join(distDir, clean.replace(/^\//, ''));
    if (!existsSync(absolute)) {
      throw new Error(`Referenced initial module is missing: ${clean}`);
    }
    const source = await readFile(absolute, 'utf8');
    total += gzipSync(source).byteLength;
    for (const match of source.matchAll(
      /(?:from\s*|import\s*)["']([^"']+\.js(?:\?[^"']*)?)["']/g,
    )) {
      const specifier = match[1].split('?')[0];
      if (!specifier.startsWith('.')) continue;
      queue.push(
        path.posix.normalize(path.posix.join(path.posix.dirname(clean), specifier)),
      );
    }
  }
  const inline = [
    ...html.matchAll(
      /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ];
  total += inline.reduce(
    (sum, match) => sum + gzipSync(match[1]).byteLength,
    0,
  );
  return { bytes: total, modules: [...seen] };
}

for (const [label, html, budget] of [
  ['Homepage', home, 75 * 1024],
  ['Quickstart', quickstart, 25 * 1024],
  ['GitHub route', github, 20 * 1024],
  ['How-it-works route', howItWorks, 20 * 1024],
  ['Protocol route', protocol, 20 * 1024],
  ['Security route', security, 20 * 1024],
  ['Status route', status, 20 * 1024],
  ['Privacy route', privacy, 20 * 1024],
  ['Terms route', terms, 20 * 1024],
]) {
  const javascript = await initialJavascriptGzip(html);
  if (javascript.bytes > budget) {
    throw new Error(
      `${label} initial JavaScript is ${javascript.bytes} gzip bytes; hard budget is ${budget}`,
    );
  }
  console.log(
    `Verified ${label.toLowerCase()} initial JavaScript: ${javascript.bytes} gzip bytes across ${javascript.modules.length} module files.`,
  );
}

const sourceFiles = [
  'src/pages/index.astro',
  'src/pages/quickstart.astro',
  'src/pages/github.astro',
  'src/pages/how-it-works.astro',
  'src/pages/protocol.astro',
  'src/pages/security.astro',
  'src/pages/status.astro',
  'src/pages/privacy.astro',
  'src/pages/terms.astro',
  'src/styles/vnext.css',
  'src/styles/routes.css',
  'src/styles/legal.css',
  'src/layouts/SiteLayout.astro',
];
for (const relative of sourceFiles) {
  const source = await readFile(path.join(root, relative), 'utf8');
  if (/\[style[*^$|~]?=/.test(source)) {
    throw new Error(
      `${relative} must not select responsive behavior by serialized inline style text`,
    );
  }
  if (/\bstyle="/.test(source)) {
    throw new Error(`${relative} must not reintroduce inline presentation styles`);
  }
}

const homeSource = await readFile(path.join(root, 'src/pages/index.astro'), 'utf8');
for (const forbidden of [
  '<RedesignHero',
  '<BoardSection',
  '<Ambient',
  'warded-braid.js',
  'unpkg.com/three',
]) {
  if (homeSource.includes(forbidden)) {
    throw new Error(`Homepage source retains retired implementation: ${forbidden}`);
  }
}

const quickstartText = renderedText(quickstart);
assertContains(
  quickstartText,
  [
    'Start with one local foundation.',
    'Three commands. One canonical source.',
    'Then branch by job, not by branding.',
    'Historical lineage stays visible, not recommended.',
    'npm install -g @opencoven/cli',
    'coven doctor',
    'Coven CLI',
    'Coven Code',
    'Coven Cave',
    'OpenCoven for GitHub',
    'CastCodes',
    'Archived · use Coven Code',
  ],
  'Quickstart route',
);
const activeCards = quickstart.match(/data-product-lifecycle="active"/g) ?? [];
const archiveCards = quickstart.match(/data-product-lifecycle="archived"/g) ?? [];
if (activeCards.length !== 4 || archiveCards.length !== 1) {
  throw new Error(
    `Quickstart must render four active cards and one archive record; found ${activeCards.length} active and ${archiveCards.length} archived`,
  );
}
for (const productId of ['coven-cli', 'coven-code', 'coven-cave', 'github', 'castcodes']) {
  if (!quickstart.includes(`id="${productId}"`)) {
    throw new Error(`Quickstart is missing stable product fragment #${productId}`);
  }
}
if ((quickstart.match(/data-oc-primitive="copy-control"/g) ?? []).length !== 3) {
  throw new Error('Quickstart must render exactly three copy-control primitives');
}
if (/\bcoven init\b/i.test(quickstartText)) {
  throw new Error('Quickstart retains obsolete coven init guidance');
}
const collection = jsonLdDocuments(quickstart).find(
  (document) => document['@type'] === 'CollectionPage',
);
if (!collection) throw new Error('Quickstart is missing CollectionPage JSON-LD');
const collectionItems = collection.mainEntity?.itemListElement;
if (!Array.isArray(collectionItems) || collectionItems.length !== 4) {
  throw new Error('Quickstart CollectionPage JSON-LD must contain four active products');
}
if (collectionItems.some((item) => item.name === 'CastCodes')) {
  throw new Error('Quickstart active JSON-LD must not promote CastCodes');
}

const githubText = renderedText(github);
assertContains(
  githubText,
  [
    'Assign bounded work. Get inspectable delivery back.',
    'Availability boundary',
    'The work stays legible in GitHub.',
    'Assign bounded work.',
    'Watch the Check Run.',
    'Receive familiar status.',
    'Review the draft pull request.',
    'Keep Cave oversight.',
    'Hosted access gated',
    'Public operator path',
    'Choose the deployment path you can verify.',
    'Inspect the implementation evidence.',
  ],
  'GitHub route',
);
for (const forbidden of [
  '$99/mo',
  '$399/mo',
  '14-day trial',
  'Contact for Pricing',
  'Assign it like a teammate',
]) {
  if (githubText.includes(forbidden)) {
    throw new Error(`GitHub route retains unsupported marketing claim: ${forbidden}`);
  }
}
const application = jsonLdDocuments(github).find(
  (document) => document['@type'] === 'SoftwareApplication',
);
if (!application) throw new Error('GitHub route is missing SoftwareApplication JSON-LD');
if ('offers' in application) {
  throw new Error('GitHub route must not publish unverified Offer structured data');
}
if ((github.match(/data-oc-state="unavailable"/g) ?? []).length < 2) {
  throw new Error('GitHub route must expose gated hosted availability as unavailable state');
}
if (!github.includes('data-oc-state="success"')) {
  throw new Error('GitHub route must expose the public self-hosted path as success state');
}

const howItWorksText = renderedText(howItWorks);
assertContains(
  howItWorksText,
  [
    'The local layer your agent sessions share.',
    'One project, shared local evidence.',
    'What Coven owns—and what it does not.',
    'Runtime authority',
    'Not identity definition',
    'Not orchestration policy',
    'npm install -g @opencoven/cli',
    'coven doctor',
  ],
  'How-it-works route',
);
for (const forbidden of ['data-r="shell"', 'min-width: 1140px', '<warded-braid', 'OpenClaw']) {
  if (howItWorks.includes(forbidden)) {
    throw new Error(`How-it-works route retains legacy implementation content: ${forbidden}`);
  }
}

const protocolText = renderedText(protocol);
assertContains(
  protocolText,
  [
    'Identity is not authority. Continuity is not a copied prompt.',
    'Familiar Contract',
    'SPAR Familiar Continuity Profile',
    'Psyche',
    'Coven runtime',
    'Cave',
    'Mixed maturity',
    'The term does not imply personhood or independent legal agency.',
    'A name in configuration is not sufficient authorization.',
    'It is not a second identity root or ledger.',
  ],
  'Protocol route',
);
for (const forbidden of ['same AI everywhere', 'never forgets', 'fully compliant', 'IAM replacement']) {
  if (protocolText.toLowerCase().includes(forbidden.toLowerCase())) {
    throw new Error(`Protocol route contains prohibited overclaim: ${forbidden}`);
  }
}

const securityText = renderedText(security);
assertContains(
  securityText,
  [
    'Report vulnerabilities privately. Verify what you run.',
    'privately DM @BunsDev',
    'Do not post vulnerability details in a public Discord channel.',
    'Open a private security advisory',
    'Response targets',
    'not a contractual service-level agreement',
    'No public claim of SOC 2, ISO 27001, third-party audit, formal certification, or complete conformance is made here.',
  ],
  'Security route',
);
if (securityText.includes('open a public GitHub issue')) {
  throw new Error('Security route suggests public vulnerability disclosure');
}

const statusText = renderedText(status);
assertContains(
  statusText,
  [
    'Status should come from data, not memory.',
    '4 current · 1 archived',
    'Coven CLI',
    'Coven Code',
    'Coven Cave',
    'OpenCoven for GitHub',
    'CastCodes',
    'Successor: Coven Code',
    'Archived · use Coven Code',
  ],
  'Status route',
);
if ((status.match(/data-status-active-products/g) ?? []).length !== 1) {
  throw new Error('Status route must render one active registry surface');
}
if ((status.match(/data-product-id=/g) ?? []).length !== 5) {
  throw new Error('Status route must render four active products and one archive record');
}
if (status.includes('successorId')) {
  throw new Error('Status route retains the nonexistent successorId field');
}

const privacyText = renderedText(privacy);
assertContains(
  privacyText,
  [
    'Privacy Policy',
    'Last updated: August 31, 2026',
    'Analytics are disabled by default.',
    'session replay, heatmaps, and broad autocapture are excluded',
    'The default build does not load the analytics client.',
    'We do not sell your data.',
  ],
  'Privacy route',
);

const termsText = renderedText(terms);
assertContains(
  termsText,
  [
    'Terms of Service',
    'Effective date: May 27, 2026',
    'Open Source License',
    'Third-Party AI Providers',
    'No Warranty',
    'Limitation of Liability',
    'State of Texas',
  ],
  'Terms route',
);

const legalRegister = JSON.parse(
  await readFile(path.join(root, 'docs/legal/document-register.json'), 'utf8'),
);
if (legalRegister.schemaVersion !== 'opencoven.legal-document-register/v1') {
  throw new Error('Legal document register has an unexpected schema version');
}
const privacyRecord = legalRegister.documents.find((item) => item.route === '/privacy');
const termsRecord = legalRegister.documents.find((item) => item.route === '/terms');
if (privacyRecord?.lastUpdated !== '2026-08-31') {
  throw new Error('Privacy register date does not match the published policy');
}
if (termsRecord?.lastUpdated !== '2026-05-27') {
  throw new Error('Terms register date does not match the preserved terms text');
}

for (const requiredHref of ['/how-it-works', '/protocol', '/quickstart', '/github']) {
  if ((home.match(new RegExp(`href="${requiredHref.replace('/', '\\/')}"`, 'g')) ?? []).length < 2) {
    throw new Error(`Shared desktop/mobile navigation is missing ${requiredHref}`);
  }
}
for (const footerHref of ['/security', '/status']) {
  if (!home.includes(`href="${footerHref}"`)) {
    throw new Error(`Shared footer is missing ${footerHref}`);
  }
}

console.log(
  `Verified ${requiredPublicFiles.length} public assets, ${Object.keys(routeFiles).length} canonical routes, vNext product/runtime/protocol/security/status/legal truth, and current static release contracts.`,
);
