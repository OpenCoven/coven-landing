# Living Familiar Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the OpenCoven homepage as one cohesive “Living Familiar” narrative that explains persistent local agents, differentiates all five OpenCoven products, and sends visitors to a verifiable first success at `/quickstart`.

**Architecture:** Start from the comprehensive Quick Start branch, keep all content server-rendered in Astro, put homepage narrative state in one typed data module, and consume the existing Quick Start product registry instead of duplicating it. Use scoped component styles for the new visual system, one small homepage interaction module for progressive enhancement, and the existing shared script for navigation, theme, downloads, and copy controls. Preserve `/quickstart`, `/github`, legal, download, sitemap, and metadata behavior.

**Tech Stack:** Astro 5, TypeScript, semantic HTML, scoped CSS, dependency-free browser JavaScript, Playwright 1.62, axe-core 4.12, Node static-output verification, Lighthouse 13.

---

## Required implementation base

The latest Quick Start boundary inspected while writing this plan is
`e025a4b`. That branch was still receiving narrow follow-ups, so capture its
committed head at execution time and validate the required content contracts
instead of assuming its history will remain fixed. Do not build from `main`,
reuse the live `feat/comprehensive-quickstart` worktree, or touch its untracked
`output/` directory.

Run these commands in one shell:

```bash
landing_base="$(git rev-parse feat/comprehensive-quickstart)"
git show --no-patch --oneline "$landing_base"
git show "$landing_base":src/data/quickstart.ts \
  | rg -q "export const quickstartProducts"
git show "$landing_base":src/pages/quickstart.astro \
  | rg -q "QuickstartProduct"
git show "$landing_base":scripts/verify-static.mjs \
  | rg -q "productContracts"

git worktree add \
  /Users/buns/.config/superpowers/worktrees/coven-landing/living-familiar \
  -b feat/living-familiar-landing \
  "$landing_base"
cd /Users/buns/.config/superpowers/worktrees/coven-landing/living-familiar
git restore --source design/living-familiar-landing -- \
  docs/superpowers/specs/2026-07-26-living-familiar-landing-design.md \
  docs/superpowers/plans/2026-07-26-living-familiar-landing.md
```

Expected: the three content checks exit `0`, and the new worktree starts from
the exact committed hash printed by `git show`.

Before editing, verify the baseline:

```bash
git status --short
CI=true pnpm build
pnpm check
```

Expected:

- only the two restored planning documents are untracked or modified;
- the Astro build produces five static routes;
- `pnpm check` reports the existing homepage, GitHub, and Quick Start
  contracts as verified.

Commit the approved documents only after that verification:

```bash
git add \
  docs/superpowers/specs/2026-07-26-living-familiar-landing-design.md \
  docs/superpowers/plans/2026-07-26-living-familiar-landing.md
git commit -m "docs: add living familiar implementation plan"
```

## File map

### Create

- `src/data/landing.ts` — typed familiar, trust, continuity, and runtime-proof
  content.
- `src/components/FamiliarLedger.astro` — reusable immutable-dark ledger
  snapshot.
- `src/components/TrustBar.astro` — harness compatibility and ownership proof.
- `src/components/ContinuityStory.astro` — ordered story plus sticky progressive
  enhancement.
- `src/components/RuntimeProof.astro` — desktop tabs and mobile native
  disclosures.
- `src/components/ProductConstellation.astro` — five product links sourced from
  `quickstartProducts`.
- `src/components/ClosingInvitation.astro` — ownership statement and final
  conversion.
- `src/components/FeedbackLauncher.astro` — lightweight direct-link fallback
  that activates the remote widget only on demand.
- `src/scripts/landing.js` — homepage-only hero, continuity, runtime, and
  feedback enhancement.
- `playwright.config.ts` — production-preview browser test configuration.
- `tests/landing.spec.ts` — interaction, accessibility, no-JavaScript, theme,
  and viewport regression coverage.

### Modify

- `src/pages/index.astro` — compose the new narrative and load homepage-only
  behavior.
- `src/components/Hero.astro` — new CTA hierarchy and stable illustrative
  familiar ledger.
- `src/components/DownloadCTA.astro` — quiet platform-aware Cave shortcut.
- `src/components/QuickStart.astro` — derive the compact CLI preview from
  `quickstartProducts`.
- `src/components/Header.astro` — new desktop information architecture and
  one conversion CTA.
- `src/components/MobileNav.astro` — opaque accessible modal plus no-JavaScript
  fallback.
- `src/components/Footer.astro` — current anchors, support, community, social,
  and legal destinations.
- `src/components/QuickstartProduct.astro` — mark command surfaces so shared
  clipboard failure can select their text.
- `src/scripts/main.js` — robust shared navigation, header, clipboard, download,
  and theme behavior; remove homepage terminal rotation.
- `src/styles/global.css` — retain shared and route styles, remove superseded
  homepage blocks, and update shared shell styles.
- `scripts/verify-static.mjs` — enforce the rendered homepage and JavaScript
  budget contract without weakening Quick Start checks.
- `package.json` and `pnpm-lock.yaml` — repeatable browser and accessibility
  checks.
- `.github/workflows/ci.yml` — run Chromium checks after the static build.
- `.gitignore` — ignore Playwright reports and test artifacts.

### Delete after import proof

- `src/components/Architecture.astro`
- `src/components/HowItWorks.astro`
- `src/components/Compare.astro`
- `src/components/ProofGrid.astro`
- `src/components/Testimonial.astro`
- `src/components/Ecosystem.astro`
- `src/scripts/shared.js` if `git grep` confirms it has no remaining importers.

## Page and interaction contracts

Use these exact public IDs and data hooks. They are the stable seam for
navigation, progressive enhancement, and tests:

| Purpose | Contract |
| --- | --- |
| Story section | `#how-it-works` |
| Story stages | `#stage-summoned`, `#stage-learned`, `#stage-moved`, `#stage-returned` |
| Runtime proof | `#runtime` |
| Product chooser | `#products` |
| Quick Start preview | `#quickstart` |
| Primary conversion | `data-primary-cta`, always `href="/quickstart"` |
| Hero familiar switcher | `data-familiar-switcher`, `data-familiar-tab`, `data-familiar-panel` |
| Story enhancement | `data-continuity-story`, `data-story-stage`, `data-story-panel` |
| Runtime enhancement | `data-runtime-proof`, `data-runtime-tab`, `data-runtime-panel` |
| Product list | `data-product-constellation` |
| Feedback activation | `data-feedback-launcher` |

Do not add tracking IDs, runtime metrics, synthetic wheel handling, scroll
snapping, a client framework, or another product registry.

### Task 1: Add a repeatable browser-test foundation

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.gitignore`
- Create: `playwright.config.ts`
- Create: `tests/landing.spec.ts`

- [ ] **Step 1: Add pinned test dependencies**

Run:

```bash
pnpm add -D @playwright/test@1.62.0 @axe-core/playwright@4.12.1 lighthouse@13.4.1
pnpm exec playwright install chromium
```

Add this script to `package.json`:

```json
"check:browser": "playwright test tests/landing.spec.ts"
```

Append these exact entries to `.gitignore`:

```gitignore
/playwright-report/
/test-results/
```

- [ ] **Step 2: Add the production-preview Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

- [ ] **Step 3: Add a passing baseline smoke test**

Create `tests/landing.spec.ts` with the initial smoke test:

```ts
import { expect, test } from '@playwright/test';

for (const pathname of ['/', '/quickstart', '/github']) {
  test(`${pathname} renders without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    const response = await page.goto(pathname);

    expect(response?.ok()).toBe(true);
    await expect(page.locator('main')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
```

- [ ] **Step 4: Verify and commit the test foundation**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser
```

Expected: all static checks and three Chromium smoke cases pass.

Commit:

```bash
git add .gitignore package.json pnpm-lock.yaml playwright.config.ts tests/landing.spec.ts
git commit -m "test: add landing browser verification"
```

### Task 2: Model the living familiar and render one theme-safe ledger

**Files:**

- Create: `src/data/landing.ts`
- Create: `src/components/FamiliarLedger.astro`
- Modify: `scripts/verify-static.mjs`

- [ ] **Step 1: Add a failing source contract**

Near the existing `sourceCss` and `sourceMain` reads in
`scripts/verify-static.mjs`, add:

```js
const sourceLandingData = await readFile(
  path.join(root, 'src/data/landing.ts'),
  'utf8',
);
const sourceLedger = await readFile(
  path.join(root, 'src/components/FamiliarLedger.astro'),
  'utf8',
);

for (const exportName of [
  'heroFamiliars',
  'storyStages',
  'trustStatements',
  'runtimeLayers',
]) {
  if (!sourceLandingData.includes(`export const ${exportName}`)) {
    throw new Error(`src/data/landing.ts must export ${exportName}`);
  }
}

for (const terminalToken of [
  '--ledger-bg: #0b0910',
  '--ledger-text: #e8e0f0',
  '--ledger-muted: #aaa1b8',
]) {
  if (!sourceLedger.includes(terminalToken)) {
    throw new Error(
      `FamiliarLedger must own immutable terminal token ${terminalToken}`,
    );
  }
}
```

Run:

```bash
CI=true pnpm build && pnpm check
```

Expected: `pnpm check` fails because `src/data/landing.ts` is absent. Do not
commit the failing state.

- [ ] **Step 2: Create the typed landing data**

Create `src/data/landing.ts`:

```ts
export interface LedgerNote {
  text: string;
  meta: string;
}

export interface LedgerSnapshot {
  id: string;
  sigil: string;
  name: string;
  role: string;
  state: string;
  session: string;
  memoryLabel: string;
  notes: LedgerNote[];
}

export interface FamiliarProfile {
  id: string;
  label: string;
  snapshot: LedgerSnapshot;
}

export interface StoryStage {
  id: 'summoned' | 'learned' | 'moved' | 'returned';
  eyebrow: string;
  title: string;
  body: string;
  snapshot: LedgerSnapshot;
}

export interface TrustStatement {
  label: string;
  value: string;
}

export interface RuntimeLayer {
  id: 'surface' | 'coven' | 'project';
  index: string;
  label: string;
  title: string;
  summary: string;
  detail: string;
}

const hexiBase = {
  sigil: 'H',
  name: 'Hexi',
  role: 'code steward · tools · git',
};

export const heroFamiliars: FamiliarProfile[] = [
  {
    id: 'hexi',
    label: 'Hexi',
    snapshot: {
      id: 'hero-hexi',
      ...hexiBase,
      state: 'ready',
      session: 'feat/runtime-attach',
      memoryLabel: 'project memory restored',
      notes: [
        { text: '4 files staged · tests pending', meta: 'session' },
        { text: 'prefers terse PR summaries', meta: 'remembered' },
      ],
    },
  },
  {
    id: 'charm',
    label: 'Charm',
    snapshot: {
      id: 'hero-charm',
      sigil: 'C',
      name: 'Charm',
      role: 'voice · social · presence',
      state: 'ready',
      session: 'design-sync',
      memoryLabel: 'thread context restored',
      notes: [
        { text: 'reply draft awaiting review', meta: 'session' },
        { text: 'warm, concise, no filler', meta: 'remembered' },
      ],
    },
  },
  {
    id: 'sage',
    label: 'Sage',
    snapshot: {
      id: 'hero-sage',
      sigil: 'S',
      name: 'Sage',
      role: 'research · docs · long context',
      state: 'ready',
      session: 'runtime-notes',
      memoryLabel: 'research context restored',
      notes: [
        { text: '4 source documents attached', meta: 'session' },
        { text: 'summarize evidence before advice', meta: 'remembered' },
      ],
    },
  },
];

export const storyStages: StoryStage[] = [
  {
    id: 'summoned',
    eyebrow: 'Day 1 · Summoned',
    title: 'Start inside one explicit project.',
    body:
      'Coven creates a project-scoped session and records the harness, work state, and local context needed to inspect what happened.',
    snapshot: {
      id: 'story-summoned',
      ...hexiBase,
      state: 'session created',
      session: 'opencoven · main',
      memoryLabel: 'new project record',
      notes: [
        { text: 'project boundary: ./opencoven', meta: 'local' },
        { text: 'harness: codex', meta: 'attached' },
      ],
    },
  },
  {
    id: 'learned',
    eyebrow: 'Day 9 · Learned',
    title: 'Keep the conventions worth carrying.',
    body:
      'Explicit review preferences, repository conventions, and durable decisions stay with the familiar instead of disappearing with the terminal session.',
    snapshot: {
      id: 'story-learned',
      ...hexiBase,
      state: 'memory updated',
      session: 'review-followup',
      memoryLabel: 'working conventions',
      notes: [
        { text: 'smallest correct patch', meta: 'remembered' },
        { text: 'verify before commit', meta: 'remembered' },
      ],
    },
  },
  {
    id: 'moved',
    eyebrow: 'Day 23 · Moved',
    title: 'Change surfaces without starting over.',
    body:
      'Move between a supported harness or OpenCoven surface while the Coven runtime keeps the shared project record and provider credentials remain provider-owned.',
    snapshot: {
      id: 'story-moved',
      ...hexiBase,
      state: 'surface changed',
      session: 'cave · runtime-attach',
      memoryLabel: 'shared runtime record',
      notes: [
        { text: 'surface: Coven Cave', meta: 'current' },
        { text: 'prior Codex session retained', meta: 'available' },
      ],
    },
  },
  {
    id: 'returned',
    eyebrow: 'Day 47 · Returned',
    title: 'Resume with the relevant state intact.',
    body:
      'A later session restores the project context, the conventions that matter, and the work state required to continue deliberately.',
    snapshot: {
      id: 'story-returned',
      ...hexiBase,
      state: 'resumed',
      session: 'feat/runtime-attach',
      memoryLabel: 'relevant context restored',
      notes: [
        { text: '4 files staged · tests pending', meta: 'restored' },
        { text: 'next: verify the adapter boundary', meta: 'ready' },
      ],
    },
  },
];

export const trustStatements: TrustStatement[] = [
  { label: 'Harnesses', value: 'Codex · Claude Code' },
  { label: 'Source', value: 'Open source' },
  { label: 'Runtime', value: 'Local-first' },
  { label: 'Authentication', value: 'Provider-owned' },
];

export const runtimeLayers: RuntimeLayer[] = [
  {
    id: 'surface',
    index: '01',
    label: 'Surface',
    title: 'Harness or product surface',
    summary: 'Work where the task makes sense.',
    detail:
      'Use Codex, Claude Code, Coven Code, Cave, CastCodes, or GitHub without making that interface the durable system of record.',
  },
  {
    id: 'coven',
    index: '02',
    label: 'Runtime',
    title: 'Coven',
    summary: 'Keep continuity in one inspectable runtime.',
    detail:
      'Sessions, familiar memory, adapters, and controlled tool access stay in the shared local-first layer between the surface and project.',
  },
  {
    id: 'project',
    index: '03',
    label: 'Boundary',
    title: 'Your project',
    summary: 'Keep authority inside the boundary you chose.',
    detail:
      'The filesystem, Git repository, terminals, and docs remain inside the explicit project and machine context you control.',
  },
];
```

- [ ] **Step 3: Render the reusable ledger with immutable terminal colors**

Create `src/components/FamiliarLedger.astro`:

```astro
---
import type { LedgerSnapshot } from '../data/landing';

interface Props {
  snapshot: LedgerSnapshot;
  label?: string;
  decorative?: boolean;
  compact?: boolean;
}

const {
  snapshot,
  label = `${snapshot.name} local familiar ledger`,
  decorative = false,
  compact = false,
} = Astro.props;
---

<article
  class:list={['familiar-ledger', { 'is-compact': compact }]}
  data-ledger-state={snapshot.id}
  aria-label={decorative ? undefined : label}
  aria-hidden={decorative ? 'true' : undefined}
>
  <header class="ledger-topbar">
    <span class="ledger-window" aria-hidden="true">
      <i></i><i></i><i></i>
    </span>
    <span>familiar.ledger</span>
    <span class="ledger-scope">example · local</span>
  </header>

  <div class="ledger-identity">
    <span class="ledger-sigil" aria-hidden="true">{snapshot.sigil}</span>
    <span>
      <strong>{snapshot.name}</strong>
      <small>{snapshot.role}</small>
    </span>
    <span class="ledger-state">
      <i aria-hidden="true"></i>{snapshot.state}
    </span>
  </div>

  <dl class="ledger-session">
    <div>
      <dt>session</dt>
      <dd>{snapshot.session}</dd>
    </div>
    <div>
      <dt>memory</dt>
      <dd>{snapshot.memoryLabel}</dd>
    </div>
  </dl>

  <ul class="ledger-notes" role="list">
    {snapshot.notes.map((note) => (
      <li>
        <span>{note.text}</span>
        <small>{note.meta}</small>
      </li>
    ))}
  </ul>
</article>

<style>
  .familiar-ledger {
    --ledger-bg: #0b0910;
    --ledger-surface: #111018;
    --ledger-line: rgba(196, 185, 240, 0.2);
    --ledger-text: #e8e0f0;
    --ledger-muted: #aaa1b8;
    --ledger-accent: #c4b9f0;
    --ledger-signal: #30d158;
    overflow: hidden;
    border: 1px solid var(--ledger-line);
    border-radius: 12px;
    background: var(--ledger-bg);
    color: var(--ledger-text);
    box-shadow: 0 32px 80px -40px rgba(0, 0, 0, 0.8);
    font-size: 0.8125rem;
  }

  .ledger-topbar,
  .ledger-identity,
  .ledger-session > div,
  .ledger-notes li {
    display: flex;
    align-items: center;
  }

  .ledger-topbar {
    min-height: 42px;
    gap: 12px;
    padding: 0 16px;
    border-bottom: 1px solid var(--ledger-line);
    color: var(--ledger-muted);
    font: 0.6875rem/1 var(--mono);
  }

  .ledger-window {
    display: flex;
    gap: 5px;
  }

  .ledger-window i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ledger-line);
  }

  .ledger-scope {
    margin-left: auto;
    color: var(--ledger-accent);
  }

  .ledger-identity {
    gap: 12px;
    padding: 18px;
  }

  .ledger-sigil {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid var(--ledger-line);
    border-radius: 10px;
    background: rgba(196, 185, 240, 0.08);
    color: var(--ledger-accent);
    font: 700 1rem/1 var(--mono);
  }

  .ledger-identity strong,
  .ledger-identity small {
    display: block;
  }

  .ledger-identity strong {
    font-size: 0.9375rem;
  }

  .ledger-identity small {
    margin-top: 4px;
    color: var(--ledger-muted);
    font: 0.6875rem/1.4 var(--mono);
  }

  .ledger-state {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    color: var(--ledger-signal);
    font: 0.625rem/1 var(--mono);
  }

  .ledger-state i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .ledger-session {
    display: grid;
    margin: 0 18px;
    border: 1px solid var(--ledger-line);
    border-radius: 8px;
    background: var(--ledger-surface);
  }

  .ledger-session > div {
    min-width: 0;
    gap: 12px;
    padding: 10px 12px;
  }

  .ledger-session > div + div {
    border-top: 1px solid var(--ledger-line);
  }

  .ledger-session dt {
    width: 56px;
    flex: 0 0 auto;
    color: var(--ledger-muted);
    font: 0.625rem/1 var(--mono);
    text-transform: uppercase;
  }

  .ledger-session dd {
    overflow: hidden;
    color: var(--ledger-text);
    font: 0.75rem/1.4 var(--mono);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ledger-notes {
    display: grid;
    gap: 8px;
    padding: 14px 18px 18px;
  }

  .ledger-notes li {
    justify-content: space-between;
    gap: 14px;
    color: var(--ledger-text);
    font: 0.75rem/1.45 var(--mono);
  }

  .ledger-notes small {
    flex: 0 0 auto;
    color: var(--ledger-muted);
    font: inherit;
  }

  .is-compact .ledger-topbar {
    min-height: 36px;
  }

  .is-compact .ledger-identity {
    padding: 14px;
  }

  .is-compact .ledger-session {
    margin-inline: 14px;
  }

  .is-compact .ledger-notes {
    padding: 12px 14px 14px;
  }

  @media (max-width: 400px) {
    .familiar-ledger {
      font-size: 13px;
    }

    .ledger-topbar,
    .ledger-identity small,
    .ledger-state,
    .ledger-session dt,
    .ledger-session dd,
    .ledger-notes li {
      font-size: 13px;
    }

    .ledger-notes li {
      align-items: flex-start;
      flex-direction: column;
      gap: 2px;
    }
  }
</style>
```

- [ ] **Step 4: Verify and commit the data boundary**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser
```

Expected: the source contract and all existing route checks pass.

Commit:

```bash
git add src/data/landing.ts src/components/FamiliarLedger.astro scripts/verify-static.mjs
git commit -m "feat: model the living familiar story"
```

### Task 3: Rebuild the hero around one primary path

**Files:**

- Modify: `src/components/Hero.astro`
- Modify: `src/components/DownloadCTA.astro`
- Create: `src/scripts/landing.js`
- Modify: `src/scripts/main.js`
- Modify: `src/pages/index.astro`
- Modify: `scripts/verify-static.mjs`
- Modify: `tests/landing.spec.ts`

- [ ] **Step 1: Replace the old homepage verifier assertions with a failing hero contract**

Inside the `dist/index.html` block in `scripts/verify-static.mjs`, replace the
old download-order and “exactly four `/quickstart` links” assertions with:

```js
const requiredHeroCopy = [
  'Summon agents that remember.',
  'Start with OpenCoven',
  'View on GitHub',
  'example · local',
  'Download Coven Cave for macOS',
];
const missingHeroCopy = requiredHeroCopy.filter(
  (needle) => !renderedText.includes(needle),
);
if (missingHeroCopy.length > 0) {
  throw new Error(
    `Missing Living Familiar hero copy in dist/index.html: ${missingHeroCopy.join(', ')}`,
  );
}

const heroHtml = html.match(
  /<section(?=[^>]*\bclass="hero")(?=[^>]*\bid="top")[^>]*>([\s\S]*?)<\/section>/,
)?.[1];
if (!heroHtml) {
  throw new Error('Homepage must render <section class="hero" id="top">');
}

if (
  !/<a(?=[^>]*\bdata-primary-cta)(?=[^>]*\bhref="\/quickstart")[^>]*>\s*Start with OpenCoven\s*<\/a>/.test(
    heroHtml,
  )
) {
  throw new Error('Hero primary CTA must be Start with OpenCoven → /quickstart');
}

const familiarTabs = countMatches(heroHtml, /\bdata-familiar-tab=/g);
const familiarPanels = countMatches(heroHtml, /\bdata-familiar-panel=/g);
if (familiarTabs !== 3 || familiarPanels !== 3) {
  throw new Error(
    `Hero must render three manual familiar tabs and panels; found ${familiarTabs} tabs and ${familiarPanels} panels`,
  );
}

if (!html.includes('data-download-primary')) {
  throw new Error('Hero must preserve one platform-aware Cave download shortcut');
}
if (html.includes('data-download-ios')) {
  throw new Error('The quiet hero shortcut must not render a competing iOS download button');
}
```

Update the existing `requiredCopy` list so it retains metadata and global
destinations but no longer requires superseded body copy:

```js
const requiredCopy = [
  'Persistent AI Familiars',
  'familiars',
  'Coven CLI',
  'Quick Start',
  'https://discord.gg/opencoven',
];
```

After the existing `sourceMain` read later in the verifier, add:

```js
if (sourceMain.includes('setInterval(rotate')) {
  throw new Error('Hero familiars must not rotate automatically');
}
```

- [ ] **Step 2: Add a failing hero interaction test**

Append to `tests/landing.spec.ts`:

```ts
test('hero exposes one primary path and manual familiar tabs', async ({ page }) => {
  await page.goto('/');

  const hero = page.locator('.hero');
  await expect(
    hero.locator('[data-primary-cta][href="/quickstart"]'),
  ).toHaveText('Start with OpenCoven');
  await expect(
    hero.locator('a[href="https://github.com/OpenCoven/coven"]'),
  ).toHaveText('View on GitHub');

  const tabs = hero.locator('[data-familiar-tab]');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
});
```

Run:

```bash
CI=true pnpm build && pnpm check
pnpm check:browser --grep "hero exposes"
```

Expected: the static hero contract and browser test fail against the old hero.
Do not commit.

- [ ] **Step 3: Turn `DownloadCTA` into the quiet platform-aware shortcut**

Replace `src/components/DownloadCTA.astro` with:

```astro
---
const DOWNLOAD_MAC = '/download/mac';
const TESTFLIGHT_URL = 'https://testflight.apple.com/join/61Dqw8y4';
---

<p
  class="cave-shortcut"
  data-download-cta
  data-testflight-url={TESTFLIGHT_URL}
>
  <span>Prefer a visual home?</span>
  <a
    href={DOWNLOAD_MAC}
    data-download-primary
    data-platform="mac"
  >
    <span data-download-label>Download Coven Cave for macOS</span>
    <span aria-hidden="true">↗</span>
  </a>
</p>

<style>
  .cave-shortcut {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 18px;
    color: var(--muted);
    font-size: 0.8125rem;
  }

  .cave-shortcut a {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: 6px;
    color: var(--vtext);
    font-weight: 650;
    text-underline-offset: 4px;
  }

  @media (max-width: 520px) {
    .cave-shortcut {
      align-items: flex-start;
      flex-direction: column;
      gap: 0;
    }
  }
</style>
```

In the platform-detection block in `src/scripts/main.js`, replace `COPY` with:

```js
var COPY = {
  mac: {
    label: 'Download Coven Cave for macOS',
    href: DOWNLOAD.mac,
  },
  win: {
    label: 'Download Coven Cave for Windows',
    href: DOWNLOAD.win,
  },
  linux: {
    label: 'Download Coven Cave for Linux',
    href: DOWNLOAD.linux,
  },
  ios: {
    label: 'Get Coven Cave for iOS beta',
    href: testflightUrl,
  },
};
```

Keep `subEl` and `iosBtn` guards so the shared script remains compatible with
any full download treatment outside the homepage.

- [ ] **Step 4: Replace the hero markup**

Replace `src/components/Hero.astro` with this structure:

```astro
---
import DownloadCTA from './DownloadCTA.astro';
import FamiliarLedger from './FamiliarLedger.astro';
import { heroFamiliars } from '../data/landing';
---

<section class="hero" id="top" aria-labelledby="hero-heading">
  <div class="hero-copy">
    <p class="hero-kicker">
      <span><i aria-hidden="true"></i>public beta</span>
      free · open source · local-first
    </p>

    <h1 id="hero-heading">Summon agents<br />that <em>remember.</em></h1>

    <p class="hero-lede">
      Give an AI agent a durable place in your work. A familiar keeps the
      project context, conventions, and work state worth carrying after the
      terminal closes.
    </p>

    <div class="hero-actions">
      <a class="btn-primary" data-primary-cta href="/quickstart">
        Start with OpenCoven
      </a>
      <a
        class="btn-secondary"
        href="https://github.com/OpenCoven/coven"
        target="_blank"
        rel="noopener noreferrer"
      >
        View on GitHub
        <span class="sr-only"> (opens in new tab)</span>
      </a>
    </div>

    <DownloadCTA />
  </div>

  <div class="hero-ledger" data-familiar-switcher>
    <p class="hero-ledger-caption">
      One local runtime. Deliberate memory.
    </p>

    <div class="hero-ledger-panels">
      {heroFamiliars.map((familiar, index) => (
        <div
          id={`hero-panel-${familiar.id}`}
          data-familiar-panel={familiar.id}
          role="tabpanel"
          aria-labelledby={`hero-tab-${familiar.id}`}
          hidden={index !== 0}
        >
          <FamiliarLedger
            snapshot={familiar.snapshot}
            label={`${familiar.label} illustrative local familiar ledger`}
          />
        </div>
      ))}
    </div>

    <div class="hero-tabs" role="tablist" aria-label="Choose an example familiar">
      {heroFamiliars.map((familiar, index) => (
        <button
          id={`hero-tab-${familiar.id}`}
          type="button"
          role="tab"
          data-familiar-tab={familiar.id}
          aria-controls={`hero-panel-${familiar.id}`}
          aria-selected={index === 0 ? 'true' : 'false'}
          tabindex={index === 0 ? '0' : '-1'}
        >
          {familiar.label}
        </button>
      ))}
    </div>
  </div>

  <a class="hero-thread-cue" href="#how-it-works">
    <span aria-hidden="true"></span>
    See what carries forward
  </a>
</section>

<style>
  .hero {
    position: relative;
    z-index: 1;
    display: grid;
    width: min(100%, 1280px);
    min-height: calc(100svh - 60px);
    grid-template-columns: minmax(0, 5fr) minmax(420px, 7fr);
    align-items: center;
    gap: clamp(48px, 7vw, 96px);
    margin: 0 auto;
    padding: clamp(72px, 9vh, 112px) 32px 104px;
  }

  .hero-copy {
    max-width: 600px;
  }

  .hero-kicker {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 24px;
    color: var(--muted);
    font: 700 0.6875rem/1 var(--mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .hero-kicker span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--vtext);
  }

  .hero-kicker i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green);
  }

  h1 {
    margin: 0 0 24px;
    font-family: var(--font-display);
    font-size: clamp(3.25rem, 6vw, 5.75rem);
    font-weight: 800;
    letter-spacing: -0.055em;
    line-height: 0.96;
  }

  h1 em {
    color: var(--oc-purple-accent);
    font-style: normal;
    font-weight: inherit;
  }

  .hero-lede {
    max-width: 58ch;
    margin-bottom: 30px;
    color: var(--muted);
    font-size: 1.0625rem;
    line-height: 1.7;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .hero-ledger {
    min-width: 0;
  }

  .hero-ledger-caption {
    margin: 0 0 12px 4px;
    color: var(--muted);
    font: 0.6875rem/1.4 var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .hero-ledger-panels {
    position: relative;
  }

  .hero-tabs {
    display: none;
    justify-content: center;
    gap: 6px;
    margin-top: 14px;
  }

  :global(.js-on) .hero-tabs {
    display: flex;
  }

  .hero-tabs button {
    min-width: 72px;
    min-height: 44px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font: 700 0.6875rem/1 var(--mono);
  }

  .hero-tabs button[aria-selected='true'] {
    border-color: var(--border-v);
    background: rgba(154, 142, 205, 0.1);
    color: var(--white);
  }

  .hero-thread-cue {
    position: absolute;
    bottom: 34px;
    left: 32px;
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: 10px;
    color: var(--muted);
    font: 0.6875rem/1 var(--mono);
    text-decoration: none;
  }

  .hero-thread-cue span {
    width: 42px;
    height: 1px;
    background: linear-gradient(90deg, var(--oc-purple-accent), transparent);
  }

  :global(.motion-on) .hero-copy {
    animation: hero-arrive 620ms var(--ease-out) both;
  }

  :global(.motion-on) .hero-ledger {
    animation: ledger-arrive 720ms 120ms var(--ease-out) both;
  }

  :global(.motion-on) .hero-thread-cue span {
    animation: thread-arrive 460ms 420ms var(--ease-out) both;
    transform-origin: left;
  }

  @keyframes hero-arrive {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: none; }
  }

  @keyframes ledger-arrive {
    from { opacity: 0; transform: translateY(12px) scale(0.99); }
    to { opacity: 1; transform: none; }
  }

  @keyframes thread-arrive {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }

  @media (max-width: 900px) {
    .hero {
      min-height: auto;
      grid-template-columns: 1fr;
      gap: 44px;
      padding: 72px 20px 88px;
    }

    .hero-copy {
      max-width: 680px;
    }
  }

  @media (max-width: 520px) {
    .hero {
      gap: 36px;
      padding: 56px 16px 80px;
    }

    h1 {
      font-size: clamp(2.75rem, 14vw, 4rem);
    }

    .hero-lede {
      font-size: 0.9375rem;
    }

    .hero-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .hero-actions a {
      justify-content: center;
      min-height: 48px;
    }

    .hero-thread-cue {
      bottom: 22px;
      left: 16px;
    }
  }
</style>
```

- [ ] **Step 5: Add the manual hero enhancement**

Create `src/scripts/landing.js` with:

```js
function wireRovingTabs(root, tabSelector, panelSelector, valueAttribute) {
  if (!root) return;
  var tabs = Array.from(root.querySelectorAll(tabSelector));
  var panels = Array.from(root.querySelectorAll(panelSelector));
  if (!tabs.length || !panels.length) return;

  function select(tab, moveFocus) {
    var value = tab.getAttribute(valueAttribute);
    tabs.forEach(function (candidate) {
      var active = candidate === tab;
      candidate.setAttribute('aria-selected', active ? 'true' : 'false');
      candidate.setAttribute('tabindex', active ? '0' : '-1');
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute(valueAttribute.replace('tab', 'panel')) !== value;
    });
    if (moveFocus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      select(tab, false);
    });
    tab.addEventListener('keydown', function (event) {
      var nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      select(tabs[nextIndex], true);
    });
  });
}

wireRovingTabs(
  document.querySelector('[data-familiar-switcher]'),
  '[data-familiar-tab]',
  '[data-familiar-panel]',
  'data-familiar-tab',
);
```

The `valueAttribute.replace(...)` expression deliberately maps
`data-familiar-tab` to `data-familiar-panel`; later runtime tabs use their own
explicit function because their panel transition differs.

Remove the entire `Hero terminal: live summon session` IIFE from
`src/scripts/main.js`, including its rotation and typewriter timers.

In `src/pages/index.astro`, keep the shared script and add the homepage module:

```astro
<script>
  import '../scripts/main.js';
  import '../scripts/landing.js';
</script>
```

- [ ] **Step 6: Verify the new hero in both themes and commit**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser --grep "hero exposes|renders without"
```

Then inspect `/` at `1440×1000`, `390×844`, dark, and light. Confirm the hero
does not rotate after seven seconds, its only dominant CTA is
`Start with OpenCoven`, and the ledger remains dark with readable text in light
mode.

Commit:

```bash
git add \
  src/components/Hero.astro \
  src/components/DownloadCTA.astro \
  src/scripts/landing.js \
  src/scripts/main.js \
  src/pages/index.astro \
  scripts/verify-static.mjs \
  tests/landing.spec.ts
git commit -m "feat: rebuild the living familiar hero"
```

### Task 4: Build the trust interlude and continuous memory story

**Files:**

- Create: `src/components/TrustBar.astro`
- Create: `src/components/ContinuityStory.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/scripts/landing.js`
- Modify: `scripts/verify-static.mjs`
- Modify: `tests/landing.spec.ts`
- Delete: `src/components/Testimonial.astro`

- [ ] **Step 1: Add failing semantic and interaction assertions**

Add these homepage assertions to `scripts/verify-static.mjs`:

```js
const requiredStoryCopy = [
  'Codex · Claude Code',
  'Open source',
  'Local-first',
  'Provider-owned',
  'Start inside one explicit project.',
  'Keep the conventions worth carrying.',
  'Change surfaces without starting over.',
  'Resume with the relevant state intact.',
];
const missingStoryCopy = requiredStoryCopy.filter(
  (needle) => !renderedText.includes(needle),
);
if (missingStoryCopy.length > 0) {
  throw new Error(
    `Missing continuity story copy in dist/index.html: ${missingStoryCopy.join(', ')}`,
  );
}

if (!/<ol\s+class="continuity-stages"\s+role="list"\s*>/.test(html)) {
  throw new Error('Continuity story must render an ordered list with role="list"');
}

for (const stageId of ['summoned', 'learned', 'moved', 'returned']) {
  const stagePattern = new RegExp(
    `<li(?=[^>]*\\bid="stage-${stageId}")(?=[^>]*\\bdata-story-stage="${stageId}")[^>]*>`,
  );
  if (!stagePattern.test(html)) {
    throw new Error(`Continuity story is missing semantic stage ${stageId}`);
  }
}
```

Append these tests to `tests/landing.spec.ts`:

```ts
test('continuity anchors and passive scroll select story state', async ({ page }) => {
  await page.goto('/');

  const story = page.locator('[data-continuity-story]');
  await expect(story.locator('[data-story-stage]')).toHaveCount(4);
  await expect(story.locator('[data-story-panel]:not([hidden])')).toHaveAttribute(
    'data-story-panel',
    'summoned',
  );

  await story.locator('a[href="#stage-moved"]').click();
  await expect(page).toHaveURL(/#stage-moved$/);
  await expect(story.locator('[data-story-panel]:not([hidden])')).toHaveAttribute(
    'data-story-panel',
    'moved',
  );

  await page.goto('/');
  await story.locator('#stage-returned').scrollIntoViewIfNeeded();
  await expect(story.locator('[data-story-panel]:not([hidden])')).toHaveAttribute(
    'data-story-panel',
    'returned',
  );
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
});

test('mobile story renders a readable ledger snapshot per stage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const stages = page.locator('[data-story-stage]');
  await expect(stages).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(stages.nth(index).locator('.stage-snapshot')).toBeVisible();
  }
  await expect(page.locator('.story-visual')).toBeHidden();
});
```

Run:

```bash
CI=true pnpm build && pnpm check
pnpm check:browser --grep "continuity|mobile story"
```

Expected: both contracts fail against the current page. Do not commit.

- [ ] **Step 2: Create the compact trust bar**

Create `src/components/TrustBar.astro`:

```astro
---
import { trustStatements } from '../data/landing';
---

<aside class="trust-bar" aria-label="Compatibility and ownership">
  <p>Works with the tools and accounts you already control.</p>
  <dl>
    {trustStatements.map((statement) => (
      <div>
        <dt>{statement.label}</dt>
        <dd>{statement.value}</dd>
      </div>
    ))}
  </dl>
</aside>

<style>
  .trust-bar {
    position: relative;
    z-index: 1;
    width: min(calc(100% - 64px), 1216px);
    margin: 0 auto;
    padding: 22px 0;
    border-block: 1px solid var(--oc-border-subtle);
  }

  .trust-bar > p {
    margin-bottom: 16px;
    color: var(--muted);
    font-size: 0.8125rem;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 24px;
  }

  dl div {
    min-width: 0;
  }

  dt {
    margin-bottom: 6px;
    color: var(--muted);
    font: 0.625rem/1 var(--mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  dd {
    color: var(--white);
    font-size: 0.875rem;
    font-weight: 650;
  }

  @media (max-width: 760px) {
    .trust-bar {
      width: calc(100% - 40px);
    }

    dl {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      row-gap: 20px;
    }
  }

  @media (max-width: 400px) {
    .trust-bar {
      width: calc(100% - 32px);
    }
  }
</style>
```

- [ ] **Step 3: Create the ordered continuity story**

Create `src/components/ContinuityStory.astro`:

```astro
---
import FamiliarLedger from './FamiliarLedger.astro';
import { storyStages } from '../data/landing';
---

<section
  class="continuity-story"
  id="how-it-works"
  data-continuity-story
  aria-labelledby="continuity-heading"
>
  <header class="story-header">
    <p class="section-kicker">One familiar, later</p>
    <h2 id="continuity-heading">
      Memory matters when the session ends.
    </h2>
    <p>
      Follow one project record from first summon to a later return. The story
      is the product model; the changing ledger is only a visual aid.
    </p>
  </header>

  <div class="story-layout">
    <ol class="continuity-stages" role="list">
      {storyStages.map((stage, index) => (
        <li
          id={`stage-${stage.id}`}
          data-story-stage={stage.id}
          class:list={{ 'is-active': index === 0 }}
        >
          <a
            class="stage-anchor"
            data-story-anchor={stage.id}
            href={`#stage-${stage.id}`}
            aria-current={index === 0 ? 'step' : undefined}
          >
            <span class="stage-node" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span>{stage.eyebrow}</span>
          </a>
          <h3>{stage.title}</h3>
          <p>{stage.body}</p>
          <div class="stage-snapshot">
            <FamiliarLedger
              snapshot={stage.snapshot}
              decorative
              compact
            />
          </div>
        </li>
      ))}
    </ol>

    <div class="story-visual" aria-hidden="true">
      <div class="story-thread">
        <span></span>
      </div>
      <div class="story-panels">
        {storyStages.map((stage, index) => (
          <div
            data-story-panel={stage.id}
            hidden={index !== 0}
          >
            <FamiliarLedger
              snapshot={stage.snapshot}
              decorative
            />
          </div>
        ))}
      </div>
    </div>
  </div>
</section>

<style>
  .continuity-story {
    --story-progress: 0%;
    position: relative;
    z-index: 1;
    width: min(100%, 1280px);
    margin: 0 auto;
    padding: 112px 32px;
    scroll-margin-top: 76px;
  }

  .story-header {
    max-width: 720px;
    margin-bottom: 72px;
  }

  .story-header h2 {
    max-width: 16ch;
  }

  .story-header > p:last-child {
    max-width: 64ch;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.7;
  }

  .story-layout {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(420px, 7fr);
    gap: clamp(56px, 8vw, 112px);
  }

  .continuity-stages {
    list-style: none;
  }

  .continuity-stages li {
    min-height: 54vh;
    padding: 20px 0 88px 52px;
    scroll-margin-top: 100px;
  }

  .stage-anchor {
    position: relative;
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: 14px;
    margin-left: -52px;
    color: var(--muted);
    font: 700 0.6875rem/1.3 var(--mono);
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .stage-node {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border: 1px solid var(--border-v);
    border-radius: 50%;
    background: var(--bg);
    color: var(--vtext);
  }

  li.is-active .stage-anchor,
  .stage-anchor[aria-current='step'] {
    color: var(--white);
  }

  li.is-active .stage-node {
    border-color: var(--oc-purple-accent);
    box-shadow: 0 0 0 4px rgba(196, 185, 240, 0.08);
  }

  .continuity-stages h3 {
    max-width: 17ch;
    margin: 20px 0 14px;
    font-family: var(--font-display);
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    letter-spacing: -0.035em;
    line-height: 1.08;
  }

  .continuity-stages li > p {
    max-width: 58ch;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.75;
  }

  .stage-snapshot {
    display: none;
  }

  .story-visual {
    position: sticky;
    top: 112px;
    display: grid;
    height: max-content;
    grid-template-columns: 1px minmax(0, 1fr);
    gap: 28px;
  }

  .story-thread {
    width: 1px;
    min-height: 420px;
    background: var(--oc-border-subtle);
  }

  .story-thread span {
    display: block;
    width: 1px;
    height: var(--story-progress);
    background: linear-gradient(
      180deg,
      var(--oc-purple-accent),
      var(--green)
    );
    transition: height 400ms var(--ease-out);
  }

  .story-panels {
    transition: opacity 180ms ease, transform 180ms ease;
  }

  .is-transitioning .story-panels {
    opacity: 0.12;
    transform: translateY(4px);
  }

  @media (max-width: 900px) {
    .continuity-story {
      padding: 88px 20px;
    }

    .story-layout {
      grid-template-columns: 1fr;
    }

    .continuity-stages li {
      min-height: 0;
      padding-bottom: 72px;
    }

    .story-visual {
      display: none;
    }

    .stage-snapshot {
      display: block;
      margin-top: 28px;
    }
  }

  @media (max-width: 400px) {
    .continuity-story {
      padding: 72px 16px;
    }

    .continuity-stages li {
      padding-left: 44px;
    }

    .stage-anchor {
      margin-left: -44px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .story-thread span,
    .story-panels {
      transition: none;
    }
  }
</style>
```

- [ ] **Step 4: Add the passive-scroll enhancement**

Append to `src/scripts/landing.js`:

```js
(function wireContinuityStory() {
  var root = document.querySelector('[data-continuity-story]');
  if (!root) return;

  var stages = Array.from(root.querySelectorAll('[data-story-stage]'));
  var anchors = Array.from(root.querySelectorAll('[data-story-anchor]'));
  var panels = Array.from(root.querySelectorAll('[data-story-panel]'));
  var visual = root.querySelector('.story-visual');
  var transitionTimer = null;
  var activeId = stages[0]?.getAttribute('data-story-stage');
  var motionOn = document.documentElement.classList.contains('motion-on');

  function paint(id) {
    var index = stages.findIndex(function (stage) {
      return stage.getAttribute('data-story-stage') === id;
    });
    if (index < 0 || id === activeId) return;
    activeId = id;

    stages.forEach(function (stage) {
      stage.classList.toggle(
        'is-active',
        stage.getAttribute('data-story-stage') === id,
      );
    });
    anchors.forEach(function (anchor) {
      var selected = anchor.getAttribute('data-story-anchor') === id;
      if (selected) anchor.setAttribute('aria-current', 'step');
      else anchor.removeAttribute('aria-current');
    });

    var updatePanels = function () {
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-story-panel') !== id;
      });
      root.style.setProperty(
        '--story-progress',
        `${(index / Math.max(stages.length - 1, 1)) * 100}%`,
      );
    };

    if (!motionOn || !visual) {
      updatePanels();
      return;
    }

    if (transitionTimer) window.clearTimeout(transitionTimer);
    visual.classList.add('is-transitioning');
    transitionTimer = window.setTimeout(function () {
      updatePanels();
      requestAnimationFrame(function () {
        visual.classList.remove('is-transitioning');
      });
    }, 180);
  }

  anchors.forEach(function (anchor) {
    anchor.addEventListener('click', function () {
      paint(anchor.getAttribute('data-story-anchor'));
    });
  });

  if (!('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          paint(entry.target.getAttribute('data-story-stage'));
        }
      });
    },
    { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
  );
  stages.forEach(function (stage) {
    observer.observe(stage);
  });
})();
```

This code never calls `history.pushState`, never prevents native anchor
navigation, and never hides the narrative text.

- [ ] **Step 5: Compose the new beats and remove the old trust strip**

In `src/pages/index.astro`:

- replace the `Testimonial` import with `TrustBar`;
- import `ContinuityStory`;
- render `<TrustBar />` immediately after `<Hero />`;
- render `<ContinuityStory />` immediately after `<TrustBar />`;
- remove the old `<Testimonial />`.

Prove `Testimonial.astro` is no longer imported:

```bash
git grep -n "Testimonial" -- src
```

Expected: no output. Then delete `src/components/Testimonial.astro`.

- [ ] **Step 6: Verify, visually inspect, and commit**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser --grep "continuity|mobile story|hero exposes"
```

Inspect desktop native scroll, a 390px mobile stack, reduced motion, and
JavaScript disabled. Confirm the text alone tells all four stages and passive
scroll never adds a hash.

Commit:

```bash
git add \
  src/components/TrustBar.astro \
  src/components/ContinuityStory.astro \
  src/pages/index.astro \
  src/scripts/landing.js \
  scripts/verify-static.mjs \
  tests/landing.spec.ts
git add -u src/components/Testimonial.astro
git commit -m "feat: tell the familiar continuity story"
```

### Task 5: Replace three overlapping explanations with one runtime proof

**Files:**

- Create: `src/components/RuntimeProof.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/scripts/landing.js`
- Modify: `scripts/verify-static.mjs`
- Modify: `tests/landing.spec.ts`
- Delete: `src/components/Architecture.astro`
- Delete: `src/components/HowItWorks.astro`
- Delete: `src/components/Compare.astro`
- Delete: `src/components/ProofGrid.astro`
- Delete: `src/scripts/shared.js`

- [ ] **Step 1: Add failing condensed-proof assertions**

Add to the homepage block in `scripts/verify-static.mjs`:

```js
const requiredRuntimeCopy = [
  'One runtime between the surface and your work.',
  'Harness or product surface',
  'Coven',
  'Your project',
  'Sessions, familiar memory, adapters, and controlled tool access',
];
const missingRuntimeCopy = requiredRuntimeCopy.filter(
  (needle) => !renderedText.includes(needle),
);
if (missingRuntimeCopy.length > 0) {
  throw new Error(
    `Missing condensed runtime proof in dist/index.html: ${missingRuntimeCopy.join(', ')}`,
  );
}

const runtimeTabs = countMatches(html, /\bdata-runtime-tab=/g);
const runtimePanels = countMatches(html, /\bdata-runtime-panel=/g);
const runtimeDisclosures = countMatches(
  html,
  /<details(?=[^>]*\bclass="runtime-disclosure")/g,
);
if (runtimeTabs !== 3 || runtimePanels !== 3 || runtimeDisclosures !== 3) {
  throw new Error(
    `Runtime proof must render 3 tabs, 3 panels, and 3 mobile disclosures; found ${runtimeTabs}, ${runtimePanels}, and ${runtimeDisclosures}`,
  );
}

for (const obsoleteClass of [
  'architecture-section',
  'howitworks-section',
  'compare-section',
  'proof-section',
]) {
  if (html.includes(obsoleteClass)) {
    throw new Error(`Homepage still renders obsolete ${obsoleteClass}`);
  }
}
```

Append to `tests/landing.spec.ts`:

```ts
test('runtime proof uses accessible desktop tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const proof = page.locator('[data-runtime-proof]');
  const tabs = proof.locator('[data-runtime-tab]');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(
    proof.locator('[data-runtime-panel].is-active'),
  ).toHaveAttribute('data-runtime-panel', 'coven');

  await tabs.nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(
    proof.locator('[data-runtime-panel].is-active'),
  ).toHaveAttribute('data-runtime-panel', 'project');

  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toBeFocused();
});

test('runtime proof becomes native disclosures on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('.runtime-desktop')).toBeHidden();
  const disclosures = page.locator('details.runtime-disclosure');
  await expect(disclosures).toHaveCount(3);
  await disclosures.nth(0).locator('summary').click();
  await expect(disclosures.nth(0)).toHaveAttribute('open', '');
});
```

Run the relevant checks and confirm they fail:

```bash
CI=true pnpm build && pnpm check
pnpm check:browser --grep "runtime proof"
```

- [ ] **Step 2: Create the responsive runtime proof**

Create `src/components/RuntimeProof.astro`:

```astro
---
import { runtimeLayers } from '../data/landing';
---

<section
  class="runtime-proof"
  id="runtime"
  data-runtime-proof
  aria-labelledby="runtime-heading"
>
  <header class="runtime-header">
    <p class="section-kicker">Understand the boundary</p>
    <h2 id="runtime-heading">
      One runtime between the surface and your work.
    </h2>
    <p>
      The interface can change. The project boundary and the continuity layer
      stay explicit.
    </p>
  </header>

  <div class="runtime-desktop">
    <div class="runtime-tabs" role="tablist" aria-label="Runtime layers">
      {runtimeLayers.map((layer, index) => (
        <button
          id={`runtime-tab-${layer.id}`}
          type="button"
          role="tab"
          data-runtime-tab={layer.id}
          aria-controls={`runtime-panel-${layer.id}`}
          aria-selected={index === 1 ? 'true' : 'false'}
          tabindex={index === 1 ? '0' : '-1'}
        >
          <span>{layer.index}</span>
          <strong>{layer.title}</strong>
          <small>{layer.summary}</small>
        </button>
      ))}
    </div>

    <div class="runtime-panels">
      {runtimeLayers.map((layer, index) => (
        <article
          id={`runtime-panel-${layer.id}`}
          class:list={['runtime-panel', { 'is-active': index === 1 }]}
          role="tabpanel"
          data-runtime-panel={layer.id}
          aria-labelledby={`runtime-tab-${layer.id}`}
        >
          <p>{layer.label}</p>
          <h3>{layer.title}</h3>
          <strong>{layer.summary}</strong>
          <p>{layer.detail}</p>
        </article>
      ))}
    </div>
  </div>

  <div class="runtime-mobile">
    {runtimeLayers.map((layer, index) => (
      <details
        class="runtime-disclosure"
        open={index === 1}
      >
        <summary>
          <span>{layer.index}</span>
          <strong>{layer.title}</strong>
        </summary>
        <div>
          <p>{layer.summary}</p>
          <p>{layer.detail}</p>
        </div>
      </details>
    ))}
  </div>

  <a
    class="runtime-docs"
    href="https://docs.opencoven.ai"
    target="_blank"
    rel="noopener noreferrer"
  >
    Read the architecture docs ↗
    <span class="sr-only"> (opens in new tab)</span>
  </a>
</section>

<style>
  .runtime-proof {
    position: relative;
    z-index: 1;
    width: min(100%, 1280px);
    margin: 0 auto;
    padding: 112px 32px;
    scroll-margin-top: 76px;
  }

  .runtime-header {
    max-width: 760px;
    margin-bottom: 56px;
  }

  .runtime-header h2 {
    max-width: 18ch;
  }

  .runtime-header > p:last-child {
    max-width: 60ch;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.7;
  }

  .runtime-desktop {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 28px;
  }

  .runtime-tabs {
    display: none;
    gap: 8px;
  }

  :global(.js-on) .runtime-tabs {
    display: grid;
  }

  .runtime-tabs button {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    column-gap: 14px;
    min-height: 112px;
    padding: 20px;
    border: 1px solid var(--oc-border-subtle);
    border-radius: 12px;
    background: transparent;
    color: var(--white);
    cursor: pointer;
    text-align: left;
  }

  .runtime-tabs button > span {
    grid-row: 1 / 3;
    color: var(--vtext);
    font: 0.6875rem/1.4 var(--mono);
  }

  .runtime-tabs strong {
    font-size: 0.9375rem;
  }

  .runtime-tabs small {
    margin-top: 8px;
    color: var(--muted);
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .runtime-tabs button[aria-selected='true'] {
    border-color: var(--accent-strong);
    background: var(--accent-wash);
  }

  .runtime-panels {
    display: grid;
    min-height: 352px;
    border: 1px solid var(--border-v);
    border-radius: 12px;
    background:
      linear-gradient(160deg, rgba(196, 185, 240, 0.1), transparent 45%),
      var(--surface);
  }

  .runtime-panel {
    align-content: center;
    padding: clamp(32px, 5vw, 64px);
  }

  :global(.js-on) .runtime-panel:not(.is-active) {
    display: none;
  }

  .runtime-panel > p:first-child {
    margin-bottom: 16px;
    color: var(--vtext);
    font: 700 0.6875rem/1 var(--mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .runtime-panel h3 {
    margin-bottom: 14px;
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3.5rem);
    letter-spacing: -0.04em;
  }

  .runtime-panel strong {
    display: block;
    margin-bottom: 16px;
    color: var(--white);
    font-size: 1rem;
  }

  .runtime-panel > p:last-child {
    max-width: 54ch;
    color: var(--muted);
    line-height: 1.7;
  }

  .runtime-mobile {
    display: none;
  }

  .runtime-docs {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    margin-top: 28px;
    color: var(--vtext);
    font-weight: 650;
    text-underline-offset: 4px;
  }

  @media (max-width: 767px) {
    .runtime-proof {
      padding: 80px 20px;
    }

    .runtime-desktop {
      display: none;
    }

    .runtime-mobile {
      display: grid;
      gap: 10px;
    }

    .runtime-disclosure {
      border: 1px solid var(--oc-border-subtle);
      border-radius: 12px;
      background: var(--surface);
    }

    .runtime-disclosure summary {
      display: grid;
      min-height: 64px;
      grid-template-columns: 32px minmax(0, 1fr);
      align-items: center;
      padding: 0 18px;
      cursor: pointer;
      list-style: none;
    }

    .runtime-disclosure summary::-webkit-details-marker {
      display: none;
    }

    .runtime-disclosure summary span {
      color: var(--vtext);
      font: 0.6875rem/1 var(--mono);
    }

    .runtime-disclosure summary::after {
      content: '+';
      grid-column: 3;
      color: var(--muted);
      font: 1rem/1 var(--mono);
    }

    .runtime-disclosure[open] summary::after {
      content: '−';
    }

    .runtime-disclosure > div {
      padding: 0 18px 20px 50px;
    }

    .runtime-disclosure p {
      color: var(--muted);
      font-size: 0.9375rem;
      line-height: 1.65;
    }

    .runtime-disclosure p + p {
      margin-top: 10px;
    }
  }

  @media (max-width: 400px) {
    .runtime-proof {
      padding-inline: 16px;
    }
  }
</style>
```

- [ ] **Step 3: Add desktop tab behavior without affecting native disclosures**

Append to `src/scripts/landing.js`:

```js
(function wireRuntimeProof() {
  var root = document.querySelector('[data-runtime-proof]');
  if (!root) return;

  var tabs = Array.from(root.querySelectorAll('[data-runtime-tab]'));
  var panels = Array.from(root.querySelectorAll('[data-runtime-panel]'));
  var panelRoot = root.querySelector('.runtime-panels');
  var timer = null;
  var motionOn = document.documentElement.classList.contains('motion-on');

  function select(tab, moveFocus) {
    var id = tab.getAttribute('data-runtime-tab');
    var apply = function () {
      tabs.forEach(function (candidate) {
        var active = candidate === tab;
        candidate.setAttribute('aria-selected', active ? 'true' : 'false');
        candidate.setAttribute('tabindex', active ? '0' : '-1');
      });
      panels.forEach(function (panel) {
        panel.classList.toggle(
          'is-active',
          panel.getAttribute('data-runtime-panel') === id,
        );
      });
      if (moveFocus) tab.focus();
    };

    if (!motionOn || !panelRoot) {
      apply();
      return;
    }

    if (timer) window.clearTimeout(timer);
    panelRoot.style.opacity = '0.12';
    timer = window.setTimeout(function () {
      apply();
      requestAnimationFrame(function () {
        panelRoot.style.opacity = '';
      });
    }, 180);
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      select(tab, false);
    });
    tab.addEventListener('keydown', function (event) {
      var nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      select(tabs[nextIndex], true);
    });
  });
})();
```

Add this scoped declaration to `.runtime-panels` so the state change completes
within the approved timing:

```css
transition: opacity 180ms ease;
```

- [ ] **Step 4: Replace and delete the superseded sections**

In `src/pages/index.astro`:

- import `RuntimeProof`;
- render it after `ContinuityStory`;
- remove imports and instances of `ProofGrid`, `Architecture`, `HowItWorks`, and
  `Compare`.

Prove no route imports the old components or helper:

```bash
git grep -n -E \
  "Architecture|HowItWorks|Compare|ProofGrid|scripts/shared" \
  -- src
```

Expected: only comments or no output. Remove any stale comments, rerun until
there is no output, then delete all five obsolete files listed for this task.

- [ ] **Step 5: Verify `/quickstart` and `/github` did not regress, then commit**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser --grep "runtime proof|renders without"
```

Expected:

- runtime desktop and mobile cases pass;
- all pre-existing Quick Start verification remains green;
- `/github` still renders without console errors;
- the built homepage has no old proof, architecture, how-it-works console, or
  comparison module.

Commit:

```bash
git add \
  src/components/RuntimeProof.astro \
  src/pages/index.astro \
  src/scripts/landing.js \
  scripts/verify-static.mjs \
  tests/landing.spec.ts
git add -u \
  src/components/Architecture.astro \
  src/components/HowItWorks.astro \
  src/components/Compare.astro \
  src/components/ProofGrid.astro \
  src/scripts/shared.js
git commit -m "feat: condense the runtime proof"
```

### Task 6: Render the five-product constellation from the Quick Start registry

**Files:**

- Create: `src/components/ProductConstellation.astro`
- Modify: `src/pages/index.astro`
- Modify: `scripts/verify-static.mjs`
- Modify: `tests/landing.spec.ts`

- [ ] **Step 1: Lift the shared five-product contract in the verifier**

Move the existing `productContracts` declaration from the Quick Start-specific
block to immediately after `toRenderedText` near the top of
`scripts/verify-static.mjs`:

```js
const productContracts = [
  { id: 'coven-cli', name: 'Coven CLI' },
  { id: 'coven-code', name: 'Coven Code' },
  { id: 'coven-cave', name: 'Coven Cave' },
  { id: 'castcodes', name: 'CastCodes' },
  { id: 'github', name: 'OpenCoven for GitHub' },
];
```

Remove the old duplicate declaration. Do not change any existing Quick Start
loop that consumes it.

- [ ] **Step 2: Add failing rendered and source assertions**

Add to the homepage block:

```js
const constellationHtml = html.match(
  /<ul(?=[^>]*\bdata-product-constellation)[^>]*>([\s\S]*?)<\/ul>/,
)?.[1];
if (!constellationHtml) {
  throw new Error('Homepage product constellation list is missing');
}

for (const { id, name } of productContracts) {
  const linkPattern = new RegExp(
    `<a(?=[^>]*\\bhref="/quickstart#${escapeRegExp(id)}")[^>]*>[\\s\\S]*?${escapeRegExp(name)}[\\s\\S]*?</a>`,
    'g',
  );
  const linkCount = countMatches(constellationHtml, linkPattern);
  if (linkCount !== 1) {
    throw new Error(
      `${name} must render exactly once in the homepage constellation and link to /quickstart#${id}; found ${linkCount}`,
    );
  }
}

const productCardCount = countMatches(
  constellationHtml,
  /\bclass="product-card"/g,
);
if (productCardCount !== 5) {
  throw new Error(
    `Homepage product constellation must render exactly five product cards; found ${productCardCount}`,
  );
}
```

Add this source check near the other source reads:

```js
const sourceConstellation = await readFile(
  path.join(root, 'src/components/ProductConstellation.astro'),
  'utf8',
);
if (
  !sourceConstellation.includes(
    "import { quickstartProducts } from '../data/quickstart'",
  )
  || !sourceConstellation.includes('quickstartProducts.map')
) {
  throw new Error(
    'ProductConstellation must render from the shared quickstartProducts registry',
  );
}
```

Append to `tests/landing.spec.ts`:

```ts
test('product constellation exposes five complete keyboard links', async ({ page }) => {
  await page.goto('/');

  const products = page.locator('[data-product-constellation] .product-card');
  await expect(products).toHaveCount(5);

  const expected = [
    ['Coven CLI', '/quickstart#coven-cli'],
    ['Coven Code', '/quickstart#coven-code'],
    ['Coven Cave', '/quickstart#coven-cave'],
    ['CastCodes', '/quickstart#castcodes'],
    ['OpenCoven for GitHub', '/quickstart#github'],
  ];

  for (let index = 0; index < expected.length; index += 1) {
    const [name, href] = expected[index];
    await expect(products.nth(index)).toContainText(name);
    await expect(products.nth(index)).toHaveAttribute('href', href);
  }

  await products.nth(2).focus();
  await expect(products.nth(2)).toBeFocused();
  await expect(products.nth(2).locator('.product-trace')).toHaveCSS(
    'opacity',
    '1',
  );
});
```

Run and confirm failure:

```bash
CI=true pnpm build && pnpm check
pnpm check:browser --grep "product constellation"
```

- [ ] **Step 3: Create the registry-backed constellation**

Create `src/components/ProductConstellation.astro`:

```astro
---
import { quickstartProducts } from '../data/quickstart';
---

<section
  class="product-constellation"
  id="products"
  aria-labelledby="products-heading"
>
  <header class="products-header">
    <p class="section-kicker">Choose a surface</p>
    <h2 id="products-heading">One foundation. Five ways to work.</h2>
    <p>
      Start with the surface that matches the work in front of you. Each path
      leads to its own verifiable Quick Start.
    </p>
  </header>

  <div class="constellation-shell">
    <div class="constellation-core" aria-hidden="true">
      <span>Coven</span>
      <small>shared local-first runtime</small>
    </div>

    <ul data-product-constellation role="list">
      {quickstartProducts.map((product) => (
        <li>
          <a
            class="product-card"
            href={`/quickstart#${product.id}`}
          >
            <span class="product-trace" aria-hidden="true"></span>
            <span class="product-sigil" aria-hidden="true">
              {product.sigil}
            </span>
            <span class="product-heading">
              <small>{product.eyebrow}</small>
              <strong>{product.name}</strong>
            </span>
            <span class="product-summary">{product.summary}</span>
            <span class="product-best">
              <small>Best for</small>
              <span>{product.bestFor}</span>
            </span>
            <span class="product-meta">
              <span>{product.status}</span>
              <span>{product.platforms}</span>
            </span>
            <span class="product-cue" aria-hidden="true">Open guide →</span>
          </a>
        </li>
      ))}
    </ul>
  </div>
</section>

<style>
  .product-constellation {
    position: relative;
    z-index: 1;
    width: min(100%, 1280px);
    margin: 0 auto;
    padding: 112px 32px;
    scroll-margin-top: 76px;
  }

  .products-header {
    max-width: 760px;
    margin-bottom: 64px;
  }

  .products-header h2 {
    max-width: 17ch;
  }

  .products-header > p:last-child {
    max-width: 62ch;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.7;
  }

  .constellation-shell {
    position: relative;
  }

  .constellation-core {
    display: flex;
    width: max-content;
    align-items: baseline;
    gap: 10px;
    margin: 0 auto 34px;
    padding: 10px 14px;
    border: 1px solid var(--border-v);
    border-radius: 8px;
    background: var(--surface);
  }

  .constellation-core span {
    color: var(--white);
    font: 700 0.75rem/1 var(--mono);
  }

  .constellation-core small {
    color: var(--muted);
    font: 0.625rem/1 var(--mono);
  }

  ul {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 16px;
    list-style: none;
  }

  li {
    grid-column: span 2;
    min-width: 0;
  }

  li:nth-child(4),
  li:nth-child(5) {
    grid-column: span 3;
  }

  .product-card {
    position: relative;
    display: grid;
    height: 100%;
    min-height: 330px;
    grid-template-columns: 44px minmax(0, 1fr);
    grid-template-rows: auto auto 1fr auto auto;
    column-gap: 14px;
    padding: 24px;
    overflow: visible;
    border: 1px solid var(--oc-border-subtle);
    border-radius: 12px;
    background: var(--surface);
    color: var(--white);
    text-decoration: none;
    transition:
      border-color 180ms ease,
      background 180ms ease,
      transform 180ms var(--ease-out);
  }

  .product-trace {
    position: absolute;
    top: -35px;
    left: 50%;
    width: 1px;
    height: 34px;
    background: linear-gradient(
      180deg,
      transparent,
      var(--oc-purple-accent)
    );
    opacity: 0;
    transition: opacity 180ms ease;
  }

  .product-card:hover .product-trace,
  .product-card:focus .product-trace,
  .product-card:focus-visible .product-trace {
    opacity: 1;
  }

  .product-sigil {
    display: grid;
    width: 44px;
    height: 44px;
    grid-row: 1;
    place-items: center;
    border: 1px solid var(--border-v);
    border-radius: 10px;
    color: var(--vtext);
    font: 700 0.75rem/1 var(--mono);
  }

  .product-heading {
    grid-column: 2;
  }

  .product-heading small,
  .product-heading strong {
    display: block;
  }

  .product-heading small {
    margin-bottom: 5px;
    color: var(--muted);
    font: 0.625rem/1.3 var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .product-heading strong {
    font-size: 1rem;
  }

  .product-summary {
    grid-column: 1 / -1;
    margin-top: 22px;
    color: var(--muted);
    font-size: 0.875rem;
    line-height: 1.65;
  }

  .product-best {
    grid-column: 1 / -1;
    align-self: end;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid var(--oc-border-subtle);
  }

  .product-best small {
    display: block;
    margin-bottom: 6px;
    color: var(--vtext);
    font: 0.625rem/1 var(--mono);
    text-transform: uppercase;
  }

  .product-best span {
    color: var(--white);
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .product-meta {
    display: flex;
    grid-column: 1 / -1;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 16px;
  }

  .product-meta span {
    padding: 5px 7px;
    border: 1px solid var(--oc-border-subtle);
    border-radius: 999px;
    color: var(--muted);
    font: 0.5625rem/1 var(--mono);
  }

  .product-cue {
    grid-column: 1 / -1;
    margin-top: 20px;
    color: var(--vtext);
    font-size: 0.75rem;
    font-weight: 650;
  }

  @media (hover: hover) {
    .product-card:hover {
      border-color: var(--accent-strong);
      background: var(--accent-wash);
      transform: translateY(-2px);
    }
  }

  @media (max-width: 1000px) {
    ul {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    li,
    li:nth-child(4) {
      grid-column: span 1;
    }

    li:nth-child(5) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 680px) {
    .product-constellation {
      padding: 80px 20px;
    }

    .constellation-core {
      margin-inline: 0;
    }

    ul {
      grid-template-columns: 1fr;
    }

    li,
    li:nth-child(4),
    li:nth-child(5) {
      grid-column: 1;
    }

    .product-card {
      min-height: 0;
    }

    .product-trace {
      display: none;
    }
  }

  @media (max-width: 400px) {
    .product-constellation {
      padding-inline: 16px;
    }
  }
</style>
```

- [ ] **Step 4: Compose, verify, and commit**

Import `ProductConstellation` in `src/pages/index.astro` and render it
immediately after `RuntimeProof`.

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser --grep "product constellation|renders without"
```

Inspect the 3+2 desktop arrangement, two-column tablet layout, final-span
tablet card, single-column mobile flow, dark and light themes, pointer hover,
and visible keyboard focus.

Commit:

```bash
git add \
  src/components/ProductConstellation.astro \
  src/pages/index.astro \
  scripts/verify-static.mjs \
  tests/landing.spec.ts
git commit -m "feat: add the product constellation"
```

### Task 7: Derive the Quick Start preview and close on ownership

**Files:**

- Modify: `src/components/QuickStart.astro`
- Create: `src/components/ClosingInvitation.astro`
- Modify: `src/pages/index.astro`
- Modify: `scripts/verify-static.mjs`
- Modify: `tests/landing.spec.ts`
- Delete: `src/components/Ecosystem.astro`

- [ ] **Step 1: Add failing data-source and closing assertions**

Near the other source checks in `scripts/verify-static.mjs`, add:

```js
const sourceQuickStart = await readFile(
  path.join(root, 'src/components/QuickStart.astro'),
  'utf8',
);
if (
  !sourceQuickStart.includes(
    "import { quickstartProducts } from '../data/quickstart'",
  )
  || !sourceQuickStart.includes("product.id === 'coven-cli'")
  || !sourceQuickStart.includes('previewIndexes')
) {
  throw new Error(
    'Homepage QuickStart must derive its compact commands from the Coven CLI quickstart record',
  );
}
```

Add to the homepage output block:

```js
const requiredBeginAndBelongCopy = [
  'Run your first familiar in three commands.',
  'npm install -g @opencoven/cli',
  'coven doctor',
  'coven run codex "explain this repo in 5 bullets"',
  'Choose any product',
  'Your familiar, your tools, your machine.',
];
const missingBeginAndBelongCopy = requiredBeginAndBelongCopy.filter(
  (needle) => !renderedText.includes(needle),
);
if (missingBeginAndBelongCopy.length > 0) {
  throw new Error(
    `Missing Begin or Belong copy in dist/index.html: ${missingBeginAndBelongCopy.join(', ')}`,
  );
}

if (
  !/<ol\s+class="quickstart-preview-steps"\s+role="list"\s*>/.test(html)
) {
  throw new Error('Homepage Quick Start preview must be an ordered list');
}

const previewCopyValues = countMatches(
  html,
  /\bdata-copy="(?:npm install -g @opencoven\/cli|coven doctor|coven run codex &quot;explain this repo in 5 bullets&quot;)"/g,
);
if (previewCopyValues !== 3) {
  throw new Error(
    `Homepage Quick Start must render three canonical copied commands; found ${previewCopyValues}`,
  );
}

if (
  !/<a(?=[^>]*\bdata-primary-cta)(?=[^>]*\bhref="\/quickstart")[^>]*>\s*Start with OpenCoven\s*<\/a>/.test(
    html.match(/<section(?=[^>]*\bclass="closing-invitation")[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '',
  )
) {
  throw new Error('Closing invitation must repeat Start with OpenCoven → /quickstart');
}

if (html.includes('ecosystem-section')) {
  throw new Error('Homepage must not retain the old Discord-primary ecosystem section');
}
```

Append to `tests/landing.spec.ts`:

```ts
test('Quick Start preview uses three canonical selectable commands', async ({ page }) => {
  await page.goto('/');

  const preview = page.locator('#quickstart');
  await expect(preview.locator('.quickstart-preview-step')).toHaveCount(3);
  await expect(preview.locator('code').nth(0)).toHaveText(
    'npm install -g @opencoven/cli',
  );
  await expect(preview.locator('code').nth(1)).toHaveText('coven doctor');
  await expect(preview.locator('code').nth(2)).toHaveText(
    'coven run codex "explain this repo in 5 bullets"',
  );
  await expect(
    preview.locator('a[href="/quickstart"]'),
  ).toHaveText('Choose any product');
});

test('closing invitation restores the primary conversion path', async ({ page }) => {
  await page.goto('/');

  const closing = page.locator('.closing-invitation');
  await expect(closing).toContainText('Your familiar, your tools, your machine.');
  await expect(
    closing.locator('[data-primary-cta][href="/quickstart"]'),
  ).toHaveText('Start with OpenCoven');
  await expect(closing.locator('a[href="https://discord.gg/opencoven"]')).toBeVisible();
});
```

Run and confirm failure:

```bash
CI=true pnpm build && pnpm check
pnpm check:browser --grep "Quick Start preview|closing invitation"
```

- [ ] **Step 2: Replace the literal preview data with a derived projection**

Replace the frontmatter and markup in `src/components/QuickStart.astro` with:

```astro
---
import { quickstartProducts } from '../data/quickstart';

const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;

const cliProduct = quickstartProducts.find(
  (product) => product.id === 'coven-cli',
);
if (!cliProduct) {
  throw new Error('Coven CLI quickstart record is required for the homepage preview');
}

const previewIndexes = [0, 1, 3];
const previewSteps = previewIndexes.map((stepIndex) => {
  const step = cliProduct.steps[stepIndex];
  const command = step?.commands?.[0];
  if (!step || !command || !step.expected) {
    throw new Error(
      `Coven CLI step ${stepIndex + 1} must provide a command and expected result`,
    );
  }
  return { step, command };
});
---

<section
  class="quickstart-preview"
  id="quickstart"
  aria-labelledby="quickstart-heading"
>
  <header class="quickstart-header">
    <p class="section-kicker">Begin with proof</p>
    <h2 id="quickstart-heading">
      Run your first familiar in three commands.
    </h2>
    <p>
      This is the recommended Coven CLI foundation. The complete Quick Start
      has a verified path for every OpenCoven product.
    </p>
  </header>

  <ol class="quickstart-preview-steps" role="list">
    {previewSteps.map(({ step, command }, index) => (
      <li class="quickstart-preview-step">
        <span class="preview-index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <p>{step.label}</p>
        <h3>{step.title}</h3>
        <div class="preview-command" data-copy-surface>
          <code>{command.value}</code>
          <button
            class="quickstart-copy qs-copy"
            type="button"
            data-copy={command.value}
            aria-label={command.label}
          >
            <Fragment set:html={COPY_ICON} />
          </button>
        </div>
        <p class="preview-expected">
          <strong>Expect:</strong> {step.expected}
        </p>
      </li>
    ))}
  </ol>

  <p class="preview-clarification">
    Follow doctor's exact Codex or Claude Code install/auth next step. This
    compact preview uses Codex; the full product guide includes the Claude run.
  </p>

  <div class="quickstart-actions">
    <a class="btn-primary" href="/quickstart">Choose any product</a>
    <a
      class="btn-secondary"
      href="https://docs.opencoven.ai"
      target="_blank"
      rel="noopener noreferrer"
    >
      Read the full docs
      <span class="sr-only"> (opens in new tab)</span>
    </a>
  </div>

  <div class="sr-only" role="status" aria-live="polite" data-copy-live></div>
</section>

<style>
  .quickstart-preview {
    position: relative;
    z-index: 1;
    width: min(100%, 1280px);
    margin: 0 auto;
    padding: 112px 32px;
    scroll-margin-top: 76px;
  }

  .quickstart-header {
    max-width: 760px;
    margin-bottom: 56px;
  }

  .quickstart-header h2 {
    max-width: 18ch;
  }

  .quickstart-header > p:last-child {
    max-width: 62ch;
    color: var(--muted);
    font-size: 1rem;
    line-height: 1.7;
  }

  .quickstart-preview-steps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    list-style: none;
  }

  .quickstart-preview-step {
    display: grid;
    min-width: 0;
    grid-template-rows: auto auto auto 1fr auto;
    padding: 24px;
    border: 1px solid var(--oc-border-subtle);
    border-radius: 12px;
    background: var(--surface);
  }

  .preview-index {
    margin-bottom: 24px;
    color: var(--vtext);
    font: 700 0.6875rem/1 var(--mono);
  }

  .quickstart-preview-step > p:nth-of-type(1) {
    margin-bottom: 6px;
    color: var(--muted);
    font: 0.625rem/1 var(--mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .quickstart-preview-step h3 {
    margin-bottom: 18px;
    font-size: 1rem;
  }

  .preview-command {
    position: relative;
    align-self: start;
    min-width: 0;
    padding: 14px 50px 14px 14px;
    overflow-x: auto;
    border: 1px solid rgba(196, 185, 240, 0.18);
    border-radius: 8px;
    background: #0b0910;
    color: #e8e0f0;
    white-space: nowrap;
  }

  .preview-command code {
    border: 0;
    background: transparent;
    color: inherit;
    font: 0.75rem/1.5 var(--mono);
  }

  .quickstart-copy {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border: 1px solid rgba(196, 185, 240, 0.22);
    border-radius: 6px;
    background: #111018;
    color: #c4b9f0;
    cursor: pointer;
  }

  .quickstart-copy :global(svg) {
    width: 14px;
    height: 14px;
  }

  .preview-expected {
    align-self: end;
    margin-top: 18px;
    color: #aaa1b8;
    font: 0.6875rem/1.55 var(--mono);
  }

  .preview-expected strong {
    color: #30d158;
  }

  .preview-clarification {
    max-width: 72ch;
    margin-top: 18px;
    color: var(--muted);
    font-size: 0.8125rem;
    line-height: 1.6;
  }

  .quickstart-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 32px;
  }

  @media (max-width: 900px) {
    .quickstart-preview {
      padding: 88px 20px;
    }

    .quickstart-preview-steps {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 520px) {
    .quickstart-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .quickstart-actions a {
      justify-content: center;
      min-height: 48px;
    }
  }

  @media (max-width: 400px) {
    .quickstart-preview {
      padding-inline: 16px;
    }

    .preview-command code {
      font-size: 13px;
    }
  }
</style>
```

- [ ] **Step 3: Create the final ownership invitation**

Create `src/components/ClosingInvitation.astro`:

```astro
<section
  class="closing-invitation"
  aria-labelledby="closing-heading"
>
  <div class="closing-copy">
    <p class="section-kicker">Belong on your terms</p>
    <h2 id="closing-heading">
      Your familiar, your tools, your machine.
    </h2>
    <p>
      Start with one product, keep the runtime inspectable, and add community
      only when it helps.
    </p>
  </div>

  <div class="closing-primary">
    <a class="btn-primary" data-primary-cta href="/quickstart">
      Start with OpenCoven
    </a>
  </div>

  <nav class="closing-links" aria-label="OpenCoven destinations">
    <a href="https://github.com/OpenCoven" target="_blank" rel="noopener noreferrer">
      GitHub <span aria-hidden="true">↗</span>
      <span class="sr-only"> (opens in new tab)</span>
    </a>
    <a href="https://docs.opencoven.ai" target="_blank" rel="noopener noreferrer">
      Docs <span aria-hidden="true">↗</span>
      <span class="sr-only"> (opens in new tab)</span>
    </a>
    <a href="https://discord.gg/opencoven" target="_blank" rel="noopener noreferrer">
      Discord <span aria-hidden="true">↗</span>
      <span class="sr-only"> (opens in new tab)</span>
    </a>
  </nav>
</section>

<style>
  .closing-invitation {
    position: relative;
    z-index: 1;
    display: grid;
    width: min(calc(100% - 64px), 1216px);
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 48px;
    margin: 32px auto 112px;
    padding: clamp(40px, 6vw, 72px);
    overflow: hidden;
    border: 1px solid var(--border-v);
    border-radius: 12px;
    background:
      linear-gradient(130deg, rgba(196, 185, 240, 0.14), transparent 52%),
      var(--surface);
  }

  .closing-invitation::after {
    content: '';
    position: absolute;
    right: -12%;
    bottom: -55%;
    width: 420px;
    height: 420px;
    border: 1px solid rgba(196, 185, 240, 0.12);
    border-radius: 50%;
    pointer-events: none;
  }

  .closing-copy {
    position: relative;
    z-index: 1;
  }

  .closing-copy h2 {
    max-width: 16ch;
  }

  .closing-copy > p:last-child {
    max-width: 56ch;
    color: var(--muted);
    line-height: 1.7;
  }

  .closing-primary {
    position: relative;
    z-index: 1;
    align-self: center;
  }

  .closing-links {
    position: relative;
    z-index: 1;
    display: flex;
    grid-column: 1 / -1;
    flex-wrap: wrap;
    gap: 22px;
    padding-top: 24px;
    border-top: 1px solid var(--oc-border-subtle);
  }

  .closing-links a {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 0.8125rem;
    font-weight: 650;
    text-decoration: none;
  }

  .closing-links a:hover {
    color: var(--white);
  }

  @media (max-width: 760px) {
    .closing-invitation {
      width: calc(100% - 40px);
      grid-template-columns: 1fr;
      gap: 28px;
      margin-bottom: 80px;
      padding: 40px 28px;
    }

    .closing-primary a {
      justify-content: center;
      width: 100%;
      min-height: 48px;
    }
  }

  @media (max-width: 400px) {
    .closing-invitation {
      width: calc(100% - 32px);
      padding: 32px 22px;
    }
  }
</style>
```

- [ ] **Step 4: Replace the old ecosystem close**

In `src/pages/index.astro`:

- render `<QuickStart />` immediately after `ProductConstellation`;
- import and render `<ClosingInvitation />` after `QuickStart`;
- remove the `Ecosystem` import and instance.

Run:

```bash
git grep -n "Ecosystem" -- src
```

Expected: no output. Delete `src/components/Ecosystem.astro`.

- [ ] **Step 5: Verify the handoff and commit**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser --grep "Quick Start preview|closing invitation|renders without"
```

Confirm `/quickstart#coven-cli` lands on the full guide, all three copied values
match the rendered code, and Discord is secondary rather than the page's final
primary action.

Commit:

```bash
git add \
  src/components/QuickStart.astro \
  src/components/ClosingInvitation.astro \
  src/pages/index.astro \
  scripts/verify-static.mjs \
  tests/landing.spec.ts
git add -u src/components/Ecosystem.astro
git commit -m "feat: complete the landing conversion path"
```

### Task 8: Unify navigation, clipboard failure, and interaction-only feedback

**Files:**

- Modify: `src/components/Header.astro`
- Modify: `src/components/MobileNav.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/components/QuickstartProduct.astro`
- Create: `src/components/FeedbackLauncher.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/scripts/main.js`
- Modify: `src/scripts/landing.js`
- Modify: `src/styles/global.css`
- Modify: `scripts/verify-static.mjs`
- Modify: `tests/landing.spec.ts`

- [ ] **Step 1: Add failing shell and interaction tests**

Append to `tests/landing.spec.ts`:

```ts
test('mobile menu is modal, traps focus, and restores the opener', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.locator('.mobile-toggle');
  const dialog = page.locator('#mobile-nav');
  await expect(page.locator('.site-header')).toContainText('OpenCoven');
  await expect(page.locator('.site-header a[aria-label*="GitHub"]')).toHaveCount(0);

  await toggle.click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  await expect(dialog.locator('.mobile-nav-close')).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
});

test('header becomes opaque only after scrolling', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('.site-header');
  await expect(header).not.toHaveClass(/is-scrolled/);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect(header).toHaveClass(/is-scrolled/);
});

test('feedback SDK is absent until the visitor activates feedback', async ({ page }) => {
  const sdkRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/widget/sdk.js')) {
      sdkRequests.push(request.url());
    }
  });
  await page.route('**/api/widget/sdk.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.Quackback = function (command) {
          window.__feedbackCommands = window.__feedbackCommands || [];
          window.__feedbackCommands.push(command);
        };
      `,
    });
  });

  await page.goto('/');
  await page.waitForTimeout(2_300);
  expect(sdkRequests).toEqual([]);

  await page.locator('[data-feedback-launcher]').click();
  await expect.poll(() => sdkRequests.length).toBe(1);
  await expect(page.locator('[data-feedback-status]')).toHaveText(
    'Feedback opened.',
  );
  await expect.poll(async () =>
    page.evaluate(() => (window as Window & {
      __feedbackCommands?: string[];
    }).__feedbackCommands),
  ).toEqual(['init', 'open']);
});

test('clipboard failure selects the command and gives a concrete fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('denied')),
      },
    });
  });
  await page.goto('/');

  const preview = page.locator('#quickstart');
  const button = preview.locator('[data-copy]').first();
  const command = await preview.locator('code').first().textContent();
  await button.click();

  await expect(button).toHaveAttribute(
    'aria-label',
    'Copy unavailable. Select the command and copy manually.',
  );
  await expect(preview.locator('[data-copy-live]')).toContainText(
    'Copy unavailable',
  );
  expect(
    await page.evaluate(() => window.getSelection()?.toString()),
  ).toBe(command);
});
```

Add these homepage assertions to `scripts/verify-static.mjs`:

```js
const primaryCtaCount = countMatches(
  html,
  /<a(?=[^>]*\bdata-primary-cta)(?=[^>]*\bhref="\/quickstart")[^>]*>/g,
);
if (primaryCtaCount !== 3) {
  throw new Error(
    `Homepage must expose exactly three marked primary CTAs to /quickstart across header, hero, and close; found ${primaryCtaCount}`,
  );
}

const mobileDialog = html.match(
  /<div(?=[^>]*\bid="mobile-nav")(?=[^>]*\brole="dialog")(?=[^>]*\baria-modal="true")(?=[^>]*\bhidden)[^>]*>/,
);
if (!mobileDialog) {
  throw new Error('Mobile navigation must render as an initially hidden modal dialog');
}

if (!html.includes('class="mobile-nav-fallback"')) {
  throw new Error('Mobile navigation must include a no-JavaScript fallback');
}

if (!html.includes('data-feedback-launcher')) {
  throw new Error('Homepage must render the lightweight feedback fallback link');
}
if (html.includes('<script src="https://feedback.opencoven.ai/api/widget/sdk.js"')) {
  throw new Error('Homepage HTML must not load the feedback SDK eagerly');
}
```

Read `src/scripts/landing.js` in the source section and add:

```js
const sourceLanding = await readFile(
  path.join(root, 'src/scripts/landing.js'),
  'utf8',
);
if (
  sourceLanding.includes('requestIdleCallback')
  || sourceLanding.includes("addEventListener('load', schedule")
) {
  throw new Error('Feedback must not schedule itself on load or idle');
}
if (
  !sourceLanding.includes("addEventListener('click', activateFeedback)")
  || !sourceLanding.includes("window.Quackback('open')")
) {
  throw new Error('Feedback SDK must load and open only from launcher activation');
}
```

Run and confirm the old shell fails:

```bash
CI=true pnpm build && pnpm check
pnpm check:browser --grep "mobile menu|header becomes|feedback SDK|clipboard failure"
```

- [ ] **Step 2: Rebuild the shared header**

Replace `src/components/Header.astro` with:

```astro
---
const pathname = Astro.url.pathname.replace(/\/$/, '');
const isQuickstart = pathname === '/quickstart';
---

<a class="skip-link" href="#content">Skip to content</a>
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="/#top" aria-label="OpenCoven home">
      <span class="brand-mark"><img src="/favicon.svg" alt="" /></span>
      <span>OpenCoven</span>
    </a>

    <nav class="desktop-nav" aria-label="Primary">
      <a href="/#how-it-works">How it works</a>
      <a href="/#products">Products</a>
      <a
        href="/quickstart"
        aria-current={isQuickstart ? 'page' : undefined}
      >
        Quick Start
      </a>
      <a href="https://docs.opencoven.ai">Docs</a>
    </nav>

    <div class="header-actions">
      <button
        class="header-control theme-toggle"
        type="button"
        data-theme-toggle
        aria-label="Theme: System — click to change"
        title="Theme: System"
      >
        <svg class="ti-system" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2.5" y="4" width="19" height="13" rx="1.5"/><path d="M8.5 21h7M12 17v4"/></svg>
        <svg class="ti-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/></svg>
        <svg class="ti-dark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/></svg>
      </button>

      <a class="header-cta" data-primary-cta href="/quickstart">
        Start with OpenCoven
      </a>

      <button
        class="mobile-toggle"
        type="button"
        aria-label="Open menu"
        aria-expanded="false"
        aria-controls="mobile-nav"
      >
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true"><rect y="0" width="22" height="2" rx="1" fill="currentColor"/><rect y="7" width="22" height="2" rx="1" fill="currentColor"/><rect y="14" width="22" height="2" rx="1" fill="currentColor"/></svg>
      </button>
    </div>
  </div>
</header>
```

- [ ] **Step 3: Replace the mobile overlay with a real modal and no-JS fallback**

Replace `src/components/MobileNav.astro` with:

```astro
---
const pathname = Astro.url.pathname.replace(/\/$/, '');
const isQuickstart = pathname === '/quickstart';
---

<div
  class="mobile-nav-overlay"
  id="mobile-nav"
  role="dialog"
  aria-modal="true"
  aria-labelledby="mobile-nav-title"
  hidden
>
  <div class="mobile-nav-panel">
    <header>
      <p id="mobile-nav-title">Navigate OpenCoven</p>
      <button class="mobile-nav-close" type="button" aria-label="Close menu">
        ×
      </button>
    </header>

    <nav aria-label="Mobile primary">
      <a href="/#how-it-works">How it works</a>
      <a href="/#products">Products</a>
      <a
        href="/quickstart"
        aria-current={isQuickstart ? 'page' : undefined}
      >
        Quick Start
      </a>
      <a href="/github">GitHub App</a>
      <a href="https://docs.opencoven.ai">Docs</a>
    </nav>

    <nav class="mobile-community" aria-label="Mobile community">
      <a href="https://github.com/OpenCoven">GitHub</a>
      <a href="https://discord.gg/opencoven">Discord</a>
      <a href="https://x.com/OpenCvn">X</a>
    </nav>
  </div>
</div>

<noscript>
  <nav class="mobile-nav-fallback" aria-label="No-JavaScript navigation">
    <a href="/#how-it-works">How it works</a>
    <a href="/#products">Products</a>
    <a href="/quickstart">Quick Start</a>
    <a href="https://docs.opencoven.ai">Docs</a>
  </nav>
</noscript>
```

- [ ] **Step 4: Update the footer destinations**

Replace `src/components/Footer.astro` with:

```astro
---
const pathname = Astro.url.pathname.replace(/\/$/, '');
const isQuickstart = pathname === '/quickstart';
const isGithub = pathname === '/github';
---

<footer>
  <div class="footer-inner">
    <div class="footer-intro">
      <a class="footer-brand" href="/#top">
        <img src="/favicon.svg" alt="" />
        <span>OpenCoven</span>
      </a>
      <p>Collective intelligence under intentional local control.</p>
    </div>

    <div class="footer-groups">
      <nav aria-label="Footer product">
        <p>Product</p>
        <a href="/#how-it-works">How it works</a>
        <a href="/#runtime">Runtime</a>
        <a href="/#products">Products</a>
        <a
          href="/quickstart"
          aria-current={isQuickstart ? 'page' : undefined}
        >
          Quick Start
        </a>
      </nav>

      <nav aria-label="Footer project">
        <p>Project</p>
        <a
          href="/github"
          aria-current={isGithub ? 'page' : undefined}
        >
          GitHub App
        </a>
        <a href="https://docs.opencoven.ai">Docs</a>
        <a href="https://github.com/OpenCoven">GitHub</a>
      </nav>

      <nav aria-label="Footer community">
        <p>Community</p>
        <a href="https://discord.gg/opencoven">Discord</a>
        <a href="https://x.com/OpenCvn">X</a>
      </nav>
    </div>

    <div class="footer-meta">
      <span>Open source · local-first</span>
      <nav aria-label="Legal">
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
      </nav>
    </div>
  </div>
</footer>
```

- [ ] **Step 5: Replace shared header and modal CSS**

Replace the existing global `HEADER`, `FOOTER`, and `MOBILE` blocks in
`src/styles/global.css` with:

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid transparent;
  background: transparent;
  transition:
    background 180ms ease,
    border-color 180ms ease;
}

.site-header.is-scrolled {
  border-bottom-color: var(--oc-border-subtle);
  background: rgba(5, 4, 9, 0.98);
}

.header-inner {
  display: flex;
  width: min(100%, 1280px);
  height: 60px;
  align-items: center;
  gap: 24px;
  margin: 0 auto;
  padding: 0 32px;
}

.brand {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  color: var(--white);
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
}

.brand-mark img {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: 8px;
}

.desktop-nav {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.desktop-nav a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding: 0 10px;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 550;
  text-decoration: none;
}

.header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.header-control,
.mobile-toggle {
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--white);
  cursor: pointer;
}

.theme-toggle svg {
  display: none;
  width: 18px;
  height: 18px;
}

.theme-toggle .ti-system {
  display: block;
}

html[data-theme-pref='light'] .theme-toggle .ti-system,
html[data-theme-pref='dark'] .theme-toggle .ti-system {
  display: none;
}

html[data-theme-pref='light'] .theme-toggle .ti-light,
html[data-theme-pref='dark'] .theme-toggle .ti-dark {
  display: block;
}

.header-cta {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  padding: 0 16px;
  border-radius: 7px;
  background: var(--violet-cta);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
}

.mobile-toggle {
  display: none;
}

.mobile-nav-overlay[hidden] {
  display: none;
}

.mobile-nav-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  justify-items: end;
  background: rgba(5, 4, 9, 0.98);
}

.mobile-nav-panel {
  display: flex;
  width: min(100%, 440px);
  min-height: 100%;
  flex-direction: column;
  padding:
    calc(18px + env(safe-area-inset-top))
    max(24px, env(safe-area-inset-right))
    calc(24px + env(safe-area-inset-bottom))
    24px;
  border-left: 1px solid var(--oc-border-subtle);
  background: #0b0910;
  color: #e8e0f0;
}

.mobile-nav-panel > header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(232, 224, 240, 0.1);
}

.mobile-nav-panel > header p {
  color: #aaa1b8;
  font: 0.6875rem/1 var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.mobile-nav-close {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  background: transparent;
  color: #e8e0f0;
  cursor: pointer;
  font-size: 1.75rem;
}

.mobile-nav-panel > nav {
  display: grid;
  gap: 4px;
  padding: 24px 0;
}

.mobile-nav-panel > nav a {
  display: flex;
  min-height: 52px;
  align-items: center;
  color: #e8e0f0;
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 700;
  text-decoration: none;
}

.mobile-nav-panel .mobile-community {
  grid-template-columns: repeat(3, 1fr);
  margin-top: auto;
  padding-bottom: 0;
  border-top: 1px solid rgba(232, 224, 240, 0.1);
}

.mobile-nav-panel .mobile-community a {
  justify-content: center;
  color: #aaa1b8;
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  font-weight: 650;
}

.mobile-nav-fallback {
  display: none;
}

footer {
  position: relative;
  z-index: 1;
  padding: 56px 32px 80px;
  border-top: 1px solid var(--oc-border-subtle);
}

.footer-inner {
  display: grid;
  width: min(100%, 1216px);
  grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr);
  gap: 48px;
  margin: 0 auto;
}

.footer-intro p {
  max-width: 30ch;
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.6;
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--white);
  font-size: 0.8125rem;
  font-weight: 700;
  text-decoration: none;
}

.footer-brand img {
  width: 20px;
  height: 20px;
  border-radius: 6px;
}

.footer-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}

.footer-groups nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-groups nav p {
  margin-bottom: 4px;
  color: var(--vtext);
  font: 0.625rem/1 var(--mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.footer-groups a,
.footer-meta a {
  color: var(--muted);
  font-size: 0.75rem;
  text-decoration: none;
}

.footer-meta {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--oc-border-subtle);
  color: var(--muted);
  font: 0.625rem/1.4 var(--mono);
}

.footer-meta nav {
  display: flex;
  gap: 18px;
}

html[data-theme='light'] .site-header.is-scrolled {
  background: rgba(251, 250, 255, 0.98);
}

@media (max-width: 900px) {
  .desktop-nav,
  .header-cta {
    display: none;
  }

  .header-actions {
    margin-left: auto;
  }

  html.js-on .mobile-toggle {
    display: inline-grid;
  }

  .header-inner {
    padding-inline: 20px;
  }

  .footer-inner {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  footer {
    padding:
      44px
      20px
      calc(76px + env(safe-area-inset-bottom));
  }

  .footer-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-meta {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 400px) {
  .header-inner {
    padding-inline: 16px;
  }

  footer {
    padding-inline: 16px;
  }

  .footer-groups {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .mobile-nav-fallback {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--oc-border-subtle);
  }

  .mobile-nav-fallback a {
    color: var(--muted);
    font-size: 0.75rem;
  }
}
```

Remove obsolete `.header-social`, `.header-social-link`, `.btn-join`, old
`.mobile-nav-overlay`, old footer layout, and their responsive/light overrides
instead of leaving duplicate selectors.

- [ ] **Step 6: Replace shared navigation and copy behavior**

Replace the first mobile-navigation block in `src/scripts/main.js` with:

```js
(function wireHeader() {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var sync = function () {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  sync();
  window.addEventListener('scroll', sync, { passive: true });
})();

(function wireMobileNavigation() {
  var toggle = document.querySelector('.mobile-toggle');
  var dialog = document.getElementById('mobile-nav');
  var closeButton = dialog?.querySelector('.mobile-nav-close');
  if (!toggle || !dialog || !closeButton) return;

  var previousFocus = null;
  var inertTargets = Array.from(document.body.children).filter(function (child) {
    return child !== dialog && child.tagName !== 'SCRIPT';
  });
  var focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function setBackgroundInert(value) {
    inertTargets.forEach(function (target) {
      target.inert = value;
    });
  }

  function openMobile() {
    previousFocus = document.activeElement;
    dialog.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setBackgroundInert(true);
    closeButton.focus();
  }

  function closeMobile() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setBackgroundInert(false);
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    else toggle.focus();
  }

  toggle.addEventListener('click', openMobile);
  closeButton.addEventListener('click', closeMobile);
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) closeMobile();
  });
  dialog.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMobile);
  });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobile();
      return;
    }
    if (event.key !== 'Tab') return;

    var focusable = Array.from(
      dialog.querySelectorAll(focusableSelector),
    ).filter(function (element) {
      return !element.hasAttribute('hidden');
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  var desktop = window.matchMedia('(min-width: 901px)');
  var onDesktop = function (event) {
    if (event.matches) closeMobile();
  };
  if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
  else desktop.addListener(onDesktop);
})();
```

Replace the existing copy IIFE with:

```js
(function wireCopyControls() {
  var buttons = document.querySelectorAll('.qs-copy[data-copy]');
  if (!buttons.length) return;
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  var liveRegion = document.querySelector('[data-copy-live]');

  function announce(message) {
    if (liveRegion) liveRegion.textContent = message;
  }

  function selectCommand(button) {
    var surface = button.closest('[data-copy-surface]') || button.parentElement;
    var code = surface?.querySelector('code');
    if (!code) return;
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(code);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  buttons.forEach(function (button) {
    var originalHtml = button.innerHTML;
    var originalLabel = button.getAttribute('aria-label') || 'Copy command';
    var resetTimer = null;

    button.addEventListener('click', async function () {
      var command = button.getAttribute('data-copy') || '';
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error('Clipboard API unavailable');
        }
        await navigator.clipboard.writeText(command);
        button.classList.remove('is-copy-failed');
        button.classList.add('is-copied');
        button.innerHTML = CHECK_SVG;
        button.setAttribute('aria-label', 'Copied');
        announce(`Copied: ${command}`);
        if (resetTimer) window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(function () {
          button.classList.remove('is-copied');
          button.innerHTML = originalHtml;
          button.setAttribute('aria-label', originalLabel);
        }, 1_400);
      } catch {
        button.classList.remove('is-copied');
        button.classList.add('is-copy-failed');
        button.innerHTML = originalHtml;
        button.setAttribute(
          'aria-label',
          'Copy unavailable. Select the command and copy manually.',
        );
        selectCommand(button);
        announce(`Copy unavailable. The command is selected; copy it manually: ${command}`);
      }
    });
  });
})();
```

Add `data-copy-surface` to the `.onboard-command` wrapper in
`src/components/QuickstartProduct.astro`. This is the only Quick Start route
change in this task.

- [ ] **Step 7: Add the lightweight feedback fallback**

Create `src/components/FeedbackLauncher.astro`:

```astro
<a
  class="feedback-launcher"
  href="https://discord.gg/opencoven"
  data-feedback-launcher
>
  <span aria-hidden="true">✦</span>
  <span data-feedback-label>Feedback</span>
</a>
<span
  class="sr-only"
  role="status"
  aria-live="polite"
  data-feedback-status
></span>

<style>
  .feedback-launcher {
    position: fixed;
    right: max(18px, env(safe-area-inset-right));
    bottom: max(18px, env(safe-area-inset-bottom));
    z-index: 80;
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: 7px;
    padding: 0 14px;
    border: 1px solid var(--border-v);
    border-radius: 999px;
    background: var(--surface);
    color: var(--white);
    box-shadow: 0 18px 50px -24px rgba(0, 0, 0, 0.7);
    font-size: 0.75rem;
    font-weight: 700;
    text-decoration: none;
  }

  .feedback-launcher[aria-busy='true'] {
    cursor: wait;
    opacity: 0.72;
  }

  .feedback-launcher[data-feedback-state='failed'] {
    max-width: 220px;
    border-radius: 10px;
  }

  @media (max-width: 520px) {
    .feedback-launcher {
      right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom));
    }
  }
</style>
```

Remove the entire eager feedback stub and idle scheduler from
`src/pages/index.astro`. Import `FeedbackLauncher` and render it after
`<Footer />`.

Append this exact activation code to `src/scripts/landing.js`:

```js
(function wireFeedback() {
  var launcher = document.querySelector('[data-feedback-launcher]');
  var label = launcher?.querySelector('[data-feedback-label]');
  var status = document.querySelector('[data-feedback-status]');
  if (!launcher || !label) return;

  var loading = false;
  var ready = false;
  var failed = false;
  var instanceUrl = 'https://feedback.opencoven.ai';
  var sdkUrl = `${instanceUrl}/api/widget/sdk.js`;

  function announce(message) {
    if (status) status.textContent = message;
  }

  function fail() {
    loading = false;
    failed = true;
    launcher.removeAttribute('aria-busy');
    launcher.dataset.feedbackState = 'failed';
    label.textContent = 'Feedback unavailable · open Discord';
    announce('Feedback widget unavailable. Use the Discord fallback link.');
  }

  function openFeedback() {
    if (typeof window.Quackback !== 'function') {
      fail();
      return;
    }
    window.Quackback('open');
    announce('Feedback opened.');
  }

  function activateFeedback(event) {
    if (failed) return;
    event.preventDefault();
    if (ready) {
      openFeedback();
      return;
    }
    if (loading) return;

    loading = true;
    launcher.setAttribute('aria-busy', 'true');
    label.textContent = 'Opening feedback…';
    var script = document.createElement('script');
    script.id = 'opencoven-feedback-sdk';
    script.async = true;
    script.src = sdkUrl;
    script.addEventListener('load', function () {
      try {
        window.Quackback('init', {
          instanceUrl,
          launcher: false,
        });
        loading = false;
        ready = true;
        launcher.removeAttribute('aria-busy');
        label.textContent = 'Feedback';
        openFeedback();
      } catch {
        fail();
      }
    }, { once: true });
    script.addEventListener('error', fail, { once: true });
    document.head.appendChild(script);
  }

  launcher.addEventListener('click', activateFeedback);
})();
```

The current served SDK exposes `Quackback('init', ...)` and
`Quackback('open')`. Do not restore the obsolete `OpenCovenFeedback` queue.

- [ ] **Step 8: Verify the full shell and commit**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser --grep "mobile menu|header becomes|feedback SDK|clipboard failure|renders without"
```

Manually force the feedback SDK request to fail once and confirm the launcher
turns into a working Discord link on the next activation. Verify menu focus
restoration from both the homepage and `/quickstart`.

Commit:

```bash
git add \
  src/components/Header.astro \
  src/components/MobileNav.astro \
  src/components/Footer.astro \
  src/components/QuickstartProduct.astro \
  src/components/FeedbackLauncher.astro \
  src/pages/index.astro \
  src/scripts/main.js \
  src/scripts/landing.js \
  src/styles/global.css \
  scripts/verify-static.mjs \
  tests/landing.spec.ts
git commit -m "feat: refine landing navigation and feedback"
```

### Task 9: Remove obsolete homepage systems and enforce the bundle budget

**Files:**

- Modify: `src/pages/index.astro`
- Modify: `src/components/ThemeInit.astro`
- Modify: `src/styles/global.css`
- Modify: `scripts/verify-static.mjs`
- Modify: `tests/landing.spec.ts`

- [ ] **Step 1: Add failing final-structure and byte-budget checks**

Add `gzipSync` to the verifier imports:

```js
import { gzipSync } from 'node:zlib';
```

Add this helper below `toRenderedText`:

```js
async function getInitialJavascriptBudget(htmlContent) {
  const modulePaths = [];
  const scriptTags = htmlContent.match(/<script\b[^>]*>/g) ?? [];
  for (const tag of scriptTags) {
    if (!/\btype="module"/.test(tag)) continue;
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    if (src?.startsWith('/') && src.endsWith('.js')) {
      modulePaths.push(src);
    }
  }

  const seen = new Set();
  const queue = [...modulePaths];
  let moduleGzipBytes = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    const absolute = path.join(distDir, current.replace(/^\//, ''));
    const source = await readFile(absolute, 'utf8');
    moduleGzipBytes += gzipSync(source).byteLength;

    const importPattern = /(?:from\s*|import\s*)["']([^"']+\.js)["']/g;
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;
      queue.push(
        path.posix.normalize(
          path.posix.join(path.posix.dirname(current), specifier),
        ),
      );
    }
  }

  const inlineScripts = [
    ...htmlContent.matchAll(
      /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ].map((match) => match[1]);
  const inlineGzipBytes = inlineScripts.reduce(
    (total, source) => total + gzipSync(source).byteLength,
    0,
  );

  return {
    bytes: moduleGzipBytes + inlineGzipBytes,
    modules: [...seen],
  };
}
```

Inside the homepage build block, add:

```js
const narrativeOrder = [
  'id="top"',
  'class="trust-bar"',
  'id="how-it-works"',
  'id="runtime"',
  'id="products"',
  'id="quickstart"',
  'class="closing-invitation"',
];
let previousPosition = -1;
for (const marker of narrativeOrder) {
  const position = html.indexOf(marker);
  if (position <= previousPosition) {
    throw new Error(
      `Homepage narrative marker ${marker} is missing or out of order`,
    );
  }
  previousPosition = position;
}

if (html.includes('data-reveal')) {
  throw new Error('Homepage must not retain blanket per-card scroll reveals');
}

const javascriptBudget = await getInitialJavascriptBudget(html);
const maximumInitialJavascript = 20 * 1024;
if (javascriptBudget.bytes >= maximumInitialJavascript) {
  throw new Error(
    `Homepage initial JavaScript is ${javascriptBudget.bytes} gzip bytes; budget is below ${maximumInitialJavascript}`,
  );
}
console.log(
  `Verified homepage initial JavaScript: ${javascriptBudget.bytes} gzip bytes across ${javascriptBudget.modules.length} module files.`,
);
```

Read `src/pages/index.astro` with the other source files:

```js
const sourceIndex = await readFile(
  path.join(root, 'src/pages/index.astro'),
  'utf8',
);
if (
  sourceIndex.includes("import Ambient from '../components/Ambient.astro'")
  || sourceIndex.includes('<Ambient />')
) {
  throw new Error('Homepage must omit the cursor-tracked Ambient component');
}
```

Run:

```bash
CI=true pnpm build && pnpm check
```

Expected: the index still imports/renders `Ambient`, the old global selectors
still emit `data-reveal` through remaining attributes if any were missed, or
the new structure is not yet clean. Do not commit.

- [ ] **Step 2: Remove homepage ambient work and verify final composition**

Remove the `Ambient` import and `<Ambient />` from `src/pages/index.astro`.
Ensure the final `<main>` order is exactly:

```astro
<main id="content" tabindex="-1">
  <Hero />
  <TrustBar />
  <ContinuityStory />
  <RuntimeProof />
  <ProductConstellation />
  <QuickStart />
  <ClosingInvitation />
</main>
```

Remove every `data-reveal` and `reveal-stagger` attribute from the new homepage
components. Do not remove the legacy reveal implementation from `main.js` or
global CSS because `/github` and `/quickstart` still use it.

- [ ] **Step 3: Make theme-storage failure resolve the system preference**

In `src/components/ThemeInit.astro`, replace the catch block with:

```js
} catch (e) {
  var systemIsLight =
    window.matchMedia
    && matchMedia('(prefers-color-scheme: light)').matches;
  html.dataset.theme = systemIsLight ? 'light' : 'dark';
  html.dataset.themePref = 'system';
}
```

Add this test to `tests/landing.spec.ts`:

```ts
test('theme storage failure falls back to the live system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('storage disabled');
    };
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'system');
});
```

- [ ] **Step 4: Delete superseded global homepage CSS instead of overriding it**

Preserve:

- all root tokens, reset, typography, focus, skip link, and reduced-motion
  rules;
- `.btn-primary` and `.btn-secondary` as shared primitives;
- `.download-primary` because `/github` still uses it;
- `.content-section`, `.section-header`, `.section-kicker`, `.panel`, and
  `.panel-inset` because other routes use them;
- the Ambient, reveal, GitHub, legal, and `.quickstart-page` blocks for
  non-home routes;
- the new header, modal, and footer blocks from Task 8.

Delete the old homepage-only blocks and every corresponding responsive or
light-theme override:

```text
.hero-main
.hero-copy
.kicker
.kicker-beta
.beta-dot
.hero-lede
.download-cta
.download-primary--ios
.hero-actions-secondary
.btn-ghost
.hero-visual
.hero-card
.hero-card-*
.output-*
.familiar-*
.memory-*
.roster-*
.continuity
.continuity-*
.testimonial-*
.proof-section
.proof-grid
.proof-card
.qs-section
.qs-steps
.qs-step
.qs-rail
.qs-node
.qs-body
.qs-step-*
.qs-codeblock
.qs-out
.qs-note
.qs-actions
.ecosystem-section
.ecosystem-inner
.ecosystem-grid
.eco-*
```

Relocate the existing global `h1`, `.btn-primary`, and `.btn-secondary`
declarations immediately after `.section-kicker` before deleting the old hero
range. Do not duplicate them.

Remove old `will-change` entries for `.qs-body`, `.eco-cta`, and
`.eco-portal-cue`; retain entries still consumed by `/github`.

Verify no stale selector remains:

```bash
rg -n \
  "hero-card|testimonial-|proof-card|proof-grid|qs-step|qs-body|eco-|ecosystem-" \
  src/styles/global.css
```

Expected: no output.

Verify retained route contracts:

```bash
rg -n \
  "github-|quickstart-page|onboard-|motion-on\\.reveal-ready|ambient-glow" \
  src/styles/global.css | head -20
```

Expected: matches for all four retained selector families.

- [ ] **Step 5: Add no-JavaScript, reduced-motion, theme, and accessibility tests**

Add this import at the top of `tests/landing.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
```

Append:

```ts
test('core homepage remains complete without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.getByRole('heading', {
    name: 'Summon agents that remember.',
  })).toBeVisible();
  await expect(page.locator('[data-story-stage]')).toHaveCount(4);
  await expect(page.locator('[data-product-constellation] a')).toHaveCount(5);
  await expect(page.locator('.runtime-disclosure')).toHaveCount(3);
  await expect(page.locator('#quickstart code')).toHaveCount(3);
  await expect(page.locator('.mobile-nav-fallback')).toBeVisible();
  await expect(page.locator('[data-primary-cta][href="/quickstart"]').first()).toBeVisible();

  await context.close();
});

test('reduced motion shows content immediately with no hero animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.locator('html')).not.toHaveClass(/motion-on/);
  await expect(page.locator('.hero-copy')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('[data-story-stage]')).toHaveCount(4);
});

test('light theme keeps immutable dark ledger contrast', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/');

  const ledger = page.locator('.familiar-ledger').first();
  await expect(ledger).toHaveCSS('background-color', 'rgb(11, 9, 16)');
  await expect(ledger).toHaveCSS('color', 'rgb(232, 224, 240)');
  await expect(ledger.locator('.ledger-notes li').first()).toHaveCSS(
    'font-size',
    '12px',
  );
});

for (const colorScheme of ['dark', 'light'] as const) {
  test(`${colorScheme} homepage has no serious axe violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.addInitScript(() => localStorage.setItem('theme', 'system'));
    await page.goto('/');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (violation) =>
        violation.impact === 'serious'
        || violation.impact === 'critical',
    );
    expect(blocking).toEqual([]);
  });
}
```

The ledger font expectation is 12px on desktop. The separate 320px/390px
viewport matrix below enforces the 13px narrow-screen floor.

- [ ] **Step 6: Add the visual viewport and overflow matrix**

Append this helper and test:

```ts
const visualMatrix = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'small-desktop', width: 1024, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small-mobile', width: 320, height: 568 },
  { name: 'short-landscape', width: 844, height: 390 },
];

for (const viewport of visualMatrix) {
  for (const theme of ['dark', 'light'] as const) {
    test(`${viewport.name} ${theme} has no horizontal overflow`, async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem('theme', selectedTheme);
      }, theme);
      await page.goto('/');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      if (viewport.width <= 400) {
        const terminalFontSizes = await page.locator(
          '.familiar-ledger, .familiar-ledger *, .preview-command code',
        ).evaluateAll((elements) =>
          elements
            .filter((element) => element.textContent?.trim())
            .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
        );
        expect(Math.min(...terminalFontSizes)).toBeGreaterThanOrEqual(13);
      }

      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}-${theme}.png`),
        fullPage: true,
      });
      await context.close();
    });
  }
}
```

- [ ] **Step 7: Verify the cleanup and commit**

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser
git diff --check
```

Expected:

- all static, browser, no-JavaScript, reduced-motion, axe, and viewport cases
  pass;
- homepage JavaScript is below 20 KiB gzip;
- screenshot artifacts live only under ignored `test-results/`;
- `/quickstart`, `/github`, `/terms`, and `/privacy` still build and pass their
  existing checks.

Commit:

```bash
git add \
  src/pages/index.astro \
  src/components/ThemeInit.astro \
  src/styles/global.css \
  scripts/verify-static.mjs \
  tests/landing.spec.ts
git commit -m "refactor: remove obsolete landing systems"
```

### Task 10: Gate the complete interaction contract in CI

**Files:**

- Modify: `tests/landing.spec.ts`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the remaining theme, copy, download, and failure tests**

Append to `tests/landing.spec.ts`:

```ts
test('theme control cycles system to light to dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('theme', 'system'));
  await page.goto('/');

  const toggle = page.locator('[data-theme-toggle]');
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'system');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-pref', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('platform shortcut resolves Windows without changing the primary path', async ({
  browser,
}) => {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
  });
  const page = await context.newPage();
  await page.goto('/');

  const download = page.locator('[data-download-primary]');
  await expect(download).toContainText('Download Coven Cave for Windows');
  await expect(download).toHaveAttribute('href', '/download/windows');
  await expect(download).toHaveAttribute('data-platform', 'win');
  await expect(
    page.locator('.hero [data-primary-cta]'),
  ).toHaveAttribute('href', '/quickstart');
  await context.close();
});

test('copy success announces the exact command', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __copied?: string }).__copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          (window as Window & { __copied?: string }).__copied = value;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto('/');

  const button = page.locator('#quickstart [data-copy]').first();
  await button.click();
  await expect(button).toHaveAttribute('aria-label', 'Copied');
  await expect(page.locator('#quickstart [data-copy-live]')).toHaveText(
    'Copied: npm install -g @opencoven/cli',
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __copied?: string }).__copied,
    ),
  ).toBe('npm install -g @opencoven/cli');
});

test('feedback failure preserves a visible Discord fallback', async ({ page }) => {
  await page.route('**/api/widget/sdk.js', (route) => route.abort('failed'));
  await page.goto('/');

  const launcher = page.locator('[data-feedback-launcher]');
  await launcher.click();
  await expect(launcher).toHaveAttribute('data-feedback-state', 'failed');
  await expect(launcher).toContainText('Feedback unavailable · open Discord');
  await expect(launcher).toHaveAttribute('href', 'https://discord.gg/opencoven');
  await expect(page.locator('[data-feedback-status]')).toContainText(
    'Use the Discord fallback link',
  );
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`system theme resolves live ${colorScheme} preference`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.addInitScript(() => localStorage.setItem('theme', 'system'));
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme-pref',
      'system',
    );
  });
}
```

Run:

```bash
CI=true pnpm build
pnpm check
pnpm check:browser
```

Expected: all interaction and visual-matrix tests pass.

- [ ] **Step 2: Add Chromium verification to CI**

After `Install dependencies` in `.github/workflows/ci.yml`, add:

```yaml
      - name: Install Chromium
        run: pnpm exec playwright install --with-deps chromium
```

After `Verify static output`, add:

```yaml
      - name: Verify browser interactions
        run: pnpm check:browser
```

Do not change the existing Node 22, pnpm 10, build, or static-check steps.

- [ ] **Step 3: Run the exact CI sequence and commit**

Run:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
CI=true pnpm build
pnpm check
CI=true pnpm check:browser
git diff --check
```

Expected: every command exits `0`.

Commit:

```bash
git add tests/landing.spec.ts .github/workflows/ci.yml
git commit -m "test: gate landing interactions in CI"
```

### Task 11: Perform release-grade visual and performance verification

**Files:**

- Modify only files required by verified failures.
- Do not weaken test assertions or thresholds to make a failure disappear.

- [ ] **Step 1: Run the complete static and browser suite from a clean build**

Run:

```bash
git status --short
rm -rf dist
CI=true pnpm build
pnpm check
CI=true pnpm check:browser
```

Before `rm -rf dist`, resolve the literal path with `pwd` and confirm this is
the ignored `dist/` directory inside the isolated implementation worktree.

Expected:

- the pre-build status is clean;
- the rebuilt five-route output passes every static contract;
- all browser tests pass;
- `test-results/` contains the 12 full-page matrix screenshots and is ignored.

- [ ] **Step 2: Review every generated viewport image**

Open each `test-results/**/{desktop,small-desktop,tablet,mobile,small-mobile,short-landscape}-{dark,light}.png`
with the image viewer. Check:

- the memory thread visually continues from hero to story;
- editorial whitespace separates chapters without empty dead zones;
- no section returns to the old repeated-console rhythm;
- the 3+2 constellation is balanced at 1440px;
- the tablet final-span product card looks intentional;
- mobile content reads in natural order with no miniaturized diagram;
- commands scroll inside their surfaces;
- no text, focus ring, or floating feedback control is clipped;
- light mode keeps ledgers and command islands intentionally dark;
- the mobile header contains only brand, theme, and menu;
- the close and final CTA remain visually dominant at their intended points.

If a defect is visible, add or tighten a browser assertion first, reproduce the
failure, implement the smallest scoped fix, and rerun the full matrix.

- [ ] **Step 3: Run Lighthouse against production preview**

Start the preview:

```bash
pnpm preview > /tmp/coven-landing-living-familiar-preview.log 2>&1 &
landing_preview_pid=$!
cleanup_landing_preview() {
  kill "$landing_preview_pid" 2>/dev/null || true
  wait "$landing_preview_pid" 2>/dev/null || true
}
trap cleanup_landing_preview EXIT
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS http://127.0.0.1:4173/ >/dev/null && break
  sleep 1
done
curl -fsS http://127.0.0.1:4173/ >/dev/null
```

Resolve the installed Chromium and run mobile Lighthouse:

```bash
landing_chrome_path="$(node --input-type=module -e "import { chromium } from 'playwright'; process.stdout.write(chromium.executablePath())")"
CHROME_PATH="$landing_chrome_path" pnpm exec lighthouse \
  http://127.0.0.1:4173/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json \
  --output-path=test-results/lighthouse-mobile.json \
  --chrome-flags="--headless=new --no-sandbox"
```

Check the approved thresholds:

```bash
node --input-type=module -e '
import { readFileSync } from "node:fs";
const report = JSON.parse(readFileSync("test-results/lighthouse-mobile.json", "utf8"));
const scores = Object.fromEntries(
  Object.entries(report.categories).map(([key, value]) => [key, Math.round(value.score * 100)]),
);
const lcp = report.audits["largest-contentful-paint"].numericValue;
const cls = report.audits["cumulative-layout-shift"].numericValue;
console.log({ scores, lcp, cls });
if (
  scores.performance < 90
  || scores.accessibility < 95
  || scores["best-practices"] < 95
  || scores.seo < 95
  || lcp > 2500
  || cls >= 0.1
) {
  process.exit(1);
}
'
```

Expected:

- performance at least `90`;
- accessibility, best practices, and SEO at least `95`;
- LCP at most `2500ms`;
- CLS below `0.1`.

Stop the preview:

```bash
kill "$landing_preview_pid"
wait "$landing_preview_pid" 2>/dev/null || true
trap - EXIT
```

If Lighthouse fails, inspect the named audit, make a measured fix, and rerun
three times. Use the median run only after all three individual runs remain
within the approved thresholds.

- [ ] **Step 4: Verify the feedback network boundary manually**

Open the production preview with the browser network panel:

1. load `/` and wait five seconds;
2. filter for `feedback.opencoven.ai`;
3. confirm there is no SDK, config, widget, or iframe request;
4. activate the `Feedback` control;
5. confirm the SDK request starts only then and the panel opens;
6. repeat with the SDK blocked and confirm the visible Discord fallback.

Expected: zero third-party feedback requests before activation.

- [ ] **Step 5: Run the final repository proof**

Use `verification-before-completion`, then run:

```bash
CI=true pnpm build
pnpm check
CI=true pnpm check:browser
git diff --check
git status --short
git log --oneline --decorate -12
```

Expected:

- every verification command exits `0`;
- the worktree is clean;
- commits are narrow, ordered, and squashable;
- no commit touches the live Quick Start worktree or its `output/` directory.

Use `requesting-code-review` against the approved design spec and this
implementation plan. Address required findings, rerun the full proof, and only
then report the branch ready. Do not push, open a PR, or merge unless Val asks
for that separately.

## Acceptance-to-proof map

| Approved criterion | Durable proof |
| --- | --- |
| Primary homepage action is `/quickstart` | three scoped `data-primary-cta` static assertions plus browser hero/close tests |
| Summon → Remember → Move → Understand → Choose → Begin → Belong | ordered-marker verifier and final `<main>` composition |
| One restrained memory signature | hero ledger plus four-stage story; obsolete section assertions |
| Five products from shared registry | source import assertion plus exact five-link rendered contract |
| Native mobile flows | per-stage snapshots, native runtime disclosures, six-viewport matrix |
| Readable light-theme terminal | immutable ledger tokens and computed-color browser test |
| Uncrowded mobile header | modal test and absence of header social links |
| Feedback only after interaction | request interception test and manual network proof |
| No-JavaScript and reduced-motion completeness | dedicated browser contexts |
| Build, interaction, viewport, and quality gates | CI, axe, screenshots, byte budget, Lighthouse |
| Unrelated routes unchanged | retained static contracts and cross-route browser smoke tests |
