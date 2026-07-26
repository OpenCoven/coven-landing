# Living Familiar Landing Page Design

**Date:** 2026-07-26

**Status:** Ready for maintainer review; implementation is not yet authorized

**Design branch:** `design/living-familiar-landing`

**Implementation dependency:** `feat/comprehensive-quickstart` or its landed equivalent

## Outcome

Recreate the OpenCoven homepage as a cohesive, modern product narrative that
moves a qualified visitor from understanding persistent familiars to reaching a
verifiable first success with the right OpenCoven product.

The redesign succeeds when:

- the page has one primary conversion path: `Start with OpenCoven` to
  `/quickstart`;
- one continuous familiar story explains persistence, memory, harness
  portability, and project scope without repeating the same thesis in several
  modules;
- the five user-facing OpenCoven products are differentiated by purpose,
  platform, maturity, and best fit;
- the experience is visually distinctive without relying on generic gradients,
  repeated glass cards, or scattered animation;
- desktop interactions become natural, readable mobile content rather than
  miniaturized diagrams;
- dark, light, system, reduced-motion, keyboard-only, and JavaScript-disabled
  experiences remain complete and usable;
- the page loads quickly before any optional third-party feedback code; and
- existing `/github`, legal, download, sitemap, metadata, and static-output
  behavior remains intact.

## Current-State Evidence

The design is based on the rendered homepage and current source at
`def88f2`, not only on component names or prior plans.

### What already works

- The hero has a memorable, product-specific thesis:
  `Summon agents that remember.`
- The familiar ledger and continuity timeline make an abstract runtime concept
  concrete.
- The page uses self-hosted fonts and a coherent OpenCoven token system.
- Current interactive components include keyboard-oriented tab and radio
  behavior, no-JavaScript content fallbacks, visible focus treatment, and
  reduced-motion handling.
- The static Astro build is small and the current build plus
  `scripts/verify-static.mjs` complete successfully.
- Dark mode is visually coherent and the current desktop hero is already a
  strong foundation.

### Confirmed gaps

- The conversion hierarchy is fragmented. The hero prioritizes CovenCave
  downloads, the body teaches the Coven runtime and CLI, and the closing module
  prioritizes Discord.
- Architecture, How It Works, and Compare consume three large modules to
  explain overlapping runtime concepts.
- The visual rhythm becomes repetitive below the hero: section heading,
  bordered console, bordered rows, then another bordered console.
- In light mode, the How It Works dark console inherits dark semantic text.
  Rendered computed styles include `rgb(27, 23, 38)` headings and
  `rgb(89, 83, 112)` prose on a near-black console surface.
- At 390px, the header presents the brand, theme control, three social icons,
  and a hamburger in one row. The translucent mobile overlay leaves distracting
  page content visible beneath it.
- Desktop diagrams and data surfaces shrink on mobile; some utility text falls
  below a comfortable reading size.
- The feedback SDK is scheduled during idle time even though the page comment
  notes that it pulls roughly 3.5 MB of admin React chunks. Optional feedback
  code should not enter the initial landing-page load.
- The homepage implementation is concentrated in large units:
  `Architecture.astro` (813 lines), `HowItWorks.astro` (891),
  `Compare.astro` (298), `global.css` (2,083), and `main.js` (404).

## Audience and Page Job

### Primary audience

Developers and technical operators who already use an agent CLI or coding
assistant and feel the cost of session loss, repeated context setup, opaque
background work, or fragmented agent tooling.

### Secondary audience

Open-source contributors, technical teams evaluating persistent agent
infrastructure, and visitors exploring a specific OpenCoven surface such as
Cave or the GitHub integration.

### Single page job

Help a visitor understand the value of a persistent familiar, identify the
right OpenCoven surface, and enter the dedicated quickstart path.

### Conversion hierarchy

1. **Primary:** `Start with OpenCoven` → `/quickstart`
2. **Secondary:** `View on GitHub` → canonical Coven repository
3. **Contextual:** platform-aware `Download Coven Cave`
4. **Support:** docs, Discord, X, and other community destinations

Downloads and community remain available, but they no longer compete with the
primary first-success path.

## Approaches Considered

### 1. The Living Familiar — selected

Follow one familiar from first invocation through learned conventions, a
harness change, and a later resumed session. A continuous memory thread joins
the hero to the proof and product sections.

**Why selected:** It is specific to OpenCoven, makes persistence emotionally
legible, preserves the strongest existing idea, and creates a conversion story
rather than a collection of feature demos.

### 2. Product constellation

Lead with all five OpenCoven products and route visitors by use case.

**Trade-off:** Product breadth becomes immediately clear, but the page risks
feeling like a portfolio index before a visitor understands why the ecosystem
exists.

### 3. Operator console

Lead with architecture, inspectability, and runtime controls in a dense
technical interface.

**Trade-off:** Strong developer credibility, but less emotional distinction and
greater similarity to generic developer-tool landing pages.

The selected design uses a compact product constellation later in the page
without making it the opening thesis.

## Design Principles

1. **The hero is the thesis.** Persistence is demonstrated, not merely claimed.
2. **One story, one signature.** The memory thread is the memorable visual
   device; supporting sections remain restrained.
3. **Fewer, stronger modules.** Open editorial space separates deliberate
   product surfaces.
4. **Structure communicates meaning.** Sequence markers are used only for the
   actual time sequence; product cards are not numbered.
5. **Proof is literal.** No invented adoption numbers, fake customer marks, or
   unlabeled simulated metrics.
6. **Motion explains state.** It does not decorate every viewport entrance.
7. **Mobile recomposes.** It never receives a scaled-down desktop diagram.
8. **Progressive enhancement is real.** Core content is present before client
   code and without Intersection Observer.

## Information Architecture

The page reads as seven narrative beats plus a compact trust interlude.
Remember and Move share one continuous story component rather than becoming
separate feature sections.

### 1. Summon — header and hero

**Purpose:** Establish the promise and offer the first-success path.

The hero preserves:

> Summon agents that remember.

Supporting copy explains the practical outcome in two short sentences: a
familiar keeps project context, conventions, and work state after the terminal
closes.

The action group contains:

- `Start with OpenCoven` as the dominant action;
- `View on GitHub` as a secondary action; and
- a quieter platform-aware Cave download link beneath the primary actions.

The right side renders a realistic but clearly illustrative local familiar
ledger. It is labeled `example · local` so its session state is not mistaken for
live customer data. Hexi is the stable default. Charm and Sage remain available
through deliberate tabs, but the page does not rotate them indefinitely.

The hero timeline begins the page's memory thread and ends at the first story
stage below rather than forming a self-contained decorative strip.

### Trust interlude — compatibility and ownership

**Purpose:** Answer “does this work with what I use?” without interrupting the
story.

The compact trust bar includes:

- current supported harness marks;
- `open source`;
- `local-first`; and
- `provider-owned authentication`.

Repository or release evidence may be added only when it is sourced from a
stable build-time value or maintained literally. If verification is unavailable
the metric is omitted.

### 2. Remember and move — continuous familiar story

**Purpose:** Explain the product through one concrete sequence.

Four stages form an ordered list:

1. **Summoned:** a project-scoped session is created.
2. **Learned:** explicit working conventions persist to familiar memory.
3. **Moved:** the project changes harness or OpenCoven surface without losing
   the shared runtime record.
4. **Returned:** a later session restores the relevant context and resumes work.

On wide screens, narrative stages scroll in the left column while a familiar
ledger remains sticky on the right. The active stage changes the visual ledger
state and advances the memory thread. Scrolling remains native; there is no
snap, wheel interception, or synthetic page progress.

The narrative text contains the complete meaning. The changing ledger is a
visual enhancement and does not produce repeated screen-reader announcements.

### 3. Understand — condensed runtime proof

**Purpose:** Give technical visitors enough architecture to trust the model
without replaying three feature sections.

One module replaces the current Architecture, How It Works, and Compare
sections. It shows three explicit layers:

```text
Harness or product surface
          ↓
Coven: sessions · memory · adapter · tool gateway
          ↓
Project: filesystem · git · terminals · docs
```

Desktop visitors can select one of the three layers for a concise detail panel.
The Coven layer is selected by default. Mobile visitors receive three stacked
disclosures, not the eleven-node SVG.

The module ends with one direct docs link. Glossary popovers and the large
capability comparison matrix are removed; their useful explanations become
plain contextual copy.

### 4. Choose — product constellation

**Purpose:** Help a visitor choose a surface after understanding the shared
substrate.

Five semantic link cards cover:

| Product | Role on this page |
| --- | --- |
| Coven CLI | Recommended local foundation |
| Coven Code | Coding workspace and provider-connected TUI |
| Coven Cave | Visual desktop home for familiars and ongoing work |
| CastCodes | Terminal surface for Coven-backed sessions |
| OpenCoven for GitHub | Repository and issue automation |

Each card contains product name, concise purpose, status, platform, best fit,
and one destination. Content comes from the typed quickstart data introduced by
`feat/comprehensive-quickstart`; the homepage must not create a second product
content registry.

On pointer hover or keyboard focus, a visual trace connects the selected
surface back to Coven. The trace is decorative and no information depends on
hover.

### 5. Begin — quickstart preview

**Purpose:** Turn understanding into action.

The homepage previews the recommended Coven CLI foundation in three short
steps, then offers:

- `Choose any product` → `/quickstart`; and
- `Read the full docs` as a secondary action.

Commands, success checks, and copied values share one data source. The
dedicated quickstart route remains responsible for complete per-product setup,
prerequisites, troubleshooting, and success verification.

### 6. Belong — closing invitation and footer

**Purpose:** Offer contribution and community after the visitor has a clear
product path.

The closing copy reinforces ownership:

> Your familiar, your tools, your machine.

The primary closing action repeats `Start with OpenCoven`. GitHub, docs, and
Discord appear as balanced secondary destinations. Social icons live in the
footer and mobile menu rather than the compact mobile header.

## Visual System

### Palette

The redesign preserves shared OpenCoven brand tokens:

| Role | Value | Use |
| --- | --- | --- |
| Void | `#050409` | Dark page ground |
| Surface | `#111018` | Primary product surface |
| Violet | `#9A8ECD` | Brand accent and focus |
| Lilac | `#C4B9F0` | Memory thread and emphasized text |
| Signal | `#30D158` | Verified active/success state |
| Moon | `#FBFAFF` | Light editorial ground |

Color is never the only state indicator. Signal green is reserved for actual
active or successful state; it is not a general decorative accent.

### Typography

- **Display:** Satoshi when available, then Geist Variable.
- **Body:** Inter Variable.
- **Utility:** JetBrains Mono Variable for commands, timestamps, status, and
  compact system labels only.

The hero remains the largest typographic moment. Later headings step down
clearly and do not imitate the hero. Body copy stays at or above 16px on desktop
and 15px on narrow screens. Console copy stays at or above 13px on mobile.

### Layout and rhythm

- Maximum primary canvas: 1280px.
- Desktop grid: twelve columns with asymmetric 5/7 or 6/6 compositions.
- Section rhythm: 104–120px desktop, 80–96px tablet, 64–72px mobile.
- Prose measure: 58–68 characters.
- Product/detail surfaces: 12px radius.
- Pills are reserved for status and platform metadata.
- Open editorial sections do not receive a containing card by default.

### Signature memory thread

The thread begins in the hero and continues through the four story stages. Its
resting color is Lilac; completed nodes acquire Signal only when the story
describes a verified success. It is thin, quiet, and spatially connected to the
ledger. It is not repeated in unrelated product cards.

### Surface treatment

Dark mode uses cinematic void space and dark product surfaces. Light mode uses
Moon editorial space with explicitly dark ledger and terminal islands. Terminal
colors use dedicated immutable tokens instead of inheriting semantic page text
tokens. Heavy backdrop filters and cursor-following ambient effects are
removed.

## Interaction Design

### Hero arrival

One non-looping sequence runs when motion is allowed:

1. headline and lede settle;
2. the ledger acknowledges the session; and
3. the first portion of the memory thread illuminates.

The full sequence completes within roughly 900ms. The terminal does not
continuously type, erase, or rotate. Familiar tabs are controlled manually with
roving tab focus and arrow-key behavior.

### Story transitions

Intersection Observer updates only the active visual state. Ledger rows
crossfade and the thread advances over 350–450ms. Stage markers are ordinary
anchor links so visitors can select a moment directly. Browser history is not
polluted on passive scroll.

The current page's blanket per-card reveal system is removed from core content.
At most, each major chapter receives one subtle first-entry transition.

### Runtime proof

Desktop layers behave as a three-option tab or radio group with explicit
selection state. Mobile layers use native disclosure behavior. The detail
panel changes within 160–220ms and does not animate height from unknown
content.

### Navigation

Desktop navigation contains:

- How it works
- Products
- Quick Start
- Docs
- theme control
- Start with OpenCoven

The header is transparent or lightly separated at the top and gains an opaque
surface after scrolling. It does not rely on a continuously expensive blur.

Mobile navigation contains only brand, theme, and menu in the header. The menu
opens as an opaque modal surface, contains product/community destinations, and
supports Escape close, focus containment, background inertness, scroll lock,
and focus restoration.

### Theme

The control continues to expose System, Light, and Dark states with an accurate
accessible label. Storage access is guarded; failure falls back to system
preference. Changing themes never changes terminal contrast semantics.

### Copy controls

Copy buttons announce success in one shared polite live region. Clipboard
failure leaves text selectable and changes the button message to a concrete
fallback instruction.

### Feedback

Initial HTML includes a lightweight feedback launcher or direct feedback link.
The third-party SDK loads only after activation. Failure preserves a usable
support destination. On narrow screens the launcher respects safe-area insets
and does not cover product actions, copy controls, or footer links.

## Motion System

Motion has three levels:

| Level | Duration | Purpose |
| --- | --- | --- |
| Control | 160–200ms | Hover, focus, tabs, copy feedback |
| Content state | 350–450ms | Ledger and proof-panel changes |
| Page arrival | ≤900ms total | One coordinated opening sequence |

Use the existing deliberate ease-out curve. Remove cursor parallax, persistent
typing loops, blanket card lift, and independent decorative pulses. A small
active-status pulse may remain only when motion is allowed and it communicates
live state.

With `prefers-reduced-motion: reduce`, all content appears immediately,
scrolling is not smoothed, state changes are instantaneous, and no element
drifts or pulses.

## Responsive Design

### Wide desktop: 1180px and above

- Two-column hero.
- Sticky story ledger with scrolling narrative steps.
- Asymmetric 3+2 product constellation.
- Three-layer runtime proof with adjacent detail panel.

### Tablet and small desktop: 768–1179px

- Hero remains two-column only when width and orientation permit.
- Story ledger sits beside a stage when space permits, otherwise directly
  below it; no sticky dependency.
- Product constellation becomes two columns with a deliberate final-span
  layout.
- Runtime proof preserves large controls and readable detail copy.

### Mobile: 767px and below

- Natural single-column reading order.
- Hero copy, actions, and ledger stack.
- Memory thread becomes a vertical timeline.
- Each story stage includes its own static ledger snapshot.
- Product cards stack.
- Runtime proof becomes three disclosures.
- Social links leave the header.
- Primary and secondary actions stack at narrow widths.

### Small mobile: 400px and below

- 16px outer gutter.
- No console text below 13px.
- Long commands scroll within their own code surface instead of clipping the
  page.
- Every pointer target is at least 44×44 CSS pixels.
- Floating utility controls respect `env(safe-area-inset-*)`.

Required visual checks cover 1440×1000, 1024×768, 768×1024, 390×844, and
320×568, plus a short landscape handset.

## Accessibility Contract

- The skip link remains first in the focus order.
- Story stages are an ordered list with real headings.
- Product destinations are a semantic list of links.
- Visual scroll state does not generate repeated `aria-live` announcements.
- No text or required interaction exists only inside SVG.
- Every selected state has text and programmatic state in addition to color.
- Focus order follows DOM order and is not visually reordered ahead of its
  heading.
- Modal navigation follows dialog focus behavior and restores the invoker.
- Tabs use standard arrow, Home, and End behavior where applicable.
- Disclosure controls use native `details` and `summary` when tabs are no
  longer appropriate.
- Light and dark themes meet WCAG AA for text and controls.
- No-JavaScript output contains every narrative stage, product destination,
  runtime explanation, command, and CTA.
- Reduced motion preserves meaning and reading order.

## Component and Data Boundaries

### Data

`src/data/landing.ts` owns typed homepage narrative content:

- familiar identity;
- story stage ID, label, narrative, and ledger snapshot;
- trust statements; and
- runtime-proof layer content.

Product identity, status, platforms, best fit, and canonical destinations come
from `src/data/quickstart.ts` introduced by
`feat/comprehensive-quickstart`. Product content must not be copied into
`landing.ts`.

### Components

| Component | Responsibility |
| --- | --- |
| `Hero.astro` | Thesis, primary actions, first ledger state |
| `TrustBar.astro` | Compatibility and ownership statements |
| `ContinuityStory.astro` | Ordered narrative and progressive enhancement shell |
| `FamiliarLedger.astro` | Render one static, reusable ledger snapshot |
| `ProductConstellation.astro` | Render product choices from quickstart data |
| `RuntimeProof.astro` | Three-layer architecture explanation |
| `QuickStart.astro` | Compact foundation preview and route handoff |
| `Header.astro` | Shared desktop header and active navigation |
| `MobileNav.astro` | Accessible modal navigation content |
| `Footer.astro` | Support, community, legal, and social destinations |

The existing `Architecture.astro`, `HowItWorks.astro`, `Compare.astro`, and
`ProofGrid.astro` are removed from the homepage after their unique content is
accounted for. They are deleted only if no other route imports them.

### Client code

Client behavior is split by concern:

- shared header, theme, copy, and feedback setup;
- homepage-only continuity-story enhancement; and
- small component-local controls where Astro's component scripts already fit.

The implementation should not replace the current static Astro architecture
with a client framework. Content remains server-rendered.

### Styling

`global.css` continues to own tokens, reset, typography, shared focus, shared
buttons, header/footer primitives, and legal/GitHub route styles. New homepage
components colocate their specific presentation in scoped styles. Obsolete
homepage selectors are removed rather than overridden by a second layer of
specificity.

## Integration Sequence

The comprehensive quickstart work currently lives in the isolated
`feat/comprehensive-quickstart` worktree at `91c65f2`. It includes the typed
product registry, `/quickstart`, reusable guide component, and accessibility
follow-up commits.

Implementation of this design must:

1. begin from `feat/comprehensive-quickstart`, or wait until that branch lands;
2. bring this design spec onto the implementation branch;
3. consume `src/data/quickstart.ts` for the product constellation; and
4. preserve the branch's static-output and accessibility contracts.

Implementing from current `main` and inventing another product registry is
explicitly out of scope.

## Failure and Recovery Behavior

- **Intersection Observer unavailable:** all story stages and snapshots remain
  visible in normal flow.
- **Clipboard unavailable or denied:** commands remain selectable and the
  control explains manual copying.
- **Theme storage unavailable:** system preference is used without persistence.
- **Feedback SDK unavailable:** a direct support destination remains.
- **External proof unavailable:** the proof is omitted rather than replaced by
  stale or placeholder data.
- **Download resolution fails:** preserve the current download resolver's
  recovery destination and do not strand the visitor on a blank response.
- **JavaScript error:** navigation links, product choices, docs, commands, and
  core narrative remain usable.

## Performance and Loading

- The initial page must not request the feedback SDK.
- Landing-page client JavaScript stays below 20 KB gzip, excluding code loaded
  after feedback activation.
- Avoid new raster hero media; the signature is built from semantic HTML, CSS,
  and the existing small brand assets.
- Remove cursor-tracked ambient work and unnecessary compositor promotion.
- Use opacity and transform only for motion that survives the reduced-motion
  gate.
- Preserve self-hosted font loading and prevent new render-blocking remote
  font or icon chains.
- Target lab LCP ≤2.5 seconds, CLS <0.1, and no long task introduced by the
  homepage interaction code.

## Verification

### Static and build checks

Run from the implementation branch:

```sh
CI=true pnpm build
pnpm check
```

Extend `scripts/verify-static.mjs` to assert:

- the homepage primary CTA points to `/quickstart`;
- story stage headings render;
- all five product names and canonical routes render;
- the condensed runtime proof renders;
- old competing hero/community-primary CTA copy is absent where replaced; and
- the existing GitHub, legal, asset, and quickstart checks still pass.

### Browser checks

Inspect production-preview output, not only the dev server:

- 1440×1000 dark and light;
- 1024×768 dark and light;
- 768×1024;
- 390×844;
- 320×568;
- short landscape handset;
- reduced motion;
- keyboard-only;
- JavaScript disabled; and
- system theme with both light and dark OS preference.

Exercise:

- desktop and mobile navigation;
- Escape close and focus restoration;
- familiar tabs;
- story anchors and passive scroll changes;
- product links;
- runtime-proof controls;
- copy success and clipboard failure;
- theme cycling;
- platform-aware download shortcut; and
- feedback success and SDK failure fallback.

Confirm:

- no console errors;
- no accidental horizontal overflow;
- no clipped commands or labels;
- no text hidden behind the sticky header or floating controls;
- no dark-on-dark light-theme console text;
- no content absent before scrolling or without JavaScript;
- no initial feedback SDK request; and
- focus order and visible focus match document order.

### Quality targets

- Lighthouse performance ≥90 on the mobile profile.
- Lighthouse accessibility, best practices, and SEO ≥95.
- WCAG AA contrast for both themes.
- CLS <0.1.
- Initial landing JavaScript <20 KB gzip before optional feedback code.

Targets are release gates, not claims about the current page.

## Content Rules

- Write from the visitor's side: what persists, what they control, and what
  success looks like.
- Prefer concrete actions and outcomes over adjectives such as “powerful,”
  “seamless,” or “revolutionary.”
- Use `familiar` after the first plain-language explanation of persistent
  agent.
- Clearly label illustrative ledger state.
- Do not imply OpenCoven owns provider credentials.
- Mark beta, preview, platform, and availability limitations literally.
- Do not duplicate the full quickstart or docs content on the homepage.
- Community is an invitation, not a prerequisite for setup.

## Non-Goals

- Rewriting the dedicated quickstart implementation.
- Redesigning `/github`, legal pages, or documentation.
- Adding accounts, telemetry, personalization, or browser-side install
  detection.
- Fetching unstable social metrics at runtime.
- Introducing React, a client router, or a new component framework.
- Changing product packaging, provider authentication, or runtime behavior.
- Generating decorative stock or AI imagery unrelated to the product.

## Acceptance Criteria

The design is implemented only when:

1. the primary homepage action leads to `/quickstart`;
2. the page follows the Summon → Remember → Move → Understand → Choose → Begin
   → Belong narrative without duplicate architecture/comparison sections;
3. the memory thread and ledger form one restrained signature interaction;
4. all five products render from the shared quickstart registry;
5. mobile replaces desktop diagrams with readable native flows;
6. light-theme terminal text is explicitly readable;
7. social controls no longer crowd the mobile header;
8. feedback code loads only after interaction;
9. core content and actions work without JavaScript and reduced motion;
10. build, static verification, interaction checks, viewport checks, and
    quality targets pass; and
11. unrelated routes and current quickstart behavior remain unchanged.
