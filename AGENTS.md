# AGENTS.md — OpenCoven public landing

## Canonical role

`coven-landing` owns the static public explanation of OpenCoven at `opencoven.ai`:

- public information architecture and route composition;
- evidence-backed product positioning and maturity labels;
- public onboarding handoff into canonical products and documentation;
- browser-native Cave download routing;
- the static Astro implementation of canonical brand and UI contracts;
- public metadata, structured data, accessibility, and performance gates.

The repository is a **consumer and presentation plane**, not a protocol or runtime authority.

## Explicit non-ownership

Do not define or silently fork canonical semantics owned elsewhere:

- familiar identity → `OpenCoven/familiar-contract`;
- protected mutation/authorization → `OpenCoven/coven-threads` and `OpenCoven/coven`;
- orchestration → `OpenCoven/psyche`;
- daemon, persistence, sessions, and local runtime → `OpenCoven/coven`;
- production oversight behavior → `OpenCoven/coven-cave`;
- terminal coding behavior → `OpenCoven/coven-code`;
- GitHub-triggered delivery → `OpenCoven/coven-github`;
- visual identity/voice → `OpenCoven/brand`;
- reusable interaction contracts/specimens → `OpenCoven/ui`;
- long-form public documentation → `OpenCoven/coven-docs`.

When canonical evidence is absent, use an explicit unknown/gated state or omit the claim. Do not fill gaps with marketing inference.

## Public truth hierarchy

Use these checked-in contracts before changing public copy:

1. `docs/decisions/2026-08-30-public-positioning-and-claims.md`
2. `src/data/products.ts`
3. `docs/public-truth-register.md`
4. immutable or released evidence linked by those files

The approved category is **identity-preserving familiar infrastructure**. The current proof is narrower: Coven coordinates local agent sessions through shared claims, durable records, and human-approved guards.

Never present SPAR as a new database, IAM root, broad schema namespace, or canonical ledger. Psyche snapshots authorized identity into work; it does not create familiar identity.

## Bootstrap

```bash
corepack enable
pnpm install --frozen-lockfile
```

Required CI toolchain:

- Node.js 22
- pnpm 10
- Python 3
- Chromium installed through Playwright
- FFmpeg only while the historical static verifier still requires it

## Canonical verification

Fast, source/static checks:

```bash
CI=true pnpm build
pnpm check
pnpm test:unit
```

Browser contract:

```bash
pnpm exec playwright install chromium
pnpm check:browser
```

Measured baseline/evidence capture:

```bash
pnpm baseline:static
pnpm preview
# in another process after the preview is reachable:
pnpm baseline:browser
pnpm baseline:lighthouse
```

Run the complete CI-equivalent set before merge when dependencies are available.

## Change boundaries

### Protected public contracts

Treat changes to these files as high-review surfaces:

- `src/data/products.ts`
- `docs/decisions/**`
- `docs/public-truth-register.md`
- `src/pages/privacy.astro`
- `src/pages/terms.astro`
- `src/scripts/analytics.*`
- `analytics/**`
- `api/download.js`
- `api/stream.js`
- `workers/installer-stream/**`
- `vercel.json`
- `.github/workflows/**`

For claim, policy, analytics, download, security, or structured-data changes, state the canonical owner/evidence and fail-closed behavior in the PR.

### Generated and evidence paths

- `dist/**` is generated and must not be committed.
- `artifacts/**` is generated evidence and must not be committed unless an issue explicitly requires a stable fixture.
- Playwright traces, screenshots, Lighthouse reports, and baseline reports belong in CI artifacts by default.

### External side effects

Repository code may perform these only through explicit operator configuration:

- deploy the landing site;
- enable analytics;
- deploy the optional installer Worker;
- publish or redirect production traffic;
- alter release/download infrastructure.

Do not add secrets to source, logs, screenshots, fixtures, analytics payloads, or issue comments. Analytics remains disabled unless the approved mode and key are both present.

## Implementation laws

- Keep the core experience static-first and useful without JavaScript.
- Use normal links/navigation for installer downloads; page JavaScript must never own installer bytes.
- Preserve one canonical three-command foundation:

  ```bash
  npm install -g @opencoven/cli
  coven doctor
  coven
  ```

- Never introduce `coven init` without a verified upstream contract change.
- Active product/status/destination UI must derive from `src/data/products.ts`.
- Archived products must not enter recommended current flows.
- One semantic control implementation should serve equivalent states; do not create route-private menu, copy, download, or theme contracts.
- Avoid client frameworks for presentation-only behavior.
- Respect reduced motion, keyboard use, no-JavaScript fallbacks, 320 px width, and 200% zoom.
- Do not use serialized inline-style selectors as a responsive API.
- Keep remote scripts out of the render-critical path.
- Treat zero-valued unavailable proof as unknown, not as negative social proof.

## Task workflow

1. Read the primary issue, linked decisions, and current open PRs.
2. Confirm the latest `main` SHA and rebase before creating overlapping work.
3. Identify the canonical owner for every public claim or behavioral contract touched.
4. Work on one issue-primary branch/PR; list secondary issue references without claiming they are fully closed.
5. Add or update deterministic checks with the behavior.
6. Preserve no-JavaScript and failure-mode behavior while adding enhancement.
7. Include exact verification results and remaining uncertainty in the PR.
8. Merge only when the branch is current, the diff is coherent, and required checks pass or a narrowly documented infrastructure exception is understood.

## Completion packet

Every substantive PR should record:

- objective and primary issue;
- acceptance criteria addressed and explicit non-goals;
- files intentionally changed;
- canonical evidence/owners consulted;
- public-truth, authority, privacy, security, and accessibility impact;
- exact commands/checks and results;
- generated artifact locations;
- migration and rollback behavior;
- remaining manual, production, legal, or cross-repository gates.

A green historical string assertion is not proof of current UX correctness. A polished claim is not evidence. Unknowns stay visible until their owning system resolves them.
