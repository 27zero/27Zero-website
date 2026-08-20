/**
 * Helpers de imagen de Sanity — 27zero.
 *
 * Todas las imágenes del CMS se sirven desde el Image CDN de Sanity vía `urlFor()`,
 * nunca por el `<Image>` de Astro (CLAUDE.md §2): el CDN hace el resize/formato en
 * su infraestructura, no cuenta contra el bandwidth de Netlify y no infla el build.
 */
import { createImageUrlBuilder } from '@sanity/image-url';
import type { SanityImage } from '../../types/sanity';
import { sanityClient } from './client';

const builder = createImageUrlBuilder(sanityClient);

/** Builder crudo, para los casos que necesiten encadenar transformaciones propias. */
export const urlFor = (source: SanityImage) => builder.image(source);

/**
 * Adapta una imagen de Sanity al shape `{ src, alt }` que consumen las cards de
 * Etapa 3 (`WorkCard`, `TeamCard`, `FeaturedCard`…). Ese shape existe para que el
 * `alt` sea obligatorio a nivel de tipo (CLAUDE.md §8.1), así que una imagen sin
 * `alt` cargado devuelve `undefined`: preferimos no renderizar el `<img>` antes que
 * emitir uno inaccesible.
 *
 * `width` es el ancho máximo al que se pide la imagen al CDN. `auto('format')`
 * negocia WebP/AVIF contra el `Accept` del navegador.
 */
export function toImage(
  source: SanityImage | null | undefined,
  options: { width: number; height?: number }
): { src: string; alt: string } | undefined {
  if (!source?.asset?._ref || !source.alt) return undefined;

  let url = urlFor(source).width(options.width).auto('format').fit('crop');
  if (options.height) url = url.height(options.height);

  return { src: url.url(), alt: source.alt };
}
