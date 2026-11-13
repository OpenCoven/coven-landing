import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');

async function filesUnder(directory, suffix) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute, suffix));
    else if (entry.isFile() && entry.name.endsWith(suffix)) files.push(absolute);
  }
  return files;
}

const [downloadPage, products, layout, register, roadmap] = await Promise.all([
  readFile(path.join(root, 'src/pages/download.astro'), 'utf8'),
  readFile(path.join(root, 'src/data/products.ts'), 'utf8'),
  readFile(path.join(root, 'src/layouts/SiteLayout.astro'), 'utf8'),
  readFile(path.join(root, 'docs/public-truth-register.md'), 'utf8'),
  readFile(path.join(root, 'ROADMAP.md'), 'utf8'),
]);

const activeDownloadSurface = `${downloadPage}\n${products}\n${layout}`;
for (const forbidden of [
  'coven init',
  'new Blob',
  '.getReader(',
  'chunks.push',
  'URL.createObjectURL',
  'streamDownload',
  "register('startDownload'",
  "'/stream/",
  '"/stream/',
]) {
  if (activeDownloadSurface.includes(forbidden)) {
    throw new Error(`Active downloader retains obsolete behavior/copy: ${forbidden}`);
  }
}

for (const deadDestination of [
  'https://opencoven.ai/cave',
  'https://opencoven.ai/cli',
  'https://opencoven.ai/code',
]) {
  if (activeDownloadSurface.includes(deadDestination)) {
    throw new Error(`Public navigation retains nonexistent product destination: ${deadDestination}`);
  }
}
for (const requiredDestination of [
  'https://github.com/OpenCoven/coven-cave/releases/latest',
  'https://www.npmjs.com/package/@opencoven/cli',
  'https://github.com/OpenCoven/coven-code',
]) {
  if (!activeDownloadSurface.includes(requiredDestination)) {
    throw new Error(`Public registry is missing canonical fallback destination: ${requiredDestination}`);
  }
}

for (const requirement of [
  'there is no public `coven init` step',
  'Historical/archive lineage, not a recommended current product',
  'Stale marketing copy is never the fallback',
  'Issue #71',
]) {
  if (!register.includes(requirement)) {
    throw new Error(`Public truth register is missing requirement: ${requirement}`);
  }
}

if (roadmap.includes("privacy`, `/terms`) still")) {
  throw new Error('ROADMAP still describes already-migrated legal routes as pre-redesign');
}

const htmlFiles = await filesUnder(dist, '.html');
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  if (/\bcoven init\b/i.test(html)) {
    throw new Error(`Built public page retains obsolete coven init guidance: ${path.relative(root, file)}`);
  }
  for (const deadDestination of [
    'https://opencoven.ai/cave',
    'https://opencoven.ai/cli',
    'https://opencoven.ai/code',
  ]) {
    if (html.includes(`href="${deadDestination}"`)) {
      throw new Error(
        `Built public page retains nonexistent destination ${deadDestination}: ${path.relative(root, file)}`,
      );
    }
  }
}

const homepage = await readFile(path.join(dist, 'index.html'), 'utf8');
for (const attribute of ['data-stars-count', 'data-dlcount', 'data-discord-count']) {
  const zero = new RegExp(
    `<span\\b(?=[^>]*\\b${attribute}(?:=""|(?=[\\s>])))[^>]*>\\s*0\\s*<\\/span>`,
  );
  if (zero.test(homepage)) {
    throw new Error(`Built homepage exposes zero-valued proof fallback for ${attribute}`);
  }
}

console.log(
  'Verified canonical onboarding/download truth, real fallback destinations, neutral proof values, and the transitional public-claim register.',
);
