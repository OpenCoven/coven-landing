# Historical homepage checks

`reforged.ts` preserves the previous Reforged homepage suite, including its download card tests. That homepage and its selectors are absent on the production `landing` branch, so these tests are outside Playwright's `.spec.ts` discovery pattern. They are reference material, not passing evidence for the current site.

Current homepage, keyboard, no-JavaScript, reduced-motion, responsive, accessibility, stats, and copy contracts run in `../redesign.spec.ts`. Current platform download routing, saved installer bytes, and failed-proxy navigation run in `../downloads.spec.ts`. Quickstart contracts run in `../quickstart.spec.ts`. Historical theater, marquee, invocation, and download-card interactions do not describe this homepage.
