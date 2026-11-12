# Architectural hero

The user approved a wider desktop hero with tighter spacing and a separate architectural 3D object. The live audit at landing commit `ca47fbc` measured a 1,140 px content width and board top of 530 px at 1440, 1920 and 2560 px. The unused hero right column and fixed measure make larger screens feel empty.

Use an aligned, fluid content measure capped at 1,440 px inside a 1,504 px padded container, a readable left copy column, and interlocking beveled graphite/violet/ivory frames on the right. Tighten the hero so the board remains visible at 900 px viewport height. Keep public product wording and download behavior in scope only for preserving existing interactions. On small screens prioritize copy and actions, with a compact illustration afterward.

Approaches considered: sculpting the mark was rejected because the canonical brand web profile requires a flat monochrome mark; reusing the former braid would restore its oversized staging and remote imports. The approved architectural object is distinct from the mark and from a product screenshot. It implies no new runtime guarantee.

Use bundled Three.js behind a dynamic import. A static poster is present in authored HTML; no information depends on WebGL. Reduced motion and small screens use the poster without loading the renderer. Autoplay has a visible pause control, stops offscreen/in hidden tabs, and stops on context loss. Pointer response is bounded. Preserve pause choice across visibility changes and react to reduced-motion changes. Cap pixel ratio and frame rate. Retain the initial JavaScript budget and avoid third-party render requests. Support both themes, keyboard, no JavaScript and 320 px reflow.

Canonical visual evidence: `OpenCoven/brand` at `798e2f5f2f1a69f5d156ccc0a9aafc4f7da55fc8`, `web/profile.json` and `docs/WEB-SURFACE-PROFILE.md`. 3D is local, progressive, pauseable and render-independent; the mark stays flat. Public semantics stay with their existing owners. No analytics, authority, API, Worker, release or production configuration change.

Acceptance: real rendered 3D on capable desktop; stable poster for no-JavaScript, reduced-motion, mobile, failed module and lost WebGL; accessible pause/resume; wider aligned desktop composition with visible board; no overflow from 320 through 2560 px; green build/static/Worker/current browser checks. Production publication is a separate action from this implementation.

## Implemented audit result

The desktop board starts at 488 px (previously 530 px) at 1440, 1920 and 2560 px widths. The primary content grows from 1140 to 1440 px at large widths. Both themes were rendered at 320, 720, 1024, 1440, 1920 and 2560 px without horizontal overflow. Phone copy and actions precede the compact illustration. Shared secondary chrome retains its previous 1140 px content measure.

The poster is a transparent 21 KiB WebP exported from the same scene with `node scripts/render-hero-poster.mjs <local-preview-origin>`. Initial homepage JavaScript is approximately 32 KiB gzip; the optional desktop scene is approximately 138 KiB gzip and is not requested on mobile or reduced-motion entry. No new third-party render requests are made.
