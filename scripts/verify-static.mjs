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

const requiredRoutes = [
  'index.html',
  'quickstart/index.html',
  'github/index.html',
  'how-it-works/index.html',
  'privacy/index.html',
  'terms/index.html',
];
for (const route of requiredRoutes) {
  if (!existsSync(path.join(distDir, route))) {
    throw new Error(`Missing built route: dist/${route}`);
  }
}
if (!existsSync(path.join(distDir, 'sitemap-index.xml'))) {
  throw new Error('dist/sitemap-index.xml is missing');
}

const readDist = (route) => readFile(path.join(distDir, route), 'utf8');
const [home, quickstart, github, howItWorks, privacy, terms] = await Promise.all(
  requiredRoutes.map(readDist),
);

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

// The shell migration is intentionally staged. This PR owns the homepage,
// Quickstart, and GitHub routes; #80 will move how-it-works and legal/trust
// routes onto SiteLayout and expand canonical enforcement to them.
for (const [html, route] of [
  [home, '/'],
  [quickstart, '/quickstart'],
  [github, '/github'],
]) {
  assertCanonical(html, route);
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

const allPages = [home, quickstart, github, howItWorks, privacy, terms];
for (const [index, html] of allPages.entries()) {
  if (!/<main\b/.test(html)) {
    throw new Error(`Built page ${index + 1} has no main landmark`);
  }
  const h1Count = (html.match(/<h1\b/g) ?? []).length;
  if (h1Count !== 1) {
    throw new Error(`Built page ${index + 1} must contain exactly one h1; found ${h1Count}`);
  }
  if (html.includes('fonts.googleapis.com')) {
    throw new Error(`Built page ${index + 1} loads a remote Google Fonts stylesheet`);
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
  'src/styles/vnext.css',
  'src/styles/routes.css',
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

assertContains(renderedText(howItWorks), ['OpenCoven'], 'How-it-works route');
assertContains(renderedText(privacy), ['Privacy'], 'Privacy route');
assertContains(renderedText(terms), ['Terms'], 'Terms route');

console.log(
  `Verified ${requiredPublicFiles.length} public assets, ${requiredRoutes.length} active routes, vNext homepage semantics, canonical Quickstart, bounded GitHub delivery, and current static release contracts.`,
);
