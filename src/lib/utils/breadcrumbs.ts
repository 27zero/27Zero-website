/**
 * Breadcrumbs — 27zero.
 *
 * Fuente única del recorrido de una interna. El mismo array alimenta el `<nav>`
 * visible y el nodo `BreadcrumbList` del JSON-LD, así que no pueden desalinearse:
 * si la miga visible dice una cosa y el structured data otra, Google se queda con
 * la contradicción.
 *
 * Vive en `utils/` y no en `seo/` a propósito: el trail es conocimiento de rutas,
 * no de SEO. Ponerlo en `seo/` obligaría a una página a importar de ahí para
 * renderizar un nav, que no tiene nada que ver con metadata.
 *
 * Los listados son rutas fijas, así que no pasan por `routes.ts`: ese módulo resuelve
 * la URL de un documento a partir de su slug, y acá el último ítem — el documento — va
 * justamente sin href.
 *
 * El último ítem es la página actual y va SIN `href`: es la convención de
 * `aria-current="page"` en el nav, y en `BreadcrumbList` el último `item` se omite
 * porque schema.org no quiere que la página se enlace a sí misma.
 */
export interface Crumb {
  label: string;
  /** Ausente solo en el último — la página actual no se enlaza a sí misma. */
  href?: string;
}

/** Raíz común a las 5 internas. */
const HOME: Crumb = { label: 'Home', href: '/' };

/**
 * Listado del que cuelga cada interna. Los labels replican el texto que ya usa el
 * breadcrumb visible de EdTech Mentor, para no introducir un segundo naming.
 */
const LISTINGS = {
  work: { label: 'Work', href: '/work' },
  edtechMentor: { label: 'Edtech mentor interviews', href: '/edtech-mentor' },
  resource: { label: 'Resources', href: '/resources' },
  edtechMarketingPractice: { label: 'EdTech Marketing', href: '/edtech-marketing' },
  edtechMarketingService: { label: 'EdTech Marketing', href: '/edtech-marketing' },
} as const;

/** Los 5 documentTypes con página de detalle. */
export type BreadcrumbSection = keyof typeof LISTINGS;


/**
 * Recorrido de una interna: Home › listado › documento.
 *
 * `label` es el título que ve el usuario (en `edtechMentor` es el `guestName`, que
 * es lo que ya muestra la miga visible, no el `title` del documento). Sin `label`
 * el trail corta en el listado en vez de emitir un ítem sin texto.
 */
export function detailTrail(
  section: BreadcrumbSection,
  document: { label?: string; slug?: string }
): Crumb[] {
  const trail: Crumb[] = [HOME, { ...LISTINGS[section] }];

  if (document.label) {
    trail.push({ label: document.label });
  }

  return trail;
}

/**
 * Trail → URLs absolutas, que es lo que pide `BreadcrumbList`. Se resuelve contra
 * `site` de `astro.config.mjs`; el ítem final queda sin `item` (ver docblock).
 */
export function toAbsoluteTrail(trail: Crumb[], siteUrl: string): { label: string; url?: string }[] {
  const base = siteUrl.replace(/\/+$/, '');

  return trail.map(({ label, href }) => ({
    label,
    url: href ? `${base}${href}` : undefined,
  }));
}
