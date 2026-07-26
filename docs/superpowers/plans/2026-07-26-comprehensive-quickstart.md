# Comprehensive Quickstart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated, responsive `/quickstart` hub that takes a new user to a verifiable first success with any core OpenCoven product.

**Architecture:** Keep product onboarding content in a typed data module, render each guide through one Astro component, and compose the route with the site's existing shell and interaction script. Preserve the homepage's compact CLI preview while moving global navigation to the full hub, and enforce the new route's product/command/link contract in the existing static verifier.

**Tech Stack:** Astro 5, TypeScript, semantic HTML, existing vanilla JavaScript clipboard behavior, existing OpenCoven CSS tokens, Node static-output verification.

---

## File Map

- Create `src/data/quickstart.ts`: typed, canonical onboarding content for all five products.
- Create `src/components/QuickstartProduct.astro`: reusable semantic renderer for one product guide.
- Create `src/pages/quickstart.astro`: route shell, SEO, chooser, shared prerequisites, guide composition, and support CTA.
- Modify `src/styles/global.css`: route-scoped responsive and theme-safe presentation.
- Modify `src/components/Header.astro`: active `/quickstart` desktop navigation.
- Modify `src/components/MobileNav.astro`: active `/quickstart` mobile navigation.
- Modify `src/components/Footer.astro`: active `/quickstart` footer navigation.
- Modify `src/components/QuickStart.astro`: current CLI command and full-hub CTA.
- Modify `scripts/verify-static.mjs`: static contract for route existence, all products, canonical commands, links, and navigation.

### Task 1: Lock the static quickstart contract

**Files:**
- Modify: `scripts/verify-static.mjs:8-14`
- Modify: `scripts/verify-static.mjs:122-158`

- [ ] **Step 1: Add a failing static-output assertion**

Add `dist/quickstart/index.html` checks after the GitHub page checks:

```js
const distQuickstart = path.join(distDir, 'quickstart', 'index.html');
if (!existsSync(distQuickstart)) {
  throw new Error('dist/quickstart/index.html is missing — the onboarding hub must ship at /quickstart');
}

const quickstartHtml = await readFile(distQuickstart, 'utf8');
const requiredQuickstartCopy = [
  'Choose your way into OpenCoven.',
  'Coven CLI',
  'Coven Code',
  'Coven Cave',
  'CastCodes',
  'OpenCoven for GitHub',
  'npm install -g @opencoven/cli',
  'coven doctor',
  'coven run codex',
  'coven sessions --plain',
  'Your first success',
];
const missingQuickstartCopy = requiredQuickstartCopy.filter(
  (needle) => !quickstartHtml.includes(needle),
);
if (missingQuickstartCopy.length > 0) {
  throw new Error(
    `Missing expected copy in dist/quickstart/index.html: ${missingQuickstartCopy.join(', ')}`,
  );
}

const requiredQuickstartLinks = [
  'https://docs.opencoven.ai/docs/guides/install-and-first-run',
  'https://github.com/OpenCoven/coven-code',
  'https://github.com/OpenCoven/coven-cave/releases/latest',
  'https://testflight.apple.com/join/61Dqw8y4',
  'https://github.com/OpenCoven/cast-codes/releases/latest',
  'https://github.com/OpenCoven/coven-github',
];
const missingQuickstartLinks = requiredQuickstartLinks.filter(
  (needle) => !quickstartHtml.includes(needle),
);
if (missingQuickstartLinks.length > 0) {
  throw new Error(
    `Missing canonical links in dist/quickstart/index.html: ${missingQuickstartLinks.join(', ')}`,
  );
}

if (!quickstartHtml.includes('href="/quickstart" aria-current="page"')) {
  throw new Error('Quickstart page navigation must mark /quickstart as the current page');
}

console.log(
  `Verified ${requiredQuickstartCopy.length} required copy strings and ${requiredQuickstartLinks.length} canonical links in dist/quickstart/index.html.`,
);
```

Update the file header's check list to mention the quickstart route.

- [ ] **Step 2: Build and run the check to prove the route is absent**

Run:

```bash
CI=true pnpm build && pnpm check
```

Expected: `pnpm check` fails with
`dist/quickstart/index.html is missing — the onboarding hub must ship at /quickstart`.

- [ ] **Step 3: Commit the failing contract**

```bash
git add scripts/verify-static.mjs
git commit -m "test: define quickstart output contract" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Model all product onboarding paths

**Files:**
- Create: `src/data/quickstart.ts`

- [ ] **Step 1: Define the product content interface**

Start the module with:

```ts
export interface QuickstartCommand {
  value: string;
  label: string;
}

export interface QuickstartLink {
  label: string;
  href: string;
  primary?: boolean;
}

export interface QuickstartStep {
  label: string;
  title: string;
  body: string;
  commands?: QuickstartCommand[];
  action?: QuickstartLink;
  expected?: string;
}

export interface QuickstartProduct {
  id: string;
  sigil: string;
  eyebrow: string;
  name: string;
  summary: string;
  bestFor: string;
  status: string;
  platforms: string;
  requires: string[];
  steps: QuickstartStep[];
  success: string;
  recovery: string[];
  links: QuickstartLink[];
}
```

- [ ] **Step 2: Add the five canonical product records**

Use canonical links only and export the complete records:

```ts
const links = {
  docsFirstRun: 'https://docs.opencoven.ai/docs/guides/install-and-first-run',
  cliTroubleshooting: 'https://docs.opencoven.ai/docs/reference/troubleshooting',
  codeDocs: 'https://docs.opencoven.ai/docs/coven-code',
  codeRepo: 'https://github.com/OpenCoven/coven-code',
  caveRepo: 'https://github.com/OpenCoven/coven-cave',
  caveReleases: 'https://github.com/OpenCoven/coven-cave/releases/latest',
  caveTestFlight: 'https://testflight.apple.com/join/61Dqw8y4',
  castRepo: 'https://github.com/OpenCoven/cast-codes',
  castReleases: 'https://github.com/OpenCoven/cast-codes/releases/latest',
  githubPage: '/github',
  githubRepo: 'https://github.com/OpenCoven/coven-github',
  githubSelfHost: 'https://github.com/OpenCoven/coven-github/blob/main/docs/self-hosting.md',
};

export const quickstartProducts: QuickstartProduct[] = [
  {
    id: 'coven-cli',
    sigil: '>',
    eyebrow: '01 · Local runtime',
    name: 'Coven CLI',
    summary: 'Run coding harnesses inside an explicit project boundary and keep a durable local record of every session.',
    bestFor: 'Terminal-first control, scripts, and the shared runtime',
    status: 'Recommended foundation',
    platforms: 'macOS · Linux · Windows x64',
    requires: [
      'Node.js 18+ and npm',
      'Git and a local project directory',
      'An OpenAI or Anthropic account for your chosen harness',
    ],
    steps: [
      {
        label: 'Install',
        title: 'Put Coven on your PATH',
        body: 'Install the universal wrapper. It selects the native package for your platform.',
        commands: [{ value: 'npm install -g @opencoven/cli', label: 'Copy Coven install command' }],
        expected: '`coven --help` prints the command list.',
      },
      {
        label: 'Preflight',
        title: 'Let doctor name the missing step',
        body: 'Run this inside the Git project you want Coven to supervise.',
        commands: [
          { value: 'cd /path/to/your/project', label: 'Copy project directory command' },
          { value: 'coven doctor', label: 'Copy doctor command' },
        ],
        expected: 'Project detection is ready and doctor names any missing harness or login.',
      },
      {
        label: 'Connect a harness',
        title: 'Authenticate where the model lives',
        body: 'Choose one path. Provider credentials stay with Codex or Claude Code; Coven does not read them.',
        commands: [
          { value: 'npm install -g @openai/codex && codex login', label: 'Copy Codex setup command' },
          { value: 'npm install -g @anthropic-ai/claude-code && claude doctor', label: 'Copy Claude Code setup command' },
        ],
        expected: '`coven doctor` marks at least one harness ready.',
      },
      {
        label: 'Run and verify',
        title: 'Create a recorded project session',
        body: 'Launch a small read-only first task, then confirm it entered local history.',
        commands: [
          { value: 'coven run codex "explain this repo in 5 bullets"', label: 'Copy first Coven run command' },
          { value: 'coven sessions --plain', label: 'Copy session verification command' },
        ],
        expected: 'The session list shows an id, harness, title, and completed or live status.',
      },
    ],
    success: 'Your first harness run is visible in `coven sessions --plain` with a durable local event log.',
    recovery: [
      'If `coven` is not found, open a new terminal and confirm the npm global bin directory is on PATH.',
      'If doctor reports no harness, follow its exact install/login line and rerun `coven doctor`.',
      'If the working directory is rejected, move inside the Git project root before launching.',
    ],
    links: [
      { label: 'Full install and first run', href: links.docsFirstRun, primary: true },
      { label: 'Troubleshooting', href: links.cliTroubleshooting },
    ],
  },
  {
    id: 'coven-code',
    sigil: 'C',
    eyebrow: '02 · Coding TUI',
    name: 'Coven Code',
    summary: 'Work with a multi-provider coding agent in a focused terminal UI with diffs, sessions, tools, and provider switching.',
    bestFor: 'An interactive coding-agent experience in the terminal',
    status: 'Beta',
    platforms: 'macOS · Linux · Windows',
    requires: [
      'Node.js 18+ and npm',
      'A local project directory',
      'Anthropic credentials or a Codex subscription/login',
    ],
    steps: [
      {
        label: 'Install',
        title: 'Use the unified Coven entry point',
        body: 'The Coven CLI downloads, pins, and verifies the Coven Code engine on first use.',
        commands: [{ value: 'npm install -g @opencoven/cli', label: 'Copy unified Coven install command' }],
        expected: 'The `coven` command is available in a new terminal.',
      },
      {
        label: 'Launch',
        title: 'Open the TUI in your project',
        body: 'Coven offers to install the version-pinned engine automatically on the first launch.',
        commands: [
          { value: 'cd /path/to/your/project', label: 'Copy project directory command' },
          { value: 'coven', label: 'Copy Coven TUI command' },
        ],
        expected: 'The Coven Code welcome surface opens.',
      },
      {
        label: 'Connect',
        title: 'Choose a provider in the first-run prompt',
        body: 'Press 1 for Claude setup, 2 for Codex browser login, or Enter for the full connection picker. Use `/connect` later to switch.',
        expected: 'A provider and model appear as connected in the TUI.',
      },
      {
        label: 'First task',
        title: 'Ask for a bounded, reviewable result',
        body: 'Type `explain this repo in 5 bullets` and review the response. Use `/help` whenever you need the command map.',
        expected: 'The task completes in the current project and remains available in session history.',
      },
    ],
    success: 'Coven Code completes a project-scoped task through your selected provider and keeps the session available to resume.',
    recovery: [
      'Run `/connect` if the TUI opens without a provider.',
      'If a stale `coven-code` binary wins on PATH, use one install channel and remove the older copy.',
      'Run `coven doctor` if the engine or daemon integration does not appear ready.',
    ],
    links: [
      { label: 'Coven Code guide', href: links.codeDocs, primary: true },
      { label: 'Engine source and direct install', href: links.codeRepo },
    ],
  },
  {
    id: 'coven-cave',
    sigil: '⌂',
    eyebrow: '03 · Native workspace',
    name: 'Coven Cave',
    summary: 'Meet your familiars in a native workspace for chat, tasks, GitHub, memory, terminal panes, and mobile handoff.',
    bestFor: 'A visual desktop home for familiars and ongoing work',
    status: 'Native app',
    platforms: 'macOS · Windows · Linux · iOS',
    requires: [
      'The Coven CLI installed locally',
      'A running local Coven daemon for runtime-backed features',
      'macOS, Windows, Linux, or an iOS TestFlight device',
    ],
    steps: [
      {
        label: 'Foundation',
        title: 'Prepare the local runtime',
        body: 'Install Coven if needed, check the machine, and start the daemon Cave connects to.',
        commands: [
          { value: 'npm install -g @opencoven/cli', label: 'Copy Coven install command' },
          { value: 'coven doctor && coven daemon start', label: 'Copy Cave runtime setup command' },
        ],
        expected: '`coven daemon status` reports a running daemon.',
      },
      {
        label: 'Install',
        title: 'Choose your Cave build',
        body: 'Homebrew is recommended on macOS. Windows and Linux installers are on the release page; iPhone and iPad use TestFlight.',
        commands: [{ value: 'brew install --cask opencoven/tap/coven-cave', label: 'Copy Cave Homebrew command' }],
        action: { label: 'Open all desktop downloads', href: links.caveReleases },
        expected: 'Coven Cave is installed as a native app.',
      },
      {
        label: 'Open',
        title: 'Launch Cave beside the daemon',
        body: 'Open the app and keep the daemon running. Cave uses the local `~/.coven/coven.sock` authority boundary.',
        commands: [{ value: 'coven daemon status', label: 'Copy daemon status command' }],
        expected: 'Cave loads its workspace without a daemon-disconnected state.',
      },
      {
        label: 'First loop',
        title: 'Open a familiar and inspect its work',
        body: 'Choose a familiar, open a project-backed conversation, and keep the inspector visible while the first task runs.',
        expected: 'You can see the conversation and its local session/tool activity in one workspace.',
      },
    ],
    success: 'Cave is connected to the local daemon and shows a familiar conversation with inspectable session activity.',
    recovery: [
      'If Cave reports no daemon, run `coven daemon start`, then reopen or refresh the app.',
      'If the macOS cask is unavailable, use the signed release asset from GitHub.',
      'The iOS build is a TestFlight path; desktop-local tools still require a desktop Cave/runtime host.',
    ],
    links: [
      { label: 'Download Cave', href: links.caveReleases, primary: true },
      { label: 'Join the iOS TestFlight', href: links.caveTestFlight },
      { label: 'Cave source and setup', href: links.caveRepo },
    ],
  },
  {
    id: 'castcodes',
    sigil: '[]',
    eyebrow: '04 · Code workspace',
    name: 'CastCodes',
    summary: 'Use a local terminal and code workspace where Coven-backed agent lanes, output, changed files, and review stay visible.',
    bestFor: 'Linux users who want a full code-and-terminal workspace',
    status: 'Linux preview',
    platforms: 'Linux x86_64',
    requires: [
      'A modern x86_64 Linux distribution',
      'The Coven CLI, a ready harness, and the local daemon',
      'A release package matching your distribution',
    ],
    steps: [
      {
        label: 'Foundation',
        title: 'Get Coven ready first',
        body: 'CastCodes uses Coven for project boundaries and recorded agent sessions.',
        commands: [
          { value: 'npm install -g @opencoven/cli', label: 'Copy Coven install command' },
          { value: 'coven doctor && coven daemon start', label: 'Copy CastCodes runtime setup command' },
        ],
        expected: 'Doctor shows a ready harness and daemon status is running.',
      },
      {
        label: 'Download',
        title: 'Choose the Linux release for your system',
        body: 'Releases include deb, rpm, Arch, and AppImage assets with matching `.sha256` files.',
        action: { label: 'Open CastCodes releases', href: links.castReleases, primary: true },
        expected: 'The package and its matching checksum file are downloaded.',
      },
      {
        label: 'Launch',
        title: 'Start the portable AppImage path',
        body: 'The AppImage is the shortest distribution-neutral path. Native packages can be installed with apt, dnf, or pacman instead.',
        commands: [
          { value: 'chmod +x CastCodes-x86_64.AppImage', label: 'Copy AppImage permission command' },
          { value: './CastCodes-x86_64.AppImage', label: 'Copy CastCodes launch command' },
        ],
        expected: 'The CastCodes workspace window opens.',
      },
      {
        label: 'First loop',
        title: 'Open a project and keep the work visible',
        body: 'Open a Git project, start a supported harness lane, and inspect terminal output and changed files before accepting anything.',
        expected: 'The session is visible in the workspace with reviewable output or diffs.',
      },
    ],
    success: 'A project is open in CastCodes and its first Coven-backed agent session is visible for review.',
    recovery: [
      'Use the package matching your distribution and verify it against the adjacent `.sha256` asset.',
      'If the AppImage will not start, install the runtime dependencies documented in the CastCodes README.',
      'If no agent lane starts, rerun `coven doctor` and confirm the daemon and at least one harness are ready.',
    ],
    links: [
      { label: 'Download CastCodes', href: links.castReleases, primary: true },
      { label: 'Install notes and source', href: links.castRepo },
    ],
  },
  {
    id: 'github',
    sigil: '↗',
    eyebrow: '05 · Repository automation',
    name: 'OpenCoven for GitHub',
    summary: 'Assign repository work to a familiar and keep progress, evidence, oversight, and draft pull requests in GitHub.',
    bestFor: 'Teams that want issue-to-PR familiar workflows',
    status: 'Hosted beta · self-hostable',
    platforms: 'GitHub · server',
    requires: [
      'A GitHub organization or repository you can administer',
      'Hosted beta access, or Rust and a public HTTPS endpoint to self-host',
      'A configured Coven Code provider for self-hosted workers',
    ],
    steps: [
      {
        label: 'Choose a lane',
        title: 'Use hosted beta or operate it yourself',
        body: 'Hosted beta is the shortest path. Self-hosting is for operators ready to manage a GitHub App, webhook secrets, workers, and isolation.',
        action: { label: 'Compare paths and join the beta', href: links.githubPage, primary: true },
        expected: 'You have either a beta onboarding path or the self-hosting guide open.',
      },
      {
        label: 'Connect',
        title: 'Install the GitHub App on one test repository',
        body: 'For self-hosting, register from the provided manifest, configure the App id, private key, webhook secret, familiar, and worker.',
        expected: 'GitHub shows the App installed and the webhook endpoint accepts a signed ping.',
      },
      {
        label: 'Trigger',
        title: 'Assign one bounded issue',
        body: 'Assign an issue to the configured familiar bot or apply its configured trigger label. Start with work that can produce a small draft PR.',
        expected: 'A Check Run and one edited-in-place familiar status comment appear.',
      },
      {
        label: 'Review',
        title: 'Keep the human approval boundary',
        body: 'Follow the Check Run and Cave link, then review the draft PR and attached evidence before merging.',
        expected: 'The issue has inspectable status, and commit-producing work returns a draft PR.',
      },
    ],
    success: 'A test issue produces visible familiar status and a Check Run, with a draft PR when the run creates commits.',
    recovery: [
      'Hosted access is waitlisted; joining the beta does not imply immediate App installation access.',
      'For self-hosting, run `coven-github doctor --config config/local.toml` before serving.',
      'An unsigned local webhook request should return 401; use the signed smoke script to prove the full receiver path.',
    ],
    links: [
      { label: 'Join the hosted beta', href: links.githubPage, primary: true },
      { label: 'Self-hosting guide', href: links.githubSelfHost },
      { label: 'Adapter source', href: links.githubRepo },
    ],
  },
];
```

Keep every copied command in `commands[].value`; there are no separate display
tokens to drift from copied text.

- [ ] **Step 3: Run the build to type-check the data module**

Run:

```bash
CI=true pnpm build
```

Expected: build succeeds; the static check still fails later because the route
does not exist yet.

- [ ] **Step 4: Commit the product model**

```bash
git add src/data/quickstart.ts
git commit -m "feat: model product onboarding paths" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Render a reusable product guide

**Files:**
- Create: `src/components/QuickstartProduct.astro`

- [ ] **Step 1: Implement the semantic renderer**

Create the component with this structure:

```astro
---
import type { QuickstartProduct } from '../data/quickstart';

interface Props {
  product: QuickstartProduct;
  index: number;
}

const { product, index } = Astro.props;
const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
---

<article class="onboard-product panel" id={product.id} aria-labelledby={`${product.id}-heading`}>
  <header class="onboard-product-header">
    <div class="onboard-product-sigil" aria-hidden="true">{product.sigil}</div>
    <div class="onboard-product-title">
      <p class="section-kicker">{product.eyebrow}</p>
      <h2 id={`${product.id}-heading`}>{product.name}</h2>
      <p>{product.summary}</p>
    </div>
    <span class="onboard-product-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
  </header>

  <dl class="onboard-product-meta">
    <div><dt>Best for</dt><dd>{product.bestFor}</dd></div>
    <div><dt>Availability</dt><dd>{product.status}</dd></div>
    <div><dt>Platforms</dt><dd>{product.platforms}</dd></div>
  </dl>

  <div class="onboard-product-layout">
    <aside class="onboard-requires panel-inset" aria-label={`${product.name} prerequisites`}>
      <p class="onboard-label">Before you start</p>
      <ul>{product.requires.map((item) => <li>{item}</li>)}</ul>
    </aside>

    <ol class="onboard-steps">
      {product.steps.map((step, stepIndex) => (
        <li class="onboard-step">
          <span class="onboard-step-index" aria-hidden="true">{stepIndex + 1}</span>
          <div class="onboard-step-body">
            <p class="onboard-step-label">{step.label}</p>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            {step.commands?.map((command) => (
              <div class="onboard-command">
                <code>{command.value}</code>
                <button class="qs-copy" type="button" aria-label={command.label} data-copy={command.value}>
                  <Fragment set:html={COPY_ICON} />
                </button>
              </div>
            ))}
            {step.action && (
              <a class:list={['onboard-step-action', { 'is-primary': step.action.primary }]} href={step.action.href}>
                {step.action.label}<span aria-hidden="true"> ↗</span>
              </a>
            )}
            {step.expected && <p class="onboard-expected"><strong>Expect:</strong> {step.expected}</p>}
          </div>
        </li>
      ))}
    </ol>
  </div>

  <div class="onboard-arrival">
    <span class="onboard-arrival-mark" aria-hidden="true">✓</span>
    <div><p>Your first success</p><strong>{product.success}</strong></div>
  </div>

  <details class="onboard-recovery">
    <summary>Blocked? Check these first</summary>
    <ul>{product.recovery.map((item) => <li>{item}</li>)}</ul>
  </details>

  <nav class="onboard-links" aria-label={`${product.name} resources`}>
    {product.links.map((link) => (
      <a class:list={[{ 'is-primary': link.primary }]} href={link.href}>{link.label}<span aria-hidden="true"> ↗</span></a>
    ))}
  </nav>
</article>
```

For links beginning with `https://`, add attributes and a hidden suffix
directly in both action/link anchors:

```astro
target={link.href.startsWith('https://') ? '_blank' : undefined}
rel={link.href.startsWith('https://') ? 'noopener noreferrer' : undefined}
{link.href.startsWith('https://') && <span class="sr-only"> (opens in new tab)</span>}
```

For `step.action`, use `step.action.href` in the same expression. Local
`/github` links remain in the same tab.

- [ ] **Step 2: Run the Astro build**

Run:

```bash
CI=true pnpm build
```

Expected: build succeeds with no Astro prop or template errors.

- [ ] **Step 3: Commit the renderer**

```bash
git add src/components/QuickstartProduct.astro
git commit -m "feat: render reusable product guides" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Build the `/quickstart` route

**Files:**
- Create: `src/pages/quickstart.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Compose the route with the existing site shell**

Use the same font, `ThemeInit`, `Ambient`, `Header`, `MobileNav`, `Footer`, and
`main.js` imports as `src/pages/index.astro`. Add:

```astro
---
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '@fontsource-variable/geist/wght.css';
import '../styles/global.css';

import ThemeInit from '../components/ThemeInit.astro';
import Ambient from '../components/Ambient.astro';
import Header from '../components/Header.astro';
import MobileNav from '../components/MobileNav.astro';
import Footer from '../components/Footer.astro';
import QuickstartProduct from '../components/QuickstartProduct.astro';
import { quickstartProducts } from '../data/quickstart';

const productItems = quickstartProducts.map((product, index) => ({
  '@type': 'ListItem',
  position: index + 1,
  name: product.name,
  url: `https://opencoven.ai/quickstart#${product.id}`,
}));
---
```

The head must include:

```astro
<title>OpenCoven Quickstart — Choose Your First Product</title>
<meta name="description" content="Choose an OpenCoven product and follow a verified path to your first successful Coven CLI, Coven Code, Cave, CastCodes, or GitHub run." />
<link rel="canonical" href="https://opencoven.ai/quickstart" />
<meta property="og:url" content="https://opencoven.ai/quickstart" />
```

Add JSON-LD as a `CollectionPage` whose `mainEntity` is an `ItemList` using
`productItems`.

- [ ] **Step 2: Add the visible page sections**

Inside `<main id="content" tabindex="-1">`, render:

```astro
<section class="onboard-hero" aria-labelledby="onboard-heading">
  <div class="onboard-hero-copy" data-reveal>
    <p class="section-kicker">OpenCoven quickstart</p>
    <h1 id="onboard-heading">Choose your way into <em>OpenCoven.</em></h1>
    <p>Start with the surface that matches how you work. Every path ends with a concrete success check, not just an install.</p>
    <div class="onboard-hero-promise">
      <span aria-hidden="true">✦</span>
      <p><strong>One local foundation.</strong> Add another surface later without starting your work history over.</p>
    </div>
  </div>
  <div class="onboard-route panel" aria-label="Onboarding route">
    <span>choose</span><span>prepare</span><span>run</span><strong>verify</strong>
  </div>
</section>

<section class="onboard-chooser content-section" aria-labelledby="chooser-heading">
  <div class="section-header section-header--wide">
    <p class="section-kicker">Pick your starting point</p>
    <h2 id="chooser-heading">Five products. One successful first loop.</h2>
    <p>You do not need to install everything. Choose the product closest to the outcome you want today.</p>
  </div>
  <nav class="onboard-product-grid" aria-label="Choose a product guide">
    {quickstartProducts.map((product, index) => (
      <a class="onboard-product-card panel-inset is-card" href={`#${product.id}`}>
        <span class="onboard-product-card-index">{String(index + 1).padStart(2, '0')}</span>
        <span class="onboard-product-card-sigil" aria-hidden="true">{product.sigil}</span>
        <strong>{product.name}</strong>
        <span>{product.bestFor}</span>
        <small>{product.status} · {product.platforms}</small>
      </a>
    ))}
  </nav>
</section>
```

Follow with this shared-foundation section:

```astro
<section class="onboard-foundation content-section" aria-labelledby="foundation-heading">
  <div class="onboard-foundation-panel panel panel--arrival">
    <div class="section-header">
      <p class="section-kicker">Shared foundation</p>
      <h2 id="foundation-heading">Prepare once. Add surfaces when you need them.</h2>
      <p>Coven is the local substrate beneath the CLI, coding TUI, Cave, CastCodes, and GitHub worker paths.</p>
    </div>
    <ul class="onboard-foundation-grid" role="list">
      <li><span>01</span><strong>Bring a project</strong><p>Use a Git repository or another explicit local project root.</p></li>
      <li><span>02</span><strong>Choose a provider</strong><p>Authenticate Codex or Claude Code with the provider, not with OpenCoven.</p></li>
      <li><span>03</span><strong>Keep control local</strong><p>Runtime state and session history stay on your machine by default.</p></li>
      <li><span>04</span><strong>Install only your path</strong><p>You can add another surface later without reinstalling the whole ecosystem.</p></li>
    </ul>
  </div>
</section>
```

Then render:

```astro
<section class="onboard-guides content-section" aria-labelledby="guides-heading">
  <div class="onboard-guides-intro">
    <p class="section-kicker">Product guides</p>
    <h2 id="guides-heading">From install to proof.</h2>
    <p>Each route names its prerequisites, actions, expected result, and fastest recovery path.</p>
  </div>
  <div class="onboard-guide-list">
    {quickstartProducts.map((product, index) => <QuickstartProduct product={product} index={index} />)}
  </div>
</section>
```

Close with:

```astro
<section class="onboard-support content-section" aria-labelledby="support-heading">
  <div class="onboard-support-panel panel panel--arrival">
    <div>
      <p class="section-kicker">Keep going</p>
      <h2 id="support-heading">Your next surface uses the same foundation.</h2>
      <p>Add Cave after the CLI, move into Coven Code, or connect GitHub without abandoning the session history and project boundaries you already established.</p>
    </div>
    <nav aria-label="Quickstart support">
      <a class="btn-primary" href="https://docs.opencoven.ai">Read the docs ↗</a>
      <a class="btn-secondary" href="https://github.com/OpenCoven">Browse OpenCoven ↗</a>
      <a class="btn-secondary" href="https://discord.gg/opencoven">Ask the community ↗</a>
    </nav>
  </div>
</section>
<div class="sr-only" role="status" aria-live="polite" data-copy-live></div>
```

- [ ] **Step 3: Add route-scoped styling**

Append a `QUICKSTART PAGE` block in `src/styles/global.css`. All selectors must
start with `.quickstart-page` or `.onboard-`. Implement:

```css
.quickstart-page .site-header { position: sticky; }
.onboard-hero,
.onboard-chooser,
.onboard-foundation,
.onboard-guides,
.onboard-support {
  position: relative;
  z-index: 1;
}
.onboard-hero {
  max-width: 1280px;
  min-height: 560px;
  margin: 0 auto;
  padding: 88px 32px 64px;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 72px;
  align-items: center;
}
.onboard-hero h1 { max-width: 820px; }
.onboard-hero h1 em { color: var(--vtext); font-style: normal; }
.onboard-hero-copy > p:not(.section-kicker) {
  max-width: 66ch;
  color: var(--muted);
  font-size: 1.0625rem;
  line-height: 1.7;
}
.onboard-hero-promise,
.onboard-route,
.onboard-product-card,
.onboard-product,
.onboard-arrival,
.onboard-recovery,
.onboard-support-panel { border-radius: var(--radius-lg); }
.onboard-product-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.onboard-product-card {
  min-height: 220px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  color: var(--white);
  text-decoration: none;
}
.onboard-product-card small { margin-top: auto; color: var(--muted); }
.onboard-guide-list { display: grid; gap: 28px; }
.onboard-product {
  scroll-margin-top: 84px;
  padding: 36px;
  overflow: visible;
}
.onboard-product-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 20px;
  align-items: start;
}
.onboard-product-meta {
  margin: 28px 0;
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  border-block: 1px solid var(--oc-border-subtle);
}
.onboard-product-meta > div { padding: 16px 18px; }
.onboard-product-meta dt,
.onboard-label,
.onboard-step-label {
  font-family: var(--mono);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vtext);
}
.onboard-product-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.34fr) minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}
.onboard-steps { list-style: none; display: grid; gap: 18px; }
.onboard-step {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 14px;
}
.onboard-command {
  position: relative;
  margin-top: 12px;
  padding: 13px 48px 13px 14px;
  overflow-x: auto;
  border: 1px solid var(--oc-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--inset-bg);
  font-family: var(--mono);
  white-space: nowrap;
}
.onboard-command .qs-copy { right: 7px; }
.onboard-arrival {
  margin-top: 28px;
  padding: 18px 20px;
  display: flex;
  gap: 14px;
  background: rgba(48, 209, 88, 0.07);
  border: 1px solid rgba(48, 209, 88, 0.24);
}
.onboard-recovery { margin-top: 14px; border: 1px solid var(--oc-border-subtle); }
.onboard-recovery summary { padding: 15px 18px; cursor: pointer; }
.onboard-recovery ul { padding: 0 38px 18px; color: var(--muted); }
.onboard-links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
```

Add the exact responsive rules:

```css
@media (hover: hover) {
  .onboard-product-card:hover { transform: translateY(-3px); }
  .onboard-links a:hover,
  .onboard-step-action:hover { color: var(--oc-purple-light); border-color: var(--accent-strong); }
}
@media (max-width: 1100px) {
  .onboard-product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .onboard-hero { min-height: auto; padding: 56px 20px 48px; grid-template-columns: 1fr; gap: 32px; }
  .onboard-product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .onboard-product-layout { grid-template-columns: 1fr; }
  .onboard-foundation-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .onboard-support-panel { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 520px) {
  .onboard-product-grid,
  .onboard-foundation-grid,
  .onboard-product-meta { grid-template-columns: 1fr; }
  .onboard-product { padding: 24px 16px; border-inline: 0; border-radius: 0; }
  .onboard-product-header { grid-template-columns: auto minmax(0, 1fr); }
  .onboard-product-number { display: none; }
  .onboard-command { font-size: 0.6875rem; }
}
```

Use existing tokens throughout so the light theme requires no hard-coded
dark-only override.

- [ ] **Step 4: Build and run the static check**

Run:

```bash
CI=true pnpm build && pnpm check
```

Expected: the quickstart route exists. The quickstart contract may still fail
only on current-page navigation until Task 5.

- [ ] **Step 5: Commit the route**

```bash
git add src/pages/quickstart.astro src/styles/global.css
git commit -m "feat: add comprehensive quickstart hub" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: Wire discovery and correct the homepage preview

**Files:**
- Modify: `src/components/Header.astro:2-20`
- Modify: `src/components/MobileNav.astro:4-12`
- Modify: `src/components/Footer.astro:2-16`
- Modify: `src/components/QuickStart.astro:8-88`

- [ ] **Step 1: Add current-page handling to shared navigation**

In each navigation component, derive:

```astro
const pathname = Astro.url.pathname.replace(/\/$/, '');
const isGithub = pathname === '/github';
const isQuickstart = pathname === '/quickstart';
```

Replace every `/#quickstart` destination with:

```astro
<a href="/quickstart" aria-current={isQuickstart ? 'page' : undefined}>Quick Start</a>
```

- [ ] **Step 2: Make the homepage preview match released CLI behavior**

Keep three steps, but use:

```js
[
  {
    kicker: 'Step 1 · Install',
    title: 'Add the Coven CLI',
    command: 'npm install -g @opencoven/cli',
    out: '✓ coven is available on PATH',
  },
  {
    kicker: 'Step 2 · Prepare',
    title: 'Run the guided preflight',
    command: 'coven doctor',
    out: '✓ project and at least one harness ready',
  },
  {
    kicker: 'Step 3 · Run',
    title: 'Create your first recorded session',
    command: 'coven run codex "explain this repo in 5 bullets"',
    out: '✓ session created · output attached · history recorded',
  },
]
```

The Step 2 note must tell users to follow `doctor`'s exact Codex or Claude Code
install/auth next step. Change the primary action to:

```astro
<a class="btn-primary" href="/quickstart">Choose any product</a>
```

Keep the full-docs secondary link.

- [ ] **Step 3: Build and run all static assertions**

Run:

```bash
CI=true pnpm build && pnpm check
```

Expected: both commands exit 0 and the verifier prints a quickstart success
line covering 11 copy strings and 6 canonical links.

- [ ] **Step 4: Commit discovery wiring**

```bash
git add src/components/Header.astro src/components/MobileNav.astro \
  src/components/Footer.astro src/components/QuickStart.astro
git commit -m "feat: route visitors into product quickstarts" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 6: Render, interaction, and regression verification

**Files:**
- Review: files changed in Tasks 1-5

- [ ] **Step 1: Run repository verification from a clean build**

Run:

```bash
rm -rf dist
CI=true pnpm build
pnpm check
git diff --check
```

Expected: build and static checks exit 0; `git diff --check` prints nothing.

- [ ] **Step 2: Start the built preview**

Run in a persistent background process:

```bash
pnpm preview
```

Expected: Astro reports `http://localhost:4173`.

- [ ] **Step 3: Verify HTTP routes and anchors**

Run:

```bash
curl -fsS http://localhost:4173/quickstart/ > /tmp/opencoven-quickstart.html
for anchor in coven-cli coven-code coven-cave castcodes github; do
  grep -q "id=\"$anchor\"" /tmp/opencoven-quickstart.html
done
curl -fsS http://localhost:4173/ > /dev/null
curl -fsS http://localhost:4173/github/ > /dev/null
```

Expected: every command exits 0.

- [ ] **Step 4: Inspect desktop and mobile renders**

Use an installed Chromium browser in headless mode to capture
`http://localhost:4173/quickstart/` at 1440×1000 and 390×844. Inspect that:

- chooser cards do not overflow;
- every command scrolls inside its own block;
- the sticky header does not cover anchored headings;
- product metadata stacks on mobile;
- light and dark theme tokens keep text and borders legible; and
- no content depends on reveal animation to remain visible.

- [ ] **Step 5: Exercise keyboard and copy behavior**

In the rendered page:

1. Tab from the skip link through chooser cards in document order.
2. Activate each chooser anchor and confirm the matching heading is visible.
3. Open and close a troubleshooting `<details>` using Enter/Space.
4. Activate at least one copy button and confirm the icon changes and the live
   status announces `Copied: <command>`.
5. Disable JavaScript and reload; confirm all product steps, commands,
   disclosures, and links remain readable.

Expected: all five checks pass without a keyboard trap or hidden guide.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git --no-pager diff origin/main...HEAD --stat
git --no-pager diff origin/main...HEAD -- src/data/quickstart.ts \
  src/components/QuickstartProduct.astro src/pages/quickstart.astro \
  src/components/Header.astro src/components/MobileNav.astro \
  src/components/Footer.astro src/components/QuickStart.astro \
  src/styles/global.css scripts/verify-static.mjs
```

Expected: only the planned route, content, navigation, style, and verifier
changes are present.
