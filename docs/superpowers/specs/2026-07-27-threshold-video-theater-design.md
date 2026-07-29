# Threshold Video Theater Design

## Status

Approved on 2026-07-27. This design extends the Reforged landing threshold
without changing the surrounding narrative or scroll choreography.

## Goal

Pressing the threshold Play control gives the supplied Coven Cave explainer the
entire visual and interaction hierarchy. The video restarts from the beginning,
plays with audio, exposes standard media controls, and remains the only
prominent content until the viewer exits.

## Current seam

The threshold currently renders one decorative, muted, looping inline video
inside `.threshold__window`. JavaScript starts and pauses that preview according
to viewport visibility, page visibility, and reduced-motion preference. The
circular Play control still navigates to `#runtimes`, and the optimized MP4 has
no audio track.

The theater feature stays within:

- `src/components/reforged/Threshold.astro`
- `src/styles/reforged.css`
- `src/scripts/reforged.js`
- `tests/reforged.spec.ts`
- `scripts/verify-static.mjs`
- `public/reforged/coven-cave-explainer.mp4`

## Architecture

Render a native modal `<dialog>` adjacent to the threshold content. The dialog
contains:

- a visually hidden accessible title;
- a dedicated `<video>` using the same optimized MP4 as the inline preview;
- native controls, inline playback support, and metadata preloading;
- a restrained close button for pointer and touch users.

The ambient and theater players are separate elements with separate state. The
browser can reuse the shared media URL from cache, while the implementation
avoids moving one DOM node between the scroll stage and the top layer.

Keep the Play control as an anchor whose `href` points directly to the MP4.
After JavaScript wires the dialog successfully, it intercepts the link and opens
the theater. Without JavaScript, the link opens the media resource in the
browser's native player instead of becoming a dead control.

## Visual design

The open dialog occupies the viewport top layer with a pure-black background.
It removes the landing page, cave rings, headings, and navigation from the
visual hierarchy.

The video is the largest centered 16:9 rectangle that fits within the viewport:

- desktop uses restrained outer breathing room and a near-square corner radius;
- mobile uses the available width and dynamic viewport height;
- black letterboxing is acceptable when viewport and video ratios differ;
- the only persistent non-video affordance is a quiet close button in the safe
  top-right area;
- native media controls appear over the video using browser behavior.

There is no decorative entrance animation. Reduced-motion and normal-motion
users receive the same immediate transition into the black theater.

## Open lifecycle

The Play activation is a trusted user gesture. In this order, the controller:

1. prevents the fallback link navigation;
2. records the Play control for focus restoration;
3. marks theater mode active so the ambient controller cannot resume;
4. pauses the ambient preview;
5. opens the dialog with `showModal()`;
6. sets theater playback to `0:00`;
7. unmutes the theater video;
8. focuses the theater video without scrolling;
9. requests playback.

The theater video does not loop. When it reaches the end, the dialog remains
open on the final frame with controls available.

## While open

Native dialog modality makes the rest of the document inert. Page scrolling is
locked explicitly to avoid mobile background movement.

Standard controls provide pause, seek, volume, and browser fullscreen actions.
Clicking the black backdrop does nothing. If the document becomes hidden, the
theater video pauses and does not resume automatically when the viewer returns;
the user can resume through the visible controls.

Reduced-motion preference continues to suppress the ambient loop. It does not
block theater playback because the viewer explicitly requested the video.

## Close lifecycle

`Escape` and the visible close button are the only dismissal paths. Both use
one close routine that:

1. pauses theater playback;
2. resets theater playback to `0:00`;
3. mutes the theater player defensively;
4. closes the dialog and releases scroll lock;
5. clears theater-active state;
6. restores focus to the Play control;
7. asks the existing ambient controller to resume only when the preview is in
   view, the document is visible, and reduced motion is not requested.

Backdrop clicks never invoke the close routine.

## Failure behavior

If `showModal()` is unavailable or fails, the controller follows the Play
anchor to the MP4 fallback.

If `video.play()` rejects, the theater remains open, unmuted, focused, and
equipped with standard controls so the viewer can press Play manually. No error
toast competes with the video.

If audio or media loading fails, the native player exposes its normal failure
state. The close paths and focus restoration must continue to work.

## Media asset

Regenerate `public/reforged/coven-cave-explainer.mp4` from the supplied original
as a web-optimized H.264/AAC MP4:

- 1280×720 H.264 High profile;
- YUV 4:2:0 pixel format;
- original stereo audio retained as AAC;
- fast-start metadata for progressive playback.

The poster remains
`public/reforged/coven-cave-explainer-poster.webp`. The supplied original in
Downloads remains untouched.

## Accessibility

- The dialog has an accessible name without adding visible competing copy.
- The theater video is keyboard-focusable and receives initial focus.
- Native dialog modality keeps focus inside the theater.
- The close button has an explicit accessible label and a visible focus ring.
- `Escape` closes the theater and focus returns to the triggering Play control.
- The inline ambient preview remains decorative and muted.
- The fallback MP4 link remains operable without JavaScript.

## Verification

Browser tests must prove:

- the Play control exposes the MP4 fallback and dialog relationship;
- activation opens a modal dialog, restarts at `0:00`, unmutes, requests
  playback, and focuses the theater video;
- the ambient preview is paused while theater mode is active;
- native controls are present and theater playback does not loop;
- backdrop clicks do not dismiss;
- `Escape` pauses, resets, mutes, closes, restores focus, and conditionally
  resumes the ambient preview;
- a rejected playback request leaves an open, focused, usable player;
- reduced-motion users can explicitly open and play the theater while the
  ambient preview remains paused;
- no-JavaScript rendering retains a working direct-media link;
- desktop and mobile theater geometry has no overflow;
- the completed page has no serious accessibility violations.

Static verification must confirm the MP4 and poster exist and are rendered.
`ffprobe` must confirm that the production MP4 contains both H.264 video and AAC
audio streams. Final verification runs the build, static checks, full browser
suite, JavaScript syntax check, and `git diff --check`.

## Out of scope

- custom media controls;
- captions or a transcript not present in the supplied source;
- automatic browser fullscreen;
- backdrop-click dismissal;
- autoplay with audio before a user gesture;
- changes to other landing sections or their scroll choreography.
