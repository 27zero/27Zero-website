// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { existsSync } from 'node:fs';
import { fetchNoIndexPaths, normalizePath } from './src/lib/seo/noIndexRoutes';

/* `process.env` primero y `.env` después, en ese orden y no al revés: en Netlify las
   variables llegan por el entorno del build y no existe ningún `.env` en el repo
   (CLAUDE.md §2). El archivo es solo el caso local.

   No se usa `loadEnv` de Vite porque `vite` no es dependencia directa del proyecto —
   importarlo desde el config falla con el node_modules estricto de pnpm. */
if (existsSync('.env')) process.loadEnvFile('.env');

const { SANITY_PROJECT_ID, SANITY_DATASET } = process.env;

/* Misma fecha fija que `lib/sanity/client.ts` — ver la nota ahí sobre por qué nunca
   va `new Date()`. */
const SANITY_API_VERSION = '2026-08-20';

/**
 * Rutas con `seo.noIndex: true`, que no deben entrar al sitemap.
 *
 * Se llena en `astro:build:start` y la lee el `filter` de sitemap por closure, en
 * `astro:build:done`. Se hace con una integración y no con un `await` al tope del
 * archivo para que la query corra SOLO en build: un top-level await la dispararía
 * también en `astro check`, `astro dev` y `astro sync`, sumando latencia a cada
 * comando y rompiendo el config entero cuando no hay red o falta el `.env`.
 */
const noIndexPaths = new Set();

/** @type {import('astro').AstroIntegration} */
const noIndexRoutes = {
  name: '27zero:no-index-routes',
  hooks: {
    'astro:build:start': async ({ logger }) => {
      if (!SANITY_PROJECT_ID || !SANITY_DATASET) {
        logger.warn('Sin SANITY_PROJECT_ID/SANITY_DATASET — el sitemap no filtra noIndex.');
        return;
      }

      try {
        const paths = await fetchNoIndexPaths({
          projectId: SANITY_PROJECT_ID,
          dataset: SANITY_DATASET,
          apiVersion: SANITY_API_VERSION,
        });

        for (const path of paths) noIndexPaths.add(path);

        if (paths.length) logger.info(`${paths.length} ruta(s) noIndex excluidas del sitemap.`);
      } catch (error) {
        /* Avisa y sigue, en vez de romper el build: el build lo dispara el deploy hook
           de Sanity en cada publicación, y un sitemap con una URL de más es mucho menos
           grave que dejar el sitio entero sin publicar (CLAUDE.md §10). */
        logger.warn(`No se pudieron resolver las rutas noIndex, el sitemap sale sin filtrar: ${error}`);
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  /* Placeholder de Netlify, no el dominio final. `site` es obligatorio para que
     `@astrojs/sitemap` emita URLs absolutas (sin él tira warning y no genera nada),
     y es la base del `canonical` cuando `settings.siteUrl` está vacío en Sanity.
     TODO (Etapa 9): cambiar a 'https://27zero.agency' al hacer el swap de dominio
     desde Webflow — ver PLANNING.md §3, "Etapa 9 flags". */
  site: 'https://27zero-web.netlify.app',
  integrations: [
    /* Antes de `sitemap()`: llena el Set en `build:start`, que corre antes del
       `build:done` donde sitemap emite los archivos. */
    noIndexRoutes,
    sitemap({
      filter: (page) => !noIndexPaths.has(normalizePath(new URL(page).pathname)),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
