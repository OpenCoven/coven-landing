import { defineConfig } from 'astro/config';

// Static landing site. Single page with island scripts.
// Output stays in dist/ so Vercel auto-detection just works.
export default defineConfig({
  site: 'https://opencoven.ai',
  output: 'static',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
