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
 */

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
  const requiredCopy = [
    'Persistent AI Familiars',
    'AI that can stay',
    'familiars',
    'CastCodes',
    'Coven CLI',
    'Quick Start',
    'https://discord.gg/opencoven',
  ];
  const missingCopy = requiredCopy.filter((needle) => !html.includes(needle));
  if (missingCopy.length > 0) {
    throw new Error(`Missing expected copy in dist/index.html: ${missingCopy.join(', ')}`);
  }

  const downloadLabels = [
    'Download for macOS', // server-rendered primary (JS retargets per platform)
    'Download for iOS', // dedicated TestFlight button (JS swaps to macOS on iOS)
  ];
  // Scope to the CTA block — words like "Windows" also appear in the
  // head's JSON-LD, which would confuse a whole-document indexOf.
  const ctaStart = html.indexOf('data-download-cta');
  if (ctaStart === -1) {
    throw new Error('dist/index.html is missing the data-download-cta block');
  }
  const ctaHtml = html.slice(ctaStart);
  const downloadLabelPositions = downloadLabels.map((label) => ({
    label,
    index: ctaHtml.indexOf(label),
  }));
  const missingDownloadLabels = downloadLabelPositions
    .filter(({ index }) => index === -1)
    .map(({ label }) => label);
  if (missingDownloadLabels.length > 0) {
    throw new Error(`Missing expected download labels in dist/index.html: ${missingDownloadLabels.join(', ')}`);
  }
  for (let i = 1; i < downloadLabelPositions.length; i += 1) {
    if (downloadLabelPositions[i - 1].index > downloadLabelPositions[i].index) {
      throw new Error('Download CTA order must be the macOS primary, then the iOS (TestFlight) button');
    }
  }

  if (!html.includes('data-download-primary') || !html.includes('data-download-ios')) {
    throw new Error('Download CTA must render the retargetable primary button and the dedicated iOS button');
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
if (!existsSync(distGithub)) {
  console.log('Skipped dist/github/index.html copy check — run `npm run build` first.'); process.exit(0);
}

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

const sourceCss = await readFile(path.join(root, 'src/styles/global.css'), 'utf8');
const sourceMain = await readFile(path.join(root, 'src/scripts/main.js'), 'utf8');
if (!sourceCss.includes('.motion-on.reveal-ready [data-reveal]')) {
  throw new Error('Scroll reveal hidden state must wait for the reveal-ready class so first paint is readable');
}
if (!sourceMain.includes("document.documentElement.classList.add('reveal-ready')")) {
  throw new Error('Scroll reveal script must enable reveal-ready only after marking initial in-view content visible');
}

console.log(
  `Verified ${requiredGithubCopy.length} required copy strings in dist/github/index.html.`,
);
