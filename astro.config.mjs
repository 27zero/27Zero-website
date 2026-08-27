// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  /* Placeholder de Netlify, no el dominio final. `site` es obligatorio para que
     `@astrojs/sitemap` emita URLs absolutas (sin él tira warning y no genera nada),
     y es la base del `canonical` cuando `settings.siteUrl` está vacío en Sanity.
     TODO (Etapa 9): cambiar a 'https://27zero.agency' al hacer el swap de dominio
     desde Webflow — ver PLANNING.md §3, "Etapa 9 flags". */
  site: 'https://27zero-web.netlify.app',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
