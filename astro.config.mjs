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
    inlineStylesheets: 'auto',
  },
});
