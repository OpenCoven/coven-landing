import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'brand.css');
const html = await readFile(htmlPath, 'utf8');
const css = await readFile(cssPath, 'utf8');

const requiredFiles = [
  'index.html',
  'brand.css',
  'favicon.svg',
  'apple-touch-icon.png',
  'og.png',
  'og.svg',
  'assets/color-tokens.css',
  'assets/typography.css',
];

const missing = requiredFiles.filter((file) => !existsSync(path.join(root, file)));
if (missing.length > 0) {
  throw new Error(`Missing required files: ${missing.join(', ')}`);
}

const refs = new Set();
const attrPattern = /(?:href|src)=["']([^"']+)["']/g;
for (const match of html.matchAll(attrPattern)) refs.add(match[1]);
const importPattern = /@import\s+url\(["']?([^"')]+)["']?\)/g;
for (const match of css.matchAll(importPattern)) refs.add(match[1]);

const broken = [];
for (const ref of refs) {
  if (
    ref.startsWith('#') ||
    ref.startsWith('http://') ||
    ref.startsWith('https://') ||
    ref.startsWith('mailto:')
  ) {
    continue;
  }

  const local = ref.split('#')[0].split('?')[0];
  if (!local || local === './README.md') continue;
  const filePath = path.resolve(root, local);
  if (!filePath.startsWith(root) || !existsSync(filePath)) broken.push(ref);
}

if (broken.length > 0) {
  throw new Error(`Broken local references: ${broken.join(', ')}`);
}

const requiredCopy = [
  'Controlled multi-agent',
  'Rust authority boundary',
  'attachable',
  'SQLite-backed',
  'Codex',
  'Claude Code',
  'comux',
  'OpenMeow',
  'OpenClaw',
];
const missingCopy = requiredCopy.filter((needle) => !html.includes(needle));
if (missingCopy.length > 0) {
  throw new Error(`Missing expected copy: ${missingCopy.join(', ')}`);
}

const assertCanonicalLogoSvg = (content, label) => {
  if (content.includes('currentColor')) {
    throw new Error(`${label} still uses the generated/currentColor mark instead of canonical logo fills`);
  }
  if (!content.includes('fill="#000000"') || !content.includes('fill="#FFFFFF"')) {
    throw new Error(`${label} must use the white-on-black OpenCoven logo variant`);
  }
};

const favicon = await readFile(path.join(root, 'favicon.svg'), 'utf8');
if (!favicon.includes('viewBox="0 0 2272 2272"')) {
  throw new Error('favicon.svg is not the canonical OpenCoven logo viewBox');
}
assertCanonicalLogoSvg(favicon, 'favicon.svg');

const og = await readFile(path.join(root, 'og.svg'), 'utf8');
if (!og.includes('Canonical OpenCoven logo from brand/logo/opencoven-logo.svg')) {
  throw new Error('og.svg does not document the canonical OpenCoven logo source');
}
assertCanonicalLogoSvg(og, 'og.svg');

console.log(`Verified ${requiredFiles.length} required files, ${refs.size} static references, canonical favicon logo, and canonical OG logo.`);
