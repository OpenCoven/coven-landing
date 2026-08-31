import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const [
  packageSource,
  fastConfig,
  releaseConfig,
  fastWorkflow,
  releaseWorkflow,
  accessibilityCss,
  accessibilityTests,
  releaseTests,
  manualEvidence,
] = await Promise.all([
  read('package.json'),
  read('playwright.config.ts'),
  read('playwright.release.config.ts'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/release-gates.yml'),
  read('src/styles/accessibility.css'),
  read('tests/accessibility-contracts.spec.ts'),
  read('tests/release/smoke.spec.ts'),
  read('docs/release/accessibility-evidence-template.md'),
]);

const packageJson = JSON.parse(packageSource);
for (const [name, command] of Object.entries({
  'check:accessibility': 'playwright test tests/accessibility-contracts.spec.ts',
  'check:release': 'playwright test --config=playwright.release.config.ts',
})) {
  if (packageJson.scripts?.[name] !== command) {
    throw new Error(`package.json must define ${name} as ${command}`);
  }
}
if (!packageJson.scripts?.check?.includes('verify-release-gates.mjs')) {
  throw new Error('pnpm check must include scripts/verify-release-gates.mjs');
}

if (!fastConfig.includes("name: 'chromium'")) {
  throw new Error('The fast Playwright config must retain its Chromium project');
}
for (const forbidden of ['release-firefox', 'release-webkit', 'release-mobile-webkit']) {
  if (fastConfig.includes(forbidden)) {
    throw new Error(`The fast PR config must not absorb release project ${forbidden}`);
  }
}
for (const requirement of [
  'actions/upload-artifact@v4',
  'if: failure()',
  'playwright-report',
  'test-results',
]) {
  if (!fastWorkflow.includes(requirement)) {
    throw new Error(`Fast CI workflow is missing diagnostic requirement: ${requirement}`);
  }
}

for (const project of [
  'release-chromium',
  'release-firefox',
  'release-webkit',
  'release-mobile-chromium',
  'release-mobile-webkit',
]) {
  if (!releaseConfig.includes(`name: '${project}'`)) {
    throw new Error(`Release Playwright config is missing ${project}`);
  }
  if (!releaseWorkflow.includes(`project: ${project}`)) {
    throw new Error(`Release workflow matrix is missing ${project}`);
  }
}
for (const browser of ['chromium', 'firefox', 'webkit']) {
  if (!releaseWorkflow.includes(`browser: ${browser}`)) {
    throw new Error(`Release workflow matrix is missing browser installer ${browser}`);
  }
}
for (const requirement of [
  'workflow_dispatch:',
  'pnpm check:release --project=${{ matrix.project }}',
  'actions/upload-artifact@v4',
  'if: always()',
  'playwright-report-release',
  'test-results/release',
]) {
  if (!releaseWorkflow.includes(requirement)) {
    throw new Error(`Release workflow is missing requirement: ${requirement}`);
  }
}

for (const requirement of [
  '@media (forced-colors: active)',
  '@media (prefers-reduced-motion: reduce)',
  'forced-color-adjust: auto',
  'HighlightText',
]) {
  if (!accessibilityCss.includes(requirement)) {
    throw new Error(`Accessibility CSS is missing requirement: ${requirement}`);
  }
}
for (const requirement of [
  'keeps controls at usable target sizes on mobile',
  'forced-colors mode preserves borders, text, and visible focus',
  'reduced-motion preference completes feedback without sustained motion',
  'remains readable at 200 percent text size',
  'Escape restores the trigger',
]) {
  if (!accessibilityTests.includes(requirement)) {
    throw new Error(`Accessibility browser contract is missing: ${requirement}`);
  }
}
for (const requirement of [
  'all public routes render canonical content without runtime errors',
  'theme selection persists',
  'static public content remains usable when JavaScript is disabled',
]) {
  if (!releaseTests.includes(requirement)) {
    throw new Error(`Release smoke suite is missing: ${requirement}`);
  }
}

for (const requirement of [
  'unfilled release-evidence template',
  'macOS + Safari + VoiceOver',
  'Windows + Firefox or Chrome + current NVDA',
  'Supported Android device + Chrome + TalkBack',
  'unverified — not approved for release',
  'may not substitute for this matrix',
]) {
  if (!manualEvidence.includes(requirement)) {
    throw new Error(`Manual accessibility template is missing: ${requirement}`);
  }
}
if (/\|\s*pass\s*\|/i.test(manualEvidence)) {
  throw new Error('The unfilled manual accessibility template must not contain a pass receipt');
}

console.log(
  'Verified the fast Chromium gate, five-project release matrix, failure artifacts, automated WCAG contracts, and explicitly unverified manual evidence template.',
);
