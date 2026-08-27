/**
 * Rutas marcadas `noIndex` — 27zero.
 *
 * Las consume el `filter` de `@astrojs/sitemap` en `astro.config.mjs`. Una URL con
 * `<meta name="robots" content="noindex">` que igual figura en el sitemap le manda a
 * Google dos señales opuestas sobre la misma página: el sitemap la propone para
 * indexar y el meta se lo prohíbe. `Metadata.astro` ya emite el meta desde
 * `seo.noIndex`; esto cierra el otro lado.
 *
 * Cubre las 13 páginas, no solo las 5 internas: las estáticas/shell también tienen
 * `noIndex` (vía `settings.{page}Seo`) y `Metadata.astro` lo respeta igual, así que
 * dejarlas afuera del filtro reproduciría la contradicción en las 8 restantes.
 *
 * Cliente propio en vez de `lib/sanity/client.ts`
 * ------------------------------------------------
 * Ese módulo lee `import.meta.env` al importarse y tira si falta una variable. Acá
 * el llamador es `astro.config.mjs`, que Vite carga en un contexto donde el `.env`
 * todavía no está poblado — importarlo reventaría el config incluso en comandos que
 * no necesitan Sanity. Por eso las credenciales entran por parámetro, resueltas con
 * el `loadEnv` de Vite del lado del config.
 */
import { createClient } from '@sanity/client';
import { mentorUrl, practiceUrl, resourceUrl, serviceUrl, workUrl } from '../utils/routes';

/** Rutas de las 8 páginas estáticas/shell, en el orden de los campos de `settings`. */
const STATIC_ROUTES = {
  homeSeo: '/',
  aboutSeo: '/about',
  workSeo: '/work',
  clientsSeo: '/clientes',
  mentorSeo: '/edtech-mentor',
  resourcesSeo: '/resources',
  agencySeo: '/edtech-marketing',
  contactSeo: '/contact',
} as const;

const DETAIL_URL: Record<string, (slug: string) => string> = {
  work: workUrl,
  edtechMentor: mentorUrl,
  resource: resourceUrl,
  edtechMarketingPractice: practiceUrl,
  edtechMarketingService: serviceUrl,
};

const noIndexQuery = `{
  "documents": *[
    _type in ["work", "edtechMentor", "resource", "edtechMarketingPractice", "edtechMarketingService"]
    && seo.noIndex == true
    && defined(slug.current)
  ]{_type, "slug": slug.current},
  "settings": *[_type == "settings"][0]{
    "homeSeo": homeSeo.noIndex,
    "aboutSeo": aboutSeo.noIndex,
    "workSeo": workSeo.noIndex,
    "clientsSeo": clientsSeo.noIndex,
    "mentorSeo": mentorSeo.noIndex,
    "resourcesSeo": resourcesSeo.noIndex,
    "agencySeo": agencySeo.noIndex,
    "contactSeo": contactSeo.noIndex
  }
}`;

/**
 * Pathname comparable: sin barra final, salvo la raíz.
 *
 * `@astrojs/sitemap` emite las URLs con barra final (`/about/`) y los helpers de
 * `routes.ts` las arman sin ella (`/about`). Sin normalizar los dos lados, el filtro
 * no matchea nunca y el noIndex se ignora en silencio.
 */
export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

interface NoIndexProjection {
  documents: { _type: string; slug: string }[];
  settings: Partial<Record<keyof typeof STATIC_ROUTES, boolean | null>> | null;
}

export async function fetchNoIndexPaths(config: {
  projectId: string;
  dataset: string;
  apiVersion: string;
}): Promise<string[]> {
  const client = createClient({ ...config, useCdn: false, perspective: 'published' });
  const { documents, settings } = await client.fetch<NoIndexProjection>(noIndexQuery);

  const paths = documents
    .map(({ _type, slug }) => DETAIL_URL[_type]?.(slug))
    .filter((path): path is string => Boolean(path));

  for (const [field, route] of Object.entries(STATIC_ROUTES)) {
    if (settings?.[field as keyof typeof STATIC_ROUTES]) paths.push(route);
  }

  return paths.map(normalizePath);
}
