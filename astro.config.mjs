// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// The one place the production address lives. Change it here if the domain ever changes.
const SITE = 'https://john-beno.com';

export default defineConfig({
  site: SITE,
  // Clean URLs without a trailing slash: /about, /work/orient
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !/\/(404|impressum|privacy)$/.test(page) && !page.includes('/lab'),
    }),
  ],
  markdown: {
    // Code blocks in case studies follow light and dark mode.
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
  },
  image: {
    // Generate modern formats; Astro falls back gracefully.
    layout: 'constrained',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
