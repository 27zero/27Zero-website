/**
 * Cliente de Sanity — 27zero.
 *
 * Instancia única compartida por todas las páginas. Astro corre en SSG, así que
 * cada `client.fetch()` se resuelve en build time y nada de esto llega al navegador.
 *
 * `useCdn: true`: todo el contenido de este sitio es público y publicado — no hay
 * drafts ni contenido privado en el frontend (CLAUDE.md §4). El CDN devuelve el
 * último documento publicado y evita pegarle a la API cruda en cada build.
 *
 * Sin `token`: el dataset `production` es de lectura pública. El `SANITY_API_TOKEN`
 * del `.env` existe para scripts de migración contra el Studio, no para este cliente
 * — pasarlo acá desactivaría el CDN sin ganar nada.
 */
import { createClient } from '@sanity/client';

const projectId = import.meta.env.SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET;

if (!projectId || !dataset) {
  throw new Error(
    'Faltan SANITY_PROJECT_ID / SANITY_DATASET. Copiar `.env.example` a `.env` y completarlas (ver CLAUDE.md §2).'
  );
}

export const sanityClient = createClient({
  projectId,
  dataset,
  /* Fecha fija, nunca `new Date()`: la fecha de hoy congela el comportamiento de la
     API en el momento en que se escribió el código. Una fecha dinámica haría que un
     build futuro estrene features de GROQ sin que nadie las haya probado. */
  apiVersion: '2026-08-20',
  useCdn: true,
  perspective: 'published',
});
