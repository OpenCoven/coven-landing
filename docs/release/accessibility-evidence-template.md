# Landing vNext accessibility evidence template

This document is an **unfilled release-evidence template**. Automated Playwright, Axe, forced-colors, target-size, reflow, and reduced-motion results do not constitute VoiceOver, NVDA, TalkBack, physical-device, or user-validation sign-off.

Do not change a row to `pass` without recording the named device, operating system, browser, assistive technology, tested deployment, tester, date, and evidence location.

## Release identity

| Field | Value |
|---|---|
| Candidate commit SHA | _unverified_ |
| Preview or production URL | _unverified_ |
| Product registry revision | _unverified_ |
| Brand contract revision | _unverified_ |
| UI interaction-contract revision | _unverified_ |
| Test owner | _unassigned_ |
| Review date | _unverified_ |

## Required empirical matrix

| Surface | Minimum environment | Status | Tester | Evidence |
|---|---|---|---|---|
| Desktop screen reader | macOS + Safari + VoiceOver | unverified | — | — |
| Desktop screen reader | Windows + Firefox or Chrome + current NVDA | unverified | — | — |
| iPhone | Supported iPhone + Safari + VoiceOver | unverified | — | — |
| Android | Supported Android device + Chrome + TalkBack | unverified | — | — |
| High contrast | Windows High Contrast / forced colors in a real browser | unverified | — | — |
| Keyboard only | Desktop browser without pointer input | unverified | — | — |
| Text enlargement | Browser text size or zoom at 200% | unverified | — | — |
| Reflow | Equivalent 320 CSS-pixel viewport without document-level horizontal scrolling | unverified | — | — |

## Core task script

Run every task without implementation coaching. Record `pass`, `fail`, or `blocked`, plus the exact failure and route.

1. Reach the skip link as the first keyboard focus stop and move focus to main content.
2. Identify the current page and move among How it works, Protocol, Quickstart, GitHub, and Docs.
3. Open and close mobile navigation; confirm Escape returns focus to the Menu trigger.
4. Select system, light, and dark themes and confirm the choice remains understandable without relying on color alone.
5. Explain the difference between available runtime behavior and protocol direction on `/protocol`.
6. Read the three canonical Quickstart commands in order.
7. Copy a command; then repeat with clipboard permission denied and complete the manual-copy fallback.
8. Distinguish the four current products from the archived CastCodes successor record.
9. Follow the hosted-gated and public self-hosted GitHub paths without confusing waitlist access with general availability.
10. Read the security-reporting path and identify that vulnerability details must remain private.
11. Navigate Privacy and Terms by headings; inspect the privacy table without losing keyboard position.
12. Begin a supported Cave download and confirm the browser—not page JavaScript—owns the transfer.
13. Complete the guided proof without motion and identify the principal decision.
14. Return to the primary action from the end of each tested route.

## Per-environment receipt

### Environment

- **Status:** unverified
- **Tester:**
- **Date/time and timezone:**
- **Device model:**
- **Operating system and version:**
- **Browser and version:**
- **Assistive technology and version:**
- **Input method:**
- **Candidate SHA:**
- **Test URL:**

### Results

| Task | Result | Route/state | Observation | Evidence |
|---:|---|---|---|---|
| 1 | unverified | — | — | — |
| 2 | unverified | — | — | — |
| 3 | unverified | — | — | — |
| 4 | unverified | — | — | — |
| 5 | unverified | — | — | — |
| 6 | unverified | — | — | — |
| 7 | unverified | — | — | — |
| 8 | unverified | — | — | — |
| 9 | unverified | — | — | — |
| 10 | unverified | — | — | — |
| 11 | unverified | — | — | — |
| 12 | unverified | — | — | — |
| 13 | unverified | — | — | — |
| 14 | unverified | — | — | — |

### Findings

| Severity | Finding | Reproduction | Owner | Tracking issue | Disposition |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

### Sign-off

- [ ] No critical or serious assistive-technology blocker remains.
- [ ] Focus order and visible focus are coherent.
- [ ] Labels, roles, names, states, and live announcements are accurate.
- [ ] Information remains complete with reduced motion and without JavaScript.
- [ ] Status and authority are understandable without color alone.
- [ ] Any exception has a named owner, accepted risk, expiry, and rollback trigger.

**Reviewer:** _unverified_  
**Decision:** _unverified — not approved for release_  
**Evidence bundle:** _unverified_

## Release rule

Issue #81 must remain open until the required empirical environments have completed receipts and every launch-blocking finding is resolved or explicitly blocks release. Issue #82 automation may prove repeatability across engines; it may not substitute for this matrix.
