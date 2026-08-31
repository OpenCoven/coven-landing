import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const outputDir = path.join(root, 'artifacts', 'baseline');
const reportJson = path.join(outputDir, 'static.json');
const reportMarkdown = path.join(outputDir, 'static.md');

if (!existsSync(distDir)) {
  throw new Error('dist/ is missing. Run `CI=true pnpm build` before baseline:static.');
}

await mkdir(outputDir, { recursive: true });

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function routeForHtml(file) {
  const rel = path.relative(distDir, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'/index.html'.length)}`;
  return `/${rel.slice(0, -'.html'.length)}`;
}

function byteRecord(buffer) {
  return {
    raw: buffer.byteLength,
    gzip: gzipSync(buffer, { level: 9 }).byteLength,
    brotli: brotliCompressSync(buffer).byteLength,
  };
}

function stripQuery(value) {
  return value.split('#')[0].split('?')[0];
}

function localAssetPath(value) {
  const clean = stripQuery(value);
  if (!clean || clean.startsWith('data:') || clean.startsWith('//')) return null;
  if (/^https?:\/\//i.test(clean)) return null;
  const pathname = clean.startsWith('/') ? clean.slice(1) : clean;
  return path.join(distDir, pathname);
}

function unique(values) {
  return [...new Set(values)].sort();
}

function gitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

const distFiles = await walk(distDir);
const htmlFiles = distFiles.filter((file) => file.endsWith('.html'));
const assetFiles = distFiles.filter((file) => /\.(?:css|m?js)$/i.test(file));
const allSizeRecords = [];

for (const file of distFiles) {
  const buffer = await readFile(file);
  allSizeRecords.push({
    file: relative(file),
    ...byteRecord(buffer),
  });
}

const routeRecords = [];
const allRemoteDependencies = new Set();
const allQueryVersionedDependencies = new Set();

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const dependencyValues = [
    ...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi),
    ...html.matchAll(/\bimport\s*(?:\([^)]*\)|[^;]*?from\s*)?["']([^"']+)["']/gi),
  ].map((match) => match[1]);

  const dependencies = unique(dependencyValues);
  const initialAssets = [];
  for (const dependency of dependencies) {
    if (/^https?:\/\//i.test(dependency)) allRemoteDependencies.add(dependency);
    if (/\.(?:m?js|css)\?[^#]+/i.test(dependency)) {
      allQueryVersionedDependencies.add(dependency);
    }

    const absolute = localAssetPath(dependency);
    if (!absolute || !existsSync(absolute)) continue;
    const info = await stat(absolute);
    if (!info.isFile()) continue;
    const buffer = await readFile(absolute);
    initialAssets.push({
      url: dependency,
      file: relative(absolute),
      ...byteRecord(buffer),
    });
  }

  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => Buffer.from(match[1]));
  const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => Buffer.from(match[1]));

  routeRecords.push({
    route: routeForHtml(file),
    html: relative(file),
    htmlBytes: byteRecord(Buffer.from(html)),
    initialAssets,
    initialTotals: initialAssets.reduce(
      (total, asset) => ({
        raw: total.raw + asset.raw,
        gzip: total.gzip + asset.gzip,
        brotli: total.brotli + asset.brotli,
      }),
      { raw: 0, gzip: 0, brotli: 0 },
    ),
    inlineScriptBytes: byteRecord(Buffer.concat(inlineScripts)),
    inlineStyleBytes: byteRecord(Buffer.concat(inlineStyles)),
    remoteDependencies: dependencies.filter((value) => /^https?:\/\//i.test(value)),
    queryVersionedDependencies: dependencies.filter((value) => /\?.+/.test(value)),
    h1Count: (html.match(/<h1\b/gi) ?? []).length,
    canonical: html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1]
      ?? null,
    description: html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]
      ?? null,
  });
}

const scanRoots = ['src', 'public', 'api', 'workers', 'scripts']
  .map((entry) => path.join(root, entry))
  .filter((entry) => existsSync(entry));
const sourceFiles = (await Promise.all(scanRoots.map(walk)))
  .flat()
  .filter((file) => /\.(?:astro|css|html|js|mjs|ts|json|md|svg)$/i.test(file));
const sourceRemoteReferences = new Set();
const styleSelectorCoupling = [];
const commandOccurrences = [];

for (const file of sourceFiles) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>`)]+/g)) {
    sourceRemoteReferences.add(match[0].replace(/[.,;:]$/, ''));
  }
  if (/\[style\*?=|\[style\^=|\[style\$=/i.test(text)) {
    styleSelectorCoupling.push(relative(file));
  }
  for (const command of [
    'npm install -g @opencoven/cli',
    'coven doctor',
    'coven init',
    'coven',
  ]) {
    const count = text.split(command).length - 1;
    if (count > 0) commandOccurrences.push({ file: relative(file), command, count });
  }
}

let vercel = null;
const vercelPath = path.join(root, 'vercel.json');
if (existsSync(vercelPath)) {
  vercel = JSON.parse(await readFile(vercelPath, 'utf8'));
}

const report = {
  schemaVersion: 'opencoven.landing-baseline/v1',
  capturedAt: new Date().toISOString(),
  sourceSha: gitSha(),
  node: process.version,
  routes: routeRecords.sort((a, b) => a.route.localeCompare(b.route)),
  redirects: vercel?.redirects ?? [],
  rewrites: vercel?.rewrites ?? [],
  outputTotals: allSizeRecords.reduce(
    (total, file) => ({
      raw: total.raw + file.raw,
      gzip: total.gzip + file.gzip,
      brotli: total.brotli + file.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 },
  ),
  outputFiles: allSizeRecords.sort((a, b) => b.raw - a.raw),
  scriptAndStyleFiles: allSizeRecords
    .filter((record) => assetFiles.some((file) => relative(file) === record.file))
    .sort((a, b) => b.raw - a.raw),
  remoteDependencies: unique([
    ...allRemoteDependencies,
    ...sourceRemoteReferences,
  ]),
  queryVersionedDependencies: unique(allQueryVersionedDependencies),
  styleSelectorCoupling: unique(styleSelectorCoupling),
  commandOccurrences,
  truthSources: [
    'docs/decisions/2026-08-30-public-positioning-and-claims.md',
    'src/data/products.ts',
    'docs/public-truth-register.md',
    'analytics/README.md',
    'workers/installer-stream/README.md',
  ],
};

await writeFile(reportJson, `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  '# OpenCoven landing measured static baseline',
  '',
  `- Source SHA: \`${report.sourceSha}\``,
  `- Captured: ${report.capturedAt}`,
  `- Routes: ${report.routes.length}`,
  `- Output: ${(report.outputTotals.raw / 1024).toFixed(1)} KiB raw · ${(report.outputTotals.gzip / 1024).toFixed(1)} KiB gzip-equivalent`,
  `- Remote references discovered: ${report.remoteDependencies.length}`,
  `- Query-versioned module/style references: ${report.queryVersionedDependencies.length}`,
  '',
  '## Route inventory',
  '',
  '| Route | H1 | HTML gzip | Initial CSS/JS gzip | Canonical |',
  '|---|---:|---:|---:|---|',
  ...report.routes.map((route) =>
    `| ${route.route} | ${route.h1Count} | ${(route.htmlBytes.gzip / 1024).toFixed(1)} KiB | ${(route.initialTotals.gzip / 1024).toFixed(1)} KiB | ${route.canonical ?? 'missing'} |`,
  ),
  '',
  '## Largest emitted files',
  '',
  '| File | Raw | Gzip | Brotli |',
  '|---|---:|---:|---:|',
  ...report.outputFiles.slice(0, 25).map((file) =>
    `| ${file.file} | ${(file.raw / 1024).toFixed(1)} KiB | ${(file.gzip / 1024).toFixed(1)} KiB | ${(file.brotli / 1024).toFixed(1)} KiB |`,
  ),
  '',
  '## Redirects and rewrites',
  '',
  '```json',
  JSON.stringify({ redirects: report.redirects, rewrites: report.rewrites }, null, 2),
  '```',
  '',
  '## Remote and query-versioned dependency references',
  '',
  ...(report.remoteDependencies.length
    ? report.remoteDependencies.map((value) => `- ${value}`)
    : ['- None discovered.']),
  '',
  ...(report.queryVersionedDependencies.length
    ? ['### Query-versioned', '', ...report.queryVersionedDependencies.map((value) => `- ${value}`)]
    : []),
  '',
  '## Responsive/style coupling',
  '',
  ...(report.styleSelectorCoupling.length
    ? report.styleSelectorCoupling.map((value) => `- Serialized style selector found in \`${value}\``)
    : ['- No `[style*=…]`/equivalent selector coupling discovered by this scan.']),
  '',
  'The complete machine-readable inventory is `static.json` in the same CI artifact.',
  '',
].join('\n');

await writeFile(reportMarkdown, markdown);
console.log(`Wrote ${relative(reportJson)} and ${relative(reportMarkdown)}.`);
