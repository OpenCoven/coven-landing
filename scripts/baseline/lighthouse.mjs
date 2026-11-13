import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const outputDir = path.join(root, 'artifacts', 'baseline', 'lighthouse');
const baseURL = process.env.BASELINE_URL ?? 'http://127.0.0.1:4173';
await mkdir(outputDir, { recursive: true });

const profiles = [
  { id: 'mobile', args: [] },
  { id: 'desktop', args: ['--preset=desktop'] },
];
const chromePath = chromium.executablePath();
const results = [];

for (const profile of profiles) {
  const outputPath = path.join(outputDir, `${profile.id}.json`);
  const run = spawnSync(
    'pnpm',
    [
      'exec',
      'lighthouse',
      new URL('/', baseURL).toString(),
      '--quiet',
      '--output=json',
      `--output-path=${outputPath}`,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
      ...profile.args,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        CHROME_PATH: chromePath,
      },
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  if (run.status !== 0) {
    throw new Error(
      `Lighthouse ${profile.id} failed (${run.status}):\n${run.stdout}\n${run.stderr}`,
    );
  }

  const report = JSON.parse(await readFile(outputPath, 'utf8'));
  const categoryScores = Object.fromEntries(
    Object.entries(report.categories).map(([id, category]) => [
      id,
      Math.round((category.score ?? 0) * 100),
    ]),
  );
  const metric = (id) => ({
    value: report.audits[id]?.numericValue ?? null,
    display: report.audits[id]?.displayValue ?? null,
    score: report.audits[id]?.score ?? null,
  });
  const diagnostics = report.audits.diagnostics?.details?.items?.[0] ?? {};

  results.push({
    profile: profile.id,
    requestedUrl: report.requestedUrl,
    finalUrl: report.finalUrl,
    fetchTime: report.fetchTime,
    lighthouseVersion: report.lighthouseVersion,
    userAgent: report.userAgent,
    categories: categoryScores,
    metrics: {
      firstContentfulPaint: metric('first-contentful-paint'),
      largestContentfulPaint: metric('largest-contentful-paint'),
      cumulativeLayoutShift: metric('cumulative-layout-shift'),
      totalBlockingTime: metric('total-blocking-time'),
      speedIndex: metric('speed-index'),
      interactive: metric('interactive'),
      mainThreadWork: metric('mainthread-work-breakdown'),
      bootupTime: metric('bootup-time'),
    },
    diagnostics: {
      numRequests: diagnostics.numRequests ?? null,
      numScripts: diagnostics.numScripts ?? null,
      numStylesheets: diagnostics.numStylesheets ?? null,
      numFonts: diagnostics.numFonts ?? null,
      numTasks: diagnostics.numTasks ?? null,
      numTasksOver10ms: diagnostics.numTasksOver10ms ?? null,
      numTasksOver25ms: diagnostics.numTasksOver25ms ?? null,
      numTasksOver50ms: diagnostics.numTasksOver50ms ?? null,
      numTasksOver100ms: diagnostics.numTasksOver100ms ?? null,
      numTasksOver500ms: diagnostics.numTasksOver500ms ?? null,
      totalByteWeight: diagnostics.totalByteWeight ?? null,
      mainDocumentTransferSize: diagnostics.mainDocumentTransferSize ?? null,
    },
  });
}

await writeFile(
  path.join(outputDir, 'summary.json'),
  `${JSON.stringify({
    schemaVersion: 'opencoven.landing-lighthouse-baseline/v1',
    capturedAt: new Date().toISOString(),
    results,
  }, null, 2)}\n`,
);

const formatMs = (metric) =>
  metric.value == null ? 'n/a' : `${Math.round(metric.value)} ms`;
const formatCls = (metric) =>
  metric.value == null ? 'n/a' : Number(metric.value).toFixed(3);
const markdown = [
  '# OpenCoven landing Lighthouse baseline',
  '',
  '| Profile | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Requests | Bytes |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...results.map((result) =>
    `| ${result.profile} | ${result.categories.performance} | ${result.categories.accessibility} | ${result.categories['best-practices']} | ${result.categories.seo} | ${formatMs(result.metrics.firstContentfulPaint)} | ${formatMs(result.metrics.largestContentfulPaint)} | ${formatMs(result.metrics.totalBlockingTime)} | ${formatCls(result.metrics.cumulativeLayoutShift)} | ${result.diagnostics.numRequests ?? 'n/a'} | ${result.diagnostics.totalByteWeight ?? 'n/a'} |`,
  ),
  '',
  'The raw Lighthouse JSON for both mobile and desktop is included beside this summary.',
  '',
].join('\n');
await writeFile(path.join(outputDir, 'summary.md'), markdown);
console.log('Wrote mobile and desktop Lighthouse baseline reports.');
