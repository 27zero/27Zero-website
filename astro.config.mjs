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
  build: {
    /* El CSS del sitio entero es UN archivo de 71,7 KB (14,9 KB gzip) y bloqueaba el
       render en las 28 páginas. Inlinearlo lo saca del camino crítico: no hay request que
       esperar antes de pintar.

       Medido con Lighthouse (mobile emulado con throttling, build servido local), FCP
       antes → después: Home 2,5s → 0,9s, /work 2,2s → 1,0s, /work/busuu 2,5s → 1,0s,
       la interna de mentor 2,0s → 0,9s. `render-blocking-insight` pasa de fallar en las 6
       páginas auditadas a pasar en las 6, y Performance sube entre 2 y 4 puntos.

       El costo es real y es de caché: el CSS deja de ser un archivo cacheado una vez y
       viaja en cada HTML. Primera visita a una página: 22,2 KB gzip inline vs 22,3 KB
       externo — igual, los bytes solo cambian de lugar. Navegando 5 páginas: 111 KB vs
       52 KB. Se acepta porque este es un sitio de agencia donde la mayoría de las visitas
       entran desde búsqueda o LinkedIn a UNA página, y ahí inlinear es 1,5s de FCP
       gratis; el que recorre 5 páginas paga 59 KB, que a esa altura ya no es first paint.

       Si el CSS crece mucho (con `astro build` mirar el tamaño de `dist/_astro/*.css`
       antes de inlinear), revisar esta decisión: el umbral no es el peso del CSS sino
       cuántas páginas navega un visitante típico. */
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
