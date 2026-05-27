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
 */

const root = process.cwd();
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');

const requiredPublicFiles = [
  'favicon.svg',
  'apple-touch-icon.png',
  'og.png',
  'og.svg',
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
  if (!content.includes('fill="#000000"') || !content.includes('fill="#FFFFFF"')) {
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
  console.log(
    `Verified ${requiredPublicFiles.length} required public files, canonical favicon + OG logos, and ${requiredCopy.length} required copy strings in dist/index.html.`,
  );
} else {
  console.log(
    `Verified ${requiredPublicFiles.length} required public files and canonical favicon + OG logos. (Skipped dist/index.html copy check — run \`npm run build\` first.)`,
  );
}
