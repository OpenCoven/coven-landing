import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static landing site. Single page with island scripts.
// Output stays in dist/ so Vercel auto-detection just works.
export default defineConfig({
  site: 'https://opencoven.ai',
  output: 'static',
  compressHTML: true,
  integrations: [sitemap()],
  build: {
    // Inline all CSS to eliminate render-blocking stylesheet requests
    // (~900ms est. FCP savings on throttled connections).
    inlineStylesheets: 'always',
  },
});
