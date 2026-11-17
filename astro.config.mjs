import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://learn.gemula.org',
  integrations: [preact()],
  build: { inlineStylesheets: 'auto' }
});
