# Reforged Landing Design

## Source of truth

Implement `OpenCoven Landing - Reforged.dc.html` from Claude Design project
`c82cd393-6300-4545-8218-06c452d5a198`. The exported handoff and the live
Claude Design project are authoritative visual references. The production page
must be a native Astro implementation, not an embedded prototype.

## Page job

Explain OpenCoven to developers already using coding agents, then move them to
one of three concrete next steps: download Coven Cave, run the Coven CLI, or
read the source/docs. The page tells one continuous story: enter the threshold,
understand the local boundary, choose a surface, and run a first familiar.

## Visual system

- Background: `#050409` with restrained violet mist and a fine fixed dot field.
- Primary surfaces: translucent near-black panels with lavender hairlines.
- Accent family: `#7A6FB3`, `#9A8ECD`, `#B4AAEB`, `#C4B9F0`.
- Status color: `#30D158`.
- Display: Geist Variable. Body: Inter Variable. Evidence and commands:
  JetBrains Mono Variable.
- Radius: 12–20px for primary controls and panels.
- Signature: the scroll-controlled cave threshold. It is the only theatrical
  transition; the remaining page uses precise 2D diagrams and product UI.

## Narrative structure

1. Floating OpenCoven brand pill and scroll progress line.
2. Hero card: “Summon once. Remember forever.”, macOS/iOS downloads, docs and
   Discord links, plus the portal invitation.
3. Threshold: a layered cave aperture opens onto the supplied Coven Cave
   explainer. Production uses an optimized H.264/AAC MP4 and a generated poster
   frame instead of prototype editing instructions. Its ambient preview remains
   muted; audio is available only after explicit theater activation.
4. Runtime marquee: seven named harnesses using the seven exported image
   assets. Selecting one reveals its exact `coven run …` command and a copy
   control.
5. Boundary: three interactive layers—surface, runtime, project boundary—with
   the matching Cave, memory, or isolation proof artifact.
6. Surfaces: Coven Cave, Coven CLI, and Coven Code. Scroll or focus expands one
   surface at a time; all three remain readable and linked without JavaScript.
7. Invocation: the three canonical commands and their expected output. Scroll
   may advance the active command, while click/keyboard selection always works.
8. Closing summoning card, destination links, and compact footer.

## Production behavior

- JavaScript enhances complete server-rendered content. No information depends
  on IntersectionObserver, clipboard access, or scroll scripting.
- Copy controls announce exact success text. On clipboard failure, the command
  is selected and inline manual-copy guidance appears.
- Scroll stages use requestAnimationFrame and only mutate CSS custom
  properties/classes.
- Boundary and invocation controls are real buttons with roving keyboard
  selection where appropriate.
- Runtime chips are buttons, pause the marquee when selected/focused, and expose
  the corresponding command.
- The threshold preview requests muted playback only while near the viewport.
  Play opens a pure-black modal theater, restarts the explainer with audio and
  native controls, and explicit theater playback remains available when reduced
  motion is requested; reduced motion suppresses only the ambient loop.
- `prefers-reduced-motion: reduce` disables marquee, threshold transforms,
  reveals, and interpolation while leaving every section readable.
- Mobile removes pinned multi-viewport choreography and renders each section in
  normal document flow. Product and boundary cards become linear.
- The page remains dark-only as specified by the approved artifact; legacy
  homepage theme controls are removed from `/` while other routes retain their
  current behavior.

## Assets

Copy these handoff files into `public/reforged/` with stable kebab-case names:

- `claude-code-mascot.png`
- `codex-3d.png`
- `grok-3d.png`
- `openclaw-mascot.png`
- `opencode-3d.png`
- `uploads/IMG_8049.PNG` as `hermes-agent.png`
- `uploads/pasted-1785130722862-0.png` as `github-copilot.png`
- User-supplied Coven Cave explainer as `coven-cave-explainer.mp4`
- Generated explainer poster as `coven-cave-explainer-poster.webp`

No production code imports `support.js`; it is the Claude Design prototype
runtime and was read only to interpret its template/control-flow semantics.

## Verification contract

- Static verification checks the new narrative order, seven runtime assets,
  three surfaces, canonical commands, and initial-JavaScript budget.
- Browser tests cover runtime selection/copy, boundary keyboard selection,
  surface expansion, invocation progression, clipboard failure, no-JavaScript
  completeness, reduced motion, accessibility, and horizontal overflow at
  desktop/tablet/mobile sizes.
- Visual verification captures 1440×1000 and 390×844 screenshots at the hero,
  boundary, surfaces, invocation, and closing sections and compares them to the
  source tokens and layout measurements.
