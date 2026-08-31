import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = process.cwd();
const outputDir = path.join(root, 'artifacts', 'baseline');
const screenshotDir = path.join(outputDir, 'screenshots');
const baseURL = process.env.BASELINE_URL ?? 'http://127.0.0.1:4173';
const staticReportPath = path.join(outputDir, 'static.json');

await mkdir(screenshotDir, { recursive: true });

const staticReport = JSON.parse(await readFile(staticReportPath, 'utf8'));
const routes = staticReport.routes.map(({ route }) => route);
const viewports = [
  { id: '320x568', width: 320, height: 568 },
  { id: '360x800', width: 360, height: 800 },
  { id: '390x844', width: 390, height: 844 },
  { id: '430x932', width: 430, height: 932 },
  { id: '768x1024', width: 768, height: 1024 },
  { id: '1024x768', width: 1024, height: 768 },
  { id: '1280x800', width: 1280, height: 800 },
  { id: '1440x900', width: 1440, height: 900 },
];
const states = [
  {
    id: 'light',
    theme: 'light',
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  },
  {
    id: 'dark',
    theme: 'dark',
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  },
  {
    id: 'system',
    theme: 'system',
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  },
  {
    id: 'reduced-motion',
    theme: 'system',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  },
];

function routeSlug(route) {
  return route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-');
}

function absolute(route) {
  return new URL(route, baseURL).toString();
}

async function ready(page) {
  await page.locator('body').waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
}

async function createContext(browser, options) {
  const context = await browser.newContext(options);
  await context.addInitScript(({ theme }) => {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // The page has its own fail-closed theme fallback.
    }
    window.__landingBaseline = { longTasks: [] };
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__landingBaseline.longTasks.push({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      // Long Task API is not available in every engine/context.
    }
  }, { theme: options.theme ?? 'system' });
  return context;
}

const browser = await chromium.launch({ headless: true });
const report = {
  schemaVersion: 'opencoven.landing-browser-baseline/v1',
  capturedAt: new Date().toISOString(),
  sourceSha: staticReport.sourceSha,
  baseURL,
  screenshots: [],
  routes: [],
  noJavaScript: [],
  linkChecks: [],
  browser: await browser.version(),
};

try {
  for (const viewport of viewports) {
    for (const state of states) {
      const context = await createContext(browser, {
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: state.colorScheme,
        reducedMotion: state.reducedMotion,
        theme: state.theme,
      });
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
      page.on('requestfailed', (request) => {
        errors.push(`request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
      });

      const response = await page.goto(absolute('/'), { waitUntil: 'domcontentloaded' });
      await ready(page);
      const filename = `home-${viewport.id}-${state.id}.png`;
      await page.screenshot({
        path: path.join(screenshotDir, filename),
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      });
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        theme: document.documentElement.dataset.theme ?? null,
        themePreference: document.documentElement.dataset.themePref ?? null,
      }));
      report.screenshots.push({
        route: '/',
        file: `screenshots/${filename}`,
        viewport,
        state: state.id,
        status: response?.status() ?? null,
        dimensions,
        horizontalOverflow: dimensions.scrollWidth > dimensions.clientWidth + 1,
        errors,
      });
      await context.close();
    }
  }

  const representativeViewports = [
    { id: 'mobile', width: 390, height: 844 },
    { id: 'desktop', width: 1440, height: 900 },
  ];

  for (const route of routes) {
    const routeRecord = {
      route,
      variants: [],
      axe: null,
      resources: [],
      longTasks: [],
      webgl: null,
      battery: null,
      links: [],
      errors: [],
    };

    for (const viewport of representativeViewports) {
      const context = await createContext(browser, {
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        theme: 'system',
      });
      const page = await context.newPage();
      page.on('console', (message) => {
        if (message.type() === 'error') routeRecord.errors.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => routeRecord.errors.push(`page: ${error.message}`));
      page.on('requestfailed', (request) => {
        routeRecord.errors.push(
          `request: ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`,
        );
      });

      const response = await page.goto(absolute(route), { waitUntil: 'domcontentloaded' });
      await ready(page);
      const filename = `${routeSlug(route)}-${viewport.id}-reduced-motion.png`;
      await page.screenshot({
        path: path.join(screenshotDir, filename),
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      });

      const runtime = await page.evaluate(async () => {
        const resources = performance.getEntriesByType('resource').map((entry) => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          duration: entry.duration,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
        }));
        const links = [...document.querySelectorAll('a[href]')].map((link) => ({
          href: link.href,
          text: link.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        }));
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        let webgl = { supported: Boolean(gl), renderer: null, vendor: null };
        if (gl) {
          const debug = gl.getExtension('WEBGL_debug_renderer_info');
          if (debug) {
            webgl = {
              supported: true,
              renderer: gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),
              vendor: gl.getParameter(debug.UNMASKED_VENDOR_WEBGL),
            };
          }
        }
        let battery = { supported: false };
        if ('getBattery' in navigator) {
          try {
            const value = await navigator.getBattery();
            battery = {
              supported: true,
              charging: value.charging,
              level: value.level,
            };
          } catch {
            battery = { supported: true, unavailable: true };
          }
        }
        return {
          title: document.title,
          h1: [...document.querySelectorAll('h1')].map((node) => node.textContent?.trim()),
          landmarks: {
            header: document.querySelectorAll('header').length,
            nav: document.querySelectorAll('nav').length,
            main: document.querySelectorAll('main').length,
            footer: document.querySelectorAll('footer').length,
          },
          dimensions: {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          },
          resources,
          links,
          longTasks: window.__landingBaseline?.longTasks ?? [],
          webgl,
          battery,
          memory: performance.memory
            ? {
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                usedJSHeapSize: performance.memory.usedJSHeapSize,
              }
            : null,
        };
      });

      if (viewport.id === 'desktop') {
        const axe = await new AxeBuilder({ page }).analyze();
        routeRecord.axe = {
          violations: axe.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            description: violation.description,
            help: violation.help,
            nodes: violation.nodes.length,
          })),
          passes: axe.passes.length,
          incomplete: axe.incomplete.length,
        };
        routeRecord.resources = runtime.resources;
        routeRecord.longTasks = runtime.longTasks;
        routeRecord.webgl = runtime.webgl;
        routeRecord.battery = runtime.battery;
        routeRecord.links = runtime.links;
        routeRecord.memory = runtime.memory;
      }

      routeRecord.variants.push({
        viewport,
        status: response?.status() ?? null,
        screenshot: `screenshots/${filename}`,
        title: runtime.title,
        h1: runtime.h1,
        landmarks: runtime.landmarks,
        horizontalOverflow:
          runtime.dimensions.scrollWidth > runtime.dimensions.clientWidth + 1,
      });
      await context.close();
    }

    report.routes.push(routeRecord);
  }

  for (const route of routes) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: false,
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    const response = await page.goto(absolute(route), { waitUntil: 'domcontentloaded' });
    const snapshot = await page.evaluate(() => ({
      title: document.title,
      h1: [...document.querySelectorAll('h1')].map((node) => node.textContent?.trim()),
      bodyCharacters: document.body.innerText.trim().length,
      internalLinks: [...document.querySelectorAll('a[href^="/"]')].length,
      main: document.querySelectorAll('main').length,
    }));
    report.noJavaScript.push({ route, status: response?.status() ?? null, ...snapshot });
    await context.close();
  }

  const linkContext = await browser.newContext();
  const uniqueLinks = new Map();
  for (const route of report.routes) {
    for (const link of route.links) {
      const url = new URL(link.href, baseURL);
      if (url.origin !== new URL(baseURL).origin) continue;
      if (url.pathname.startsWith('/download/') || url.pathname.startsWith('/stream/')) continue;
      uniqueLinks.set(url.toString(), link.text);
    }
  }

  for (const [url, text] of uniqueLinks) {
    const target = new URL(url);
    if (target.hash) {
      const page = await linkContext.newPage();
      const response = await page.goto(`${target.origin}${target.pathname}${target.search}`, {
        waitUntil: 'domcontentloaded',
      });
      const selector = `#${CSS.escape(target.hash.slice(1))}`;
      const exists = await page.locator(selector).count().catch(() => 0);
      report.linkChecks.push({
        url,
        text,
        status: response?.status() ?? null,
        fragmentExists: exists > 0,
      });
      await page.close();
    } else {
      const response = await linkContext.request.get(url, {
        maxRedirects: 0,
        failOnStatusCode: false,
      });
      report.linkChecks.push({ url, text, status: response.status(), fragmentExists: null });
    }
  }
  await linkContext.close();
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDir, 'browser.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

const seriousAxe = report.routes.flatMap((route) =>
  (route.axe?.violations ?? [])
    .filter((violation) => ['serious', 'critical'].includes(violation.impact))
    .map((violation) => ({ route: route.route, ...violation })),
);
const overflow = [
  ...report.screenshots
    .filter((entry) => entry.horizontalOverflow)
    .map((entry) => `${entry.route} ${entry.viewport.id} ${entry.state}`),
  ...report.routes.flatMap((route) =>
    route.variants
      .filter((entry) => entry.horizontalOverflow)
      .map((entry) => `${route.route} ${entry.viewport.id}`)),
];
const failedLinks = report.linkChecks.filter((entry) =>
  entry.status >= 400 || entry.fragmentExists === false,
);
const noJsFailures = report.noJavaScript.filter((entry) =>
  entry.status >= 400 || entry.main !== 1 || entry.h1.length !== 1 || entry.bodyCharacters < 100,
);

const markdown = [
  '# OpenCoven landing browser baseline',
  '',
  `- Source SHA: \`${report.sourceSha}\``,
  `- Browser: ${report.browser}`,
  `- Homepage viewport/theme/motion captures: ${report.screenshots.length}`,
  `- Route representative captures: ${report.routes.reduce((sum, route) => sum + route.variants.length, 0)}`,
  `- Serious/critical axe findings: ${seriousAxe.length}`,
  `- Horizontal overflow findings: ${overflow.length}`,
  `- Failed internal links/fragments: ${failedLinks.length}`,
  `- No-JavaScript route failures: ${noJsFailures.length}`,
  '',
  '## Route state summary',
  '',
  '| Route | H1 | Axe violations | Serious/critical | Long tasks | Console/network errors |',
  '|---|---:|---:|---:|---:|---:|',
  ...report.routes.map((route) => {
    const violations = route.axe?.violations ?? [];
    const serious = violations.filter((item) => ['serious', 'critical'].includes(item.impact));
    return `| ${route.route} | ${route.variants[0]?.h1.length ?? 0} | ${violations.length} | ${serious.length} | ${route.longTasks.length} | ${route.errors.length} |`;
  }),
  '',
  '## Findings requiring follow-up',
  '',
  ...(seriousAxe.length
    ? seriousAxe.map((item) => `- Axe ${item.impact}: \`${item.id}\` on ${item.route} (${item.nodes} nodes) — ${item.help}`)
    : ['- No serious or critical axe findings in the representative desktop state.']),
  ...overflow.map((item) => `- Horizontal overflow: ${item}`),
  ...failedLinks.map((item) => `- Link: ${item.url} returned ${item.status}${item.fragmentExists === false ? ' or had a missing fragment' : ''}`),
  ...noJsFailures.map((item) => `- No-JavaScript contract: ${item.route}`),
  '',
  'Screenshots and the complete request, memory, WebGL, battery-capability, accessibility, link, and no-JavaScript records are included in the same CI artifact.',
  '',
].join('\n');

await writeFile(path.join(outputDir, 'browser.md'), markdown);
console.log('Wrote browser baseline evidence and screenshot matrix.');
