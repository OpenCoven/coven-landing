# Architectural Hero Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, followed by one independent whole-branch review.

**Goal:** Replace unused desktop hero space with a polished architectural render and a denser responsive layout.

**Architecture:** Astro authors the layout, poster and controls. A small lifecycle controller conditionally imports a local Three.js scene; all useful content remains static.

**Tech Stack:** Astro, CSS, Three.js, Playwright, Node 22, pnpm 10.

**Spec:** `docs/superpowers/specs/2026-11-12-architectural-hero-design.md`

## Global Constraints

Keep the mark flat, claims unchanged, downloads functioning and initial JavaScript below 120 KiB gzip. No remote scene resources, frameworks or deployment changes. Use normal source paragraphs, semantic controls and explicit data attributes for responsive layout.

## Review Focus

Module/WebGL failure retains poster; reduced-motion changes stop rendering; pause survives visibility changes; small screens never load the scene; context loss stops the loop and restores poster.

### Task 1: Responsive hero and architectural scene

**Files:** `src/components/redesign/{RedesignHero,HeroSculpture,RedesignNav,BoardSection,Outcomes,FinalCta,RedesignFooter}.astro`, `src/styles/{redesign,hero}.css`, `src/scripts/redesign/{landing,sculpture,sculpture-scene}.js`, `public/hero/`, `package.json`, `pnpm-lock.yaml`, `tests/hero.spec.ts`.

- [x] Add failing browser coverage for expanded desktop layout, renderer/poster selection, pause, context loss and no overflow.
- [x] Implement the authored layout and controller `initSculpture()`, consuming `mountSculpture(stage)` from the dynamically loaded scene module.
- [x] Implement `mountSculpture(stage)` returning `{ render(time, pointer), resize(), dispose() }` with local procedural beveled geometry and studio lighting.
- [x] Capture and optimize the scene poster, then verify visual composition at 320, 720, 1440, 1920 and 2560 px in both themes.
- [x] Run targeted browser checks; commit implementation and evidence notes.

### Task 2: Verification and review

**Files:** `tests/{hero,redesign}.spec.ts`, design/plan completion notes.

- [x] Update the former single-column assertion to test the approved composition while retaining the board-above-fold contract.
- [x] Run frozen install, build, static checks, Worker tests and complete browser suite on Node 22 / pnpm 10.
- [x] Request independent whole-branch review; address material findings and rerun affected checks.
- [x] Record results, limitations and exact candidate; retain a reviewable local branch.

## Completion

Implemented inline and independently reviewed. Review findings for the accessible resume label and secondary-route container scope were reproduced and fixed. The mobile action-before-art regression was also reproduced and fixed. No deferred reviewer findings remain.

Node 22.23.5 / pnpm 10.34.9: frozen install, build, static checks, 10 Worker tests and all 46 current browser tests passed with retries disabled. The reduced-motion transition additionally passed five repeat runs. Initial JavaScript is 32,733 gzip bytes; the optional scene is 141.57 kB gzip. Evidence remains in `/tmp/hero-release-checks.log`, `/tmp/hero-final-verification.log`, `/tmp/coven-hero-final-desktop.png`, `/tmp/coven-hero-final-mobile.png`, and the worktree's ignored Playwright report/results directories.

Ruling: package this as a reviewable feature branch/PR; production publication remains a separate action. This preserves review of the visible redesign before production changes, at the cost of delaying public availability until landing is authorized.
