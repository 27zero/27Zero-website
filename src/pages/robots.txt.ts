/**
 * robots.txt — 27zero.
 *
 * Endpoint y no un archivo estático en `public/` para que la URL del sitemap salga
 * de `site` (astro.config.mjs) en vez de quedar escrita a mano en un segundo lugar:
 * cuando en Etapa 9 se haga el swap a `27zero.agency`, se cambia `site` y esto sigue.
 *
 * La directiva `Sitemap` exige URL absoluta — una relativa la ignoran los crawlers.
 *
 * `/studio` y `/api` no existen como rutas en este sitio (el Studio de Sanity está
 * deployado aparte). Los `Disallow` son preventivos y están pedidos explícitamente
 * por CLAUDE.md §8.1: si alguna vez se monta el Studio bajo este dominio, el bloqueo
 * ya está puesto en vez de descubrirse cuando Google lo indexó.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = site?.href.replace(/\/+$/, '') ?? '';

  const body = `User-agent: *
Allow: /
Disallow: /studio
Disallow: /api

Sitemap: ${base}/sitemap-index.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
