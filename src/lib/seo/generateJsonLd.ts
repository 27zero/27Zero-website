/**
 * generateJsonLd — 27zero.
 *
 * Arma UN solo `@graph` por página en vez de varios `<script>` sueltos: así los nodos
 * se referencian entre sí por `@id` (las oficinas cuelgan de la Organization, el
 * Article la usa de `publisher`) y Google lee una sola entidad coherente en vez de
 * tres islas sin relación.
 *
 * Toda propiedad vacía se OMITE, nunca se emite como `undefined` o string vacío:
 * un JSON-LD con propiedades huecas es peor que uno más chico — Google lo lee como
 * dato ausente declarado, no como dato que todavía no cargaron.
 *
 * No importa nada de `lib/sanity/` salvo el tipo de settings ya resuelto: recibe
 * strings y URLs listas, igual que `Metadata.astro`. Las imágenes llegan resueltas
 * por `ogImageUrl()`, nunca como asset crudo.
 *
 * Corre entero en build — 0 JS al cliente.
 */
import type { SiteSeoSettings } from '../sanity/settings';
import type { Crumb } from '../utils/breadcrumbs';
import { toAbsoluteTrail } from '../utils/breadcrumbs';

/**
 * Nombre de la organización cuando `settings.siteTitle` está vacío.
 *
 * Misma red de seguridad que el title de `Metadata.astro`: sin esto el nodo
 * `Organization` no se emite, y con él se caen las dos oficinas (que sí tienen
 * dirección y teléfono reales cargados) porque cuelgan de su `@id`. Queda inerte
 * apenas se cargue `siteTitle` en Sanity.
 */
const ORGANIZATION_NAME_FALLBACK = '27zero';

export interface ArticleInput {
  headline?: string;
  /** ISO 8601 — sale de `publishedAt`. */
  datePublished?: string;
  /** Ya resuelta por `ogImageUrl()`. */
  image?: string;
  /** `author->name`. En las entrevistas es 27zero, no el entrevistado. */
  authorName?: string;
  /**
   * Solo `edtechMentor`: el entrevistado. En schema.org es `about` (el sujeto del
   * artículo), no `author` — marcarlo como autor le atribuiría a quien no lo
   * escribió las señales de autoridad del contenido.
   */
  aboutPersonName?: string;
}

export interface JsonLdInput {
  siteSettings: SiteSeoSettings;
  /** Base absoluta del sitio: `settings.siteUrl` o, si está vacío, `Astro.site`. */
  siteUrl: string;
  /** URL absoluta y canónica de la página actual. */
  pageUrl: string;
  article?: ArticleInput;
  breadcrumb?: Crumb[];
}

type Node = Record<string, unknown>;

/** Descarta claves con `undefined`, string vacío o array vacío. */
function compact(node: Node): Node {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
}

export function generateJsonLd({
  siteSettings,
  siteUrl,
  pageUrl,
  article,
  breadcrumb,
}: JsonLdInput): { '@context': string; '@graph': Node[] } | null {
  const base = siteUrl.replace(/\/+$/, '');
  const organizationId = `${base}/#organization`;
  const organizationName = siteSettings.siteTitle ?? ORGANIZATION_NAME_FALLBACK;

  const graph: Node[] = [];

  // ── Organization — en las 13 páginas ────────────────────────────────
  graph.push(
    compact({
      '@type': 'Organization',
      '@id': organizationId,
      name: organizationName,
      url: base,
      logo: siteSettings.logoUrl,
      sameAs: siteSettings.sameAs,
    })
  );

  // ── ProfessionalService ×N — una por oficina ────────────────────────
  /* `ProfessionalService` y no `LocalBusiness` genérico: describe mejor a una
     agencia B2B, y es subtipo suyo, así que hereda address/telephone.

     La dirección va entera en `streetAddress` en vez de partirse en locality /
     region / postalCode: en Sanity es un solo campo de texto libre y las dos
     oficinas ya tienen formatos distintos (la de US trae estado y ZIP, la de CO
     no). Un parser por comas emitiría structured data incorrecto en silencio en
     cuanto alguien edite el campo. `addressCountry` sí es seguro: lo sabemos por
     cuál campo de settings es, no por leer el texto. */
  for (const office of siteSettings.offices ?? []) {
    graph.push(
      compact({
        '@type': 'ProfessionalService',
        '@id': `${base}/#office-${office.country.toLowerCase()}`,
        name: `${organizationName} — ${office.label}`,
        parentOrganization: { '@id': organizationId },
        address: office.address
          ? compact({
              '@type': 'PostalAddress',
              streetAddress: office.address,
              addressCountry: office.country,
            })
          : undefined,
        telephone: office.phone,
      })
    );
  }

  // ── Article — solo en el detalle de resource y edtechMentor ─────────
  if (article) {
    /* Person vs Organization según a quién apunte el reference: si el author
       cargado ES la agencia, emitirlo como Person la convertiría en una persona
       distinta de la Organization que ya está en el grafo. */
    const authorIsOrganization =
      article.authorName?.trim().toLowerCase() === organizationName.trim().toLowerCase();

    graph.push(
      compact({
        '@type': 'Article',
        '@id': `${pageUrl}#article`,
        mainEntityOfPage: pageUrl,
        headline: article.headline,
        datePublished: article.datePublished,
        image: article.image,
        author: article.authorName
          ? authorIsOrganization
            ? { '@id': organizationId }
            : { '@type': 'Person', name: article.authorName }
          : undefined,
        publisher: { '@id': organizationId },
        about: article.aboutPersonName
          ? { '@type': 'Person', name: article.aboutPersonName }
          : undefined,
      })
    );
  }

  // ── BreadcrumbList — en las 5 internas ──────────────────────────────
  if (breadcrumb?.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: toAbsoluteTrail(breadcrumb, base).map(({ label, url }, index) =>
        compact({
          '@type': 'ListItem',
          position: index + 1,
          name: label,
          /* El último no lleva `item`: es la página actual y schema.org no quiere
             que se enlace a sí misma. */
          item: url,
        })
      ),
    });
  }

  return graph.length ? { '@context': 'https://schema.org', '@graph': graph } : null;
}
