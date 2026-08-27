/**
 * resolveSeo — 27zero.
 *
 * Traduce el object `seo` crudo de Sanity al shape plano que consume
 * `components/seo/Metadata.astro`.
 *
 * Existe para que `Metadata.astro` no importe nada de `lib/sanity/`: el componente
 * es presentación pura y recibe strings ya resueltos, sin importar si el origen fue
 * una query GROQ de un documento o el singleton `settings` (CLAUDE.md §8.1, "misma
 * interfaz para ambas fuentes"). Toda la traducción Sanity → SEO pasa por acá, así
 * que la `ogImage` se pide al CDN con un solo criterio en todo el sitio.
 */
import type { Seo } from '../../types/sanity';
import { urlFor } from '../sanity/image';

/** Mismo shape que `Seo`, con `ogImage` ya resuelta a URL absoluta del CDN. */
export interface ResolvedSeo {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

/** 1200×630 — el ratio que piden Open Graph y Twitter `summary_large_image`. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export function resolveSeo(seo: Seo | null | undefined): ResolvedSeo | undefined {
  if (!seo) return undefined;

  return {
    title: seo.title,
    description: seo.description,
    canonicalUrl: seo.canonicalUrl,
    noIndex: seo.noIndex,
    /* `_ref` y no solo `ogImage`: un campo de imagen tocado y vaciado en el Studio
       deja el objeto `{_type: 'image'}` sin asset, y `urlFor()` sobre eso tira. */
    ogImage: seo.ogImage?.asset?._ref
      ? urlFor(seo.ogImage).width(OG_WIDTH).height(OG_HEIGHT).fit('crop').auto('format').url()
      : undefined,
  };
}
