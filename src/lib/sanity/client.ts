/**
 * Cliente de Sanity — 27zero.
 *
 * Instancia única compartida por todas las páginas. Astro corre en SSG, así que
 * cada `client.fetch()` se resuelve en build time y nada de esto llega al navegador.
 *
 * `useCdn: false`: el CDN de Sanity invalida su caché POR QUERY, no por dataset. Dentro
 * de un mismo build eso deja ver estados inconsistentes durante ~2 min después de una
 * publicación: una query ya trae el documento nuevo y otra sigue sirviendo caché vieja.
 * Se comprobó en la verificación de Etapa 6 — `edtechMarketingQuery` listaba un servicio
 * recién publicado mientras `serviceDetailQuery` todavía no lo veía, así que la card
 * salió en el menú apuntando a una interna que `getStaticPaths()` nunca generó. Un link
 * roto sin que nadie toque código.
 *
 * Importa acá y no en un sitio cualquiera porque el build lo dispara el deploy hook de
 * Sanity EN el momento de publicar, que es justo la ventana en la que el CDN está
 * inconsistente. Y el CDN no compraba nada a cambio: esto es SSG, las queries corren una
 * vez por build, no una vez por visita.
 *
 * Sin `token`: el dataset `production` es de lectura pública. El `SANITY_API_TOKEN` del
 * `.env` existe para scripts de migración contra el Studio, no para este cliente.
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
  useCdn: false,
  perspective: 'published',
});
