# OpenCoven landing public truth register

**Status:** transitional register for landing vNext  
**Last reviewed:** 2026-08-30  
**Successor:** the typed canonical public product registry tracked by issue #71

This file records the current public claims that are most likely to drift. It
is not a new authority for runtime or protocol behavior. Each claim remains
owned by the named canonical repository or release surface; the landing may
only reproduce what that source supports.

| Public claim | Current landing state | Canonical owner/evidence | Fail-closed fallback | Next review |
|---|---|---|---|---|
| Install the shared CLI with `npm install -g @opencoven/cli` | Current | `OpenCoven/coven` release/package guidance and `@opencoven/cli` package | Link to canonical first-run docs without reproducing an unverified command | Before every CLI release |
| Run `coven doctor`, then run `coven` from the intended project | Current; there is no public `coven init` step | `OpenCoven/coven` and organization onboarding | Say “Follow the current first-run guide” | Before every CLI release |
| Cave desktop downloads exist for macOS, Windows, and Linux | Current through `/download/:platform` resolver | `OpenCoven/coven-cave` latest release assets | Link to `releases/latest`; do not name an unavailable artifact | Every Cave release |
| Installer transfer is browser-native | Current since PR #87 | `coven-landing` `/download/:platform` resolver | Direct GitHub Releases link | On download-path changes |
| Checksums, detached signatures, notarization, or attestations | Display only when release metadata/evidence exists | `OpenCoven/coven-cave` release and attestation surfaces | Hide the unavailable evidence; never retain a stale positive badge | Every Cave release |
| Public analytics | Off by default; explicit event mode only | `coven-landing` PR #86 configuration and issue #69 | No analytics script | On provider, region, retention, or event-schema changes |
| Session replay and heatmaps | Disabled in approved launch mode | `coven-landing` analytics source and provisioner | Remain disabled | Requires separate business/legal approval |
| GitHub, Docs, Discord, X, npm, release, and repository destinations | Must resolve to real current destinations | Owning service/repository | Omit the link | Scheduled link scan and route changes |
| Product pages `/cave`, `/cli`, and `/code` | Not public | Issue #71/#72 route registry | Link to the real release, package, repository, or docs surface | When a real first-party page ships |
| Organization-wide stars/download/member counts | Optional dynamic proof | `/api/site-stats` source response | Empty value plus qualitative trust proof, never zero-valued negative proof | On stats-source changes |
| CastCodes | Historical/archive lineage, not a recommended current product | Portfolio decision and `OpenCoven/cast-codes` archive | Successor/archive notice only | Removal from active quickstart is required by #71 |
| Familiar identity, authority, continuity, Psyche, SPAR, and Cave ownership | Use only ratified, maturity-labelled language | Familiar Contract, Threads/Coven, Psyche, continuity profile, Cave | Describe current Coven coordination only | Issue #70 and every protocol claim change |

## Current known mismatch

The older `/quickstart` registry still renders CastCodes as one of five current
choices because its historical static verification contract is tightly coupled
to that page. This is **not accepted as final truth**. Issue #71 must replace
that array and its string-count verifier with a typed active/archive registry;
issue #79 then rebuilds Quickstart around one current foundation and four active
branches.

Until that migration lands:

- no new route or homepage card may promote CastCodes;
- no new CastCodes availability claim may be added;
- the archive status must remain explicit in planning and review;
- #68 cannot be considered complete solely because the other claims are fixed.

## Review rule

A public claim that cannot be verified must become unknown, hidden, or a link
to its canonical source. Stale marketing copy is never the fallback.
