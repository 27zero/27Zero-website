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
import type { SanityImage, Seo } from '../../types/sanity';
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

/**
 * Imagen de Sanity → URL absoluta del CDN al ratio de OG. Se exporta porque el
 * `image` del nodo `Article` del JSON-LD quiere exactamente lo mismo que el
 * `og:image`, y resolverlo distinto en cada lado daría dos URLs para la misma imagen.
 *
 * Acepta varias fuentes en orden de preferencia y devuelve la primera que tenga
 * asset. Es variadica y no un `??` en el llamador por una razón concreta del dataset:
 * un campo de imagen tocado y vaciado en el Studio queda como `{_type: 'image'}` SIN
 * asset — no `undefined` — así que `a ?? b` se queda con `a` y devuelve una imagen
 * vacía teniendo `b` cargada. Pasó exacto con `resource.heroBanner`.
 *
 * `urlFor()` sobre un objeto sin asset tira, de ahi el chequeo de `_ref`.
 */
export function ogImageUrl(...sources: (SanityImage | null | undefined)[]): string | undefined {
  const source = sources.find((candidate) => candidate?.asset?._ref);
  if (!source) return undefined;

  return urlFor(source).width(OG_WIDTH).height(OG_HEIGHT).fit('crop').auto('format').url();
}

export function resolveSeo(seo: Seo | null | undefined): ResolvedSeo | undefined {
  if (!seo) return undefined;

  return {
    title: seo.title,
    description: seo.description,
    canonicalUrl: seo.canonicalUrl,
    noIndex: seo.noIndex,
    ogImage: ogImageUrl(seo.ogImage),
  };
}
