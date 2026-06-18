import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://exifscrub.com',
  integrations: [react(), sitemap({
    filter: (page) => !page.includes('/404'),
  })],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: true,
    },
  },
});
