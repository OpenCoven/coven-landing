# OpenCoven public positioning and capability-maturity decision

- **Status:** Accepted for landing vNext implementation
- **Date:** 2026-08-30
- **Decision owner:** OpenCoven
- **Applies to:** `opencoven.ai`, public product summaries, route metadata, social cards, and landing-linked onboarding
- **Primary tracking issue:** #70
- **Successor interfaces:** typed product/onboarding registry in #71 and canonical site shell in #72

## Decision

OpenCoven will be positioned as **identity-preserving familiar infrastructure**:
software and protocols for agents that can retain a governed identity,
continuity evidence, and bounded authority across the surfaces where they work.

The primary public promise is:

> **Continuity for agents. Authority for their principal.**

The strongest current proof is narrower and must remain explicit:

> Coven coordinates local agent sessions through shared claims, durable records,
and human-approved guards.

Cave, Code, the CLI/runtime, and GitHub are product surfaces over that trust
model. No one surface defines the whole category.

This decision separates category direction from implementation maturity. The
landing may explain the intended identity → authority → orchestration → runtime
→ product stack, but every material capability must carry one approved maturity
label and evidence boundary.

## Why this decision exists

The current homepage is a strong explanation of parallel coding-session
coordination and Cave installation, but it can be read as if OpenCoven were only
one of the following:

- a file-locking or collision-prevention tool;
- a local daemon wrapper;
- a Cave desktop download;
- a generic multi-agent control plane.

Those descriptions are useful proof points, not the OpenCoven category. The
public site needs to explain why a familiar remains attributable, governed, and
inspectable while avoiding claims that continuity, federation, principal
authorization, or conformance are complete before the responsible repositories
prove them.

## Canonical ownership boundaries

Public language must preserve these boundaries:

1. **Familiar Contract** defines the governed familiar self: its stable root,
   declared scope, memory boundary, principal binding, and protected identity
   fields.
2. **Threads and Coven** remain the protected mutation and runtime authority.
   Marketing must not imply that a continuity index or orchestration client can
   authorize protected changes by itself.
3. **Psyche** snapshots authorized identity into orchestrated work. It does not
   create or redefine familiar identity.
4. **SPAR Familiar Continuity Profile** describes how identity revisions,
   embodiments, receipts, and temporal relationships can be queried and
   reconstructed. It is not a standalone shared database, IAM replacement,
   broad schema namespace, sixth canonical ledger, or new public product.
5. **Coven** owns daemon authority, persistence, session lifecycle, and local
   runtime execution.
6. **Cave** owns the primary human oversight experience and makes provenance,
   pending proposals, active embodiments, stale replicas, and uncertainty
   legible.
7. **Code** owns terminal-first interactive coding execution.
8. **OpenCoven for GitHub** owns GitHub-triggered familiar delivery and its
   deployment profiles.
9. **`brand`** owns visual identity and voice. **`ui`** owns reusable
   interaction/design contracts. `coven-landing` owns their static public-web
   application, not a second canonical design system.

A public statement that contradicts these boundaries is invalid even if it is
more concise or marketable.

## Normative definitions

### OpenCoven

An open-source, local-first stack for building and operating principal-bound AI
familiars across runtimes and product surfaces with inspectable identity,
authority, continuity evidence, and human oversight.

### Familiar

An agent identity with a stable governed root, declared scope and memory
boundary, bounded capabilities, attributable revisions, and an explicit binding
to the principal authorized to approve protected change.

“Familiar” is product language. It does not imply legal personhood,
consciousness, ownership, fiduciary status, independent agency, or unrestricted
continuity.

### Principal

The authenticated human or organization whose authority governs the familiar’s
protected identity and actions. A display name or configuration string is not
sufficient principal authorization.

### Principal Binding

The normative relationship between a familiar root and the stable principal
identity authorized to approve protected changes. Public copy may use “bound to
you,” “authorized by you,” or “under your authority” when the surrounding
context makes the technical meaning clear.

### Familiar Contract

The canonical identity contract describing what a familiar is, which fields are
protected, and what it cannot autonomously change. It is a technical protocol
contract, not by itself a bilateral legal agreement, full privacy framework,
complete runtime security standard, or unrestricted safety certification.

### Identity

The protected, attributable declaration of which familiar is being embodied,
including its stable root and exact authorized revision. Identity is distinct
from the current process, model session, device, task, or memory projection.

### Authority

The authenticated, operation-specific right to propose or commit a protected
change. Authority includes verification, policy, approval, replay protection,
commit semantics, and evidence. Possessing context about a familiar does not
confer authority over it.

### Continuity

The evidence-backed determination that a later embodiment or revision is the
same familiar, a successor, a fork, a restored historical state, or a different
root. Continuity is not the same as copying a prompt, memory file, model state,
or display name.

### SPAR Familiar Continuity Profile

A continuity profile and query plane for identity revisions, embodiments,
transition receipts, temporal relationships, staleness, replay, revocation, and
historical reconstruction. It consumes canonical identity and authority
artifacts; it does not replace them.

### Psyche

The orchestration/control protocol that correlates tasks, lanes, leases,
approvals, receipts, recovery, and authorized familiar snapshots. Psyche must
not infer identity authority from task text or caller-supplied labels.

### Coven runtime

The local daemon and runtime authority responsible for durable session state,
claims, execution, persistence, and enforcement at the local project boundary.

### Cave

The visual oversight surface for projects, familiars, sessions, evidence,
approvals, provenance, continuity state, and recovery.

### Coven Code

The interactive terminal coding surface using the shared OpenCoven runtime and
provider-backed harnesses.

### OpenCoven for GitHub

The GitHub-triggered delivery surface that connects bounded issues to familiar
execution, status evidence, Check Runs, draft pull requests when commits exist,
and Cave oversight.

## Approved category and message hierarchy

Every public page should inherit this order even when it emphasizes one product:

1. **Category** — identity-preserving familiar infrastructure.
2. **Promise** — continuity for agents; authority for their principal.
3. **Current proof** — local coordination through claims, durable records,
   evidence, and human-approved guards.
4. **Surface** — the specific product or protocol route relevant to the visitor.
5. **Action** — one verified next step.

Pages may begin at level 3 or 4 when intent is already narrow, but they must not
contradict levels 1 and 2.

## Approved homepage direction

### Primary headline

> **Give your agents continuity. Keep authority local.**

### Supporting paragraph

> OpenCoven turns disposable agent sessions into familiar identities that can
> carry memory, provenance, and permissions across the tools you already use.
> Today, Coven coordinates local work through shared claims, inspectable
> records, and human-approved guards.

The first sentence is category direction. The second sentence is current proof.
The visual treatment must preserve that distinction with maturity labels and
evidence links.

### Alternate brand line

> **Familiars that remain themselves. Authority that remains yours.**

Use only where adjacent copy immediately defines “remain themselves” through
root, revision, embodiment, and evidence rather than implying metaphysical or
perfect continuity.

### Primary action

**Start locally**

The action resolves through registry-backed current choices, initially:

- Install the CLI/runtime.
- Download Cave.
- Read the canonical Quickstart.

### Secondary action

**See how familiar identity works**

This points to the canonical protocol/current-runtime explanation chosen under
#80, not to an unlabelled simulated application.

### Final call to action

> **Start with one project. Keep the familiar that grows from it.**

Primary action: **Start locally**. Secondary action: a verified Docs or
community destination.

## Audience and intent map

### Individual developer with one coding harness

Needs to know:

- OpenCoven works with the harness they already use.
- The first step is local and reversible.
- `npm install -g @opencoven/cli`, `coven doctor`, then `coven` is the current
  shared foundation.
- No `coven init` step is part of current public onboarding.

Primary route: homepage → Start locally → Quickstart/CLI.

### Developer coordinating multiple local sessions

Needs to know:

- claims and a shared record prevent silent overlap;
- each session remains attributable;
- protected actions can wait for principal approval;
- Cave provides oversight without becoming a second runtime authority.

Primary route: homepage → current proof → Cave/runtime.

### Familiar identity or protocol evaluator

Needs to know:

- identity, authority, continuity, orchestration, runtime, and UI are separate;
- SPAR is a profile/query plane;
- conformance claims are profile-scoped;
- protocol direction is not marketed as shipped runtime behavior.

Primary route: homepage → Protocol → canonical specifications and evidence.

### Open-source contributor

Needs to know:

- which repository owns each domain;
- current maturity and verification commands;
- how to contribute without duplicating authority;
- where schemas, vectors, issues, and security reporting live.

Primary route: Developers/Project → repository or docs.

### Team or enterprise evaluator

Needs to know:

- what is local today;
- which team/cloud capabilities are gated or planned;
- what principal authorization and audit evidence mean;
- current security, privacy, retention, and support facts;
- no certification or compliance claim exceeds evidence.

Primary route: Protocol/Security/GitHub status; no unsupported sales promise.

### Product-intent visitor

A visitor arriving specifically for Cave, Code, GitHub, or the CLI should reach
one verified product destination with:

- job to be done;
- current maturity;
- platforms;
- first step;
- limitations;
- canonical docs/repository/security evidence;
- one primary action.

## Maturity labels

### Available now

Use only when the current released product or deployed site supports the claim
and a repeatable proof path exists.

### Beta

Implemented and usable, but compatibility, UX, support, or contract stability is
not yet guaranteed. Name the relevant limitation where reliance matters.

### Experimental

An implementation exists for evaluation, but it is not a stable product or
protocol commitment.

### Protocol direction

A ratified or proposed architecture/specification direction that may guide
implementation but must not be represented as an available product capability.

### Planned / gated

The capability depends on unresolved conformance, security, privacy,
infrastructure, credentials, or business decisions. It is not generally
available.

### Archived

Historical lineage retained for provenance, compatibility, or reference. It is
not a recommended current start path.

### Unknown

Evidence is missing, contradictory, stale, or not available to the landing.
Unknown claims are omitted or linked to the canonical source; stale wording is
not retained.

## Capability-maturity claim matrix

| Capability or public claim | Approved status | Canonical owner/evidence | Approved public wording | Fail-closed fallback | Prohibited overclaim |
|---|---|---|---|---|---|
| Install shared CLI/runtime from npm | Available now | `OpenCoven/coven`, package/release guidance | “Install the shared OpenCoven runtime.” | Link to current first-run docs | “One command fully configures every provider and product.” |
| `coven doctor` and `coven` first-run path | Available now | Coven CLI behavior and canonical onboarding | Show the exact three-command foundation | Link to first-run docs | Any `coven init` instruction without a verified runtime change |
| Local project/session persistence | Available now / beta contract | Coven daemon persistence and current product evidence | “Session and claim state remains available through the local runtime.” | “Current local runtime state” | “Your familiar can never lose memory.” |
| Shared local record across sessions | Beta | Coven runtime/current demo evidence | “Sessions working in one project can share an inspectable record.” | Describe one-session local use | “Every agent and device always shares one global truth.” |
| Collision/claim hold before conflicting write | Beta | Coven claims/guard behavior | “Coven can hold overlapping work and record why.” | Omit interactive claim | “No agent can ever overwrite another.” |
| Human-approved protected action | Beta, operation-specific | Threads/Coven authority paths | “Protected actions can wait for your approval with evidence.” | “Human review remains required” | “Every tool action is cryptographically guaranteed safe.” |
| Cave desktop app | Available now subject to current release assets | `OpenCoven/coven-cave` releases | “Download Cave for a supported desktop platform.” | Link to latest releases | Hard-coded availability/version when release evidence is missing |
| Cave iOS companion | Beta / gated by current TestFlight and desktop host | Cave release/onboarding evidence | “Optional iOS companion when the current TestFlight path is available.” | Omit TestFlight action | “Full local daemon runs on iPhone.” |
| Coven Code | Beta | `OpenCoven/coven-code` and current CLI integration | “Interactive coding cockpit using the shared runtime.” | Link to canonical repository/docs | “Stable universal coding environment across all providers.” |
| OpenCoven for GitHub self-host path | Beta | `OpenCoven/coven-github` docs and deployment profile | “Self-host the GitHub delivery adapter.” | Link to repository | “Install once and any issue automatically becomes a verified PR.” |
| Hosted GitHub access | Gated beta | Current verified waitlist/access process | “Join the hosted beta” only while the process exists | Offer self-host/docs path | “Start a free trial now” without a functioning entitlement flow |
| Familiar Contract identity root | Protocol direction / specification | `familiar-contract` | “The Familiar Contract defines the governed familiar self.” | Link to specification | “Every OpenCoven product is fully Familiar Contract conformant.” |
| Principal Binding | Protocol requirement; implementation maturity varies | Familiar Contract and runtime-authority work | “Protected identity is bound to an authenticated principal.” | “Principal approval is required” | “A person name in config proves ownership.” |
| Universal exact root/revision session binding | In development | Familiar Contract, Coven, Psyche conformance | “OpenCoven is standardizing exact familiar revision binding.” | Describe current attributable session only | “The same familiar is cryptographically proven across every launch.” |
| SPAR continuity profile | Protocol direction / in development | continuity decision documents and owning schema work | “A continuity profile can reconstruct which familiar revision was embodied.” | Link to architecture direction | “SPAR is OpenCoven’s shared identity database.” |
| Cross-session identity revision continuity | In development | Familiar Contract/SPAR vectors | “Revision and transition evidence is being standardized.” | Do not claim continuity beyond current session evidence | “The agent remains exactly the same forever.” |
| Cross-device staleness, revocation, replay, and replica purge | Planned / gated conformance | continuity/privacy profiles | “Cross-device continuity requires explicit staleness and revocation semantics.” | Omit cross-device promise | “All devices always have the latest familiar.” |
| Psyche orchestration | In development / beta by surface | `OpenCoven/psyche` and conforming clients | “Psyche coordinates authorized work snapshots, tasks, lanes, leases, approvals, and receipts.” | Describe current product-local orchestration | “Psyche creates or owns familiar identity.” |
| Team/cloud synchronization | Planned / gated | future deployment/conformance evidence | “Team and cloud synchronization are gated by authority, privacy, and conformance work.” | Local-first only | “Your familiar already follows you everywhere.” |
| Local-first | Available for named local components, not a universal data claim | Coven/Cave architecture and route data flow | “The runtime and project authority run locally” with surface-specific caveats | Name the exact local component | “OpenCoven never sends any data anywhere.” |
| Open source | Available for named public repositories/licenses | owning repositories | “Open source” with repository link | Omit when license/status is unclear | “Every OpenCoven service and dependency is open source.” |
| Model/harness agnostic | Beta / supported set | Coven runtime adapters and runtime registry | “Works with supported harnesses; the registry can expand.” | Name verified harnesses | “Works with every model and agent.” |
| Signed/checksummed/verifiable builds | Available only per artifact evidence | Cave release assets/attestations | Show exact checksum/signature/attestation when present | Hide unavailable evidence | Persistent “signed/notarized” badge without current evidence |
| Public analytics | Off by default; event mode only if approved/configured | landing #86/#69 | “Limited explicit event analytics when enabled” plus provider/retention notice | No script | “Anonymous aggregate analytics” without technical/legal proof |
| Session replay/heatmaps | Disabled | landing analytics contract | Do not market as active | Remain off | Silent activation or “masked means private” |
| CastCodes | Archived | portfolio decision and historical repository | “Historical predecessor/lineage” only where needed | Omit | Any recommended current product or first-run path |
| Full protocol conformance/certification | Not claimed | future independent profile evidence | Name an exact tested profile only | “Conformance work is in progress” | “OpenCoven compliant,” “fully secure,” or universal certification |

## Product summaries for the canonical registry

These are content inputs for #71; status and destinations remain registry data,
not hard-coded page truth.

### Coven CLI/runtime

**Job:** local runtime, diagnostics, daemon control, and terminal entry.  
**Default status language:** Recommended foundation / available current path.  
**Primary action:** Install or read Quickstart.

### Coven Code

**Job:** interactive coding-agent cockpit inside an existing project.  
**Default status language:** Beta.  
**Primary action:** Open canonical guide or repository.

### Coven Cave

**Job:** visual human oversight for projects, familiars, sessions, evidence, and
approvals.  
**Default status language:** Native desktop app; platform availability derived
from current release evidence.  
**Primary action:** Browser-native platform download.

### OpenCoven for GitHub

**Job:** bounded issue-to-status/Check Run/draft-PR delivery with Cave oversight.  
**Default status language:** Beta; explicitly distinguish hosted-gated and
self-hosted paths.  
**Primary action:** Verified hosted-access or self-hosting destination.

## Approved trust language

Prefer specific, inspectable statements:

- “The runtime runs on your machine.”
- “Protected actions can wait for your approval.”
- “This release publishes a SHA-256 digest.”
- “This session is bound to familiar root X and revision Y.”
- “The second write is held because the surface is already claimed.”
- “Analytics is off in this deployment.”

Avoid unsupported abstractions:

- “Military-grade security.”
- “Zero trust” without a defined model.
- “Private by default” without naming data flows and defaults.
- “Own your AI” as normative identity/authority language.
- “The same AI everywhere.”
- “Never forgets.”
- “Fully autonomous.”
- “Fully compliant.”
- “Unhackable,” “safe,” or “guaranteed.”

## Voice rules

- Clear before clever.
- Technically grounded.
- Emotionally resonant without pretending implementation is mythology.
- Familiar, ritual, ward, thread, memory, and continuity language must reduce
  conceptual complexity rather than conceal it.
- Every magical metaphor gets an adjacent technical explanation.
- Prefer one concrete example over several abstract adjectives.
- Avoid competitor-shaped fear language or claims that ordinary agent products
  are inherently unsafe.

## Information architecture labels

### Product

- Cave
- Code
- GitHub
- CLI/runtime

### Protocol

- Familiar identity
- Authority and Threads
- Continuity
- Architecture

### Developers

- Quickstart
- Docs
- SDK/schemas only when current
- Contributing

### Community

- GitHub
- Discord
- X

The global primary action is **Start locally**. Nonexistent destinations are
omitted; no hidden navigation link is treated as a placeholder product page.

## SEO and social summary inputs

### Site title direction

**OpenCoven — Identity-preserving infrastructure for AI familiars**

### Site description direction

**Build principal-bound AI familiars with inspectable identity, continuity
evidence, local runtime authority, and human-approved protected changes.**

Metadata must not claim all continuity or authority profiles are fully
implemented. Product pages may use narrower, evidence-backed descriptions.

## Comprehension validation protocol

Before #75 copy is treated as final, test the wire copy with first-time visitors
from the audience map. Do not show the current full board simulation during the
first pass.

After the intended homepage reading path, ask participants to answer without
prompting:

1. What is OpenCoven?
2. What does “familiar” mean here?
3. What works today?
4. What remains under the principal’s authority?
5. What is protocol direction rather than shipped behavior?
6. Which product or start path fits you?
7. What would you install first?

Record exact answers, misunderstandings, participant profile, and the copy
revision tested. The release target is at least 90% accurate answers to the
four core questions defined in #83. Confusing or partially correct answers are
findings, not conversions.

## Implementation requirements

- #71 must encode product status and destinations in one typed registry.
- #72 must consume the approved IA and one global action.
- #75 must preserve the category/current-proof distinction in the hero and
  section order.
- #76 must demonstrate only evidence-backed collision → hold → principal
  decision behavior.
- #79 and #80 must use these definitions and maturity labels across product,
  protocol, legal, security, and maturity routes.
- #82 must fail CI when an active public claim lacks an allowed maturity,
  owner, evidence source, or real destination.
- Material wording changes require updating this decision or its approved
  successor; page-local copy must not silently redefine the architecture.

## Review triggers

Re-review this decision when any of the following occurs:

- Familiar Contract, Threads, Psyche, Coven, or SPAR ownership changes;
- a continuity/conformance profile reaches a new release stage;
- a product changes availability or canonical destination;
- team/cloud synchronization becomes generally available;
- principal authorization or device-revocation semantics materially change;
- analytics, privacy, pricing, support, or hosted-access behavior changes;
- a new top-level product is proposed for public navigation.

Unknown or expired claims fail closed: omit them or link to the canonical source
until they are reverified.
