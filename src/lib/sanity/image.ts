/**
 * Helpers de imagen de Sanity — 27zero.
 *
 * Todas las imágenes del CMS se sirven desde el Image CDN de Sanity vía `urlFor()`,
 * nunca por el `<Image>` de Astro (CLAUDE.md §2): el CDN hace el resize/formato en
 * su infraestructura, no cuenta contra el bandwidth de Netlify y no infla el build.
 *
 * Calidad (feedback Work ronda 2, §1 — pixelado en Doctums)
 * ----------------------------------------------------------
 * Hasta la ronda 2 cada imagen se pedía a UN ancho fijo (`width: 900` en el Case Study,
 * 1600 en el hero), sin `srcset`: una sección a ancho completo (1258px en desktop, 2516
 * en retina) recibía una imagen de 900 estirada 2.8x. Y con `fit=crop` sin alto, el CDN
 * además AGRANDABA las imágenes más chicas que el ancho pedido.
 *
 * Ahora toda imagen sale con:
 *   - `srcset` de anchos que nunca superan el original (`fit=max`: el CDN no escala
 *     hacia arriba), para que el navegador elija según pantalla y densidad;
 *   - `sizes` calculado desde la CAJA donde se renderiza (`sizesFor()`, abajo);
 *   - `q=85` y `auto=format` (WebP/AVIF si el navegador los acepta).
 */
import { createImageUrlBuilder } from '@sanity/image-url';
import type { SanityImage } from '../../types/sanity';
import type { ImageData } from '../../types/ui';
import { sanityClient } from './client';

const builder = createImageUrlBuilder(sanityClient);

/** Builder crudo, para los casos que necesiten encadenar transformaciones propias. */
export const urlFor = (source: SanityImage) => builder.image(source);

/** Calidad de compresión del CDN. 85 no se distingue del original y pesa ~40% menos que 100. */
const QUALITY = 85;

/**
 * Anchos candidatos del `srcset`. Cubren desde un avatar en 1x hasta una sección a
 * ancho completo en retina (1258 × 2 = 2516). Los mayores que el original se descartan
 * y se agrega el ancho original como último candidato.
 */
const SRCSET_WIDTHS = [320, 480, 640, 800, 960, 1200, 1440, 1680, 2000, 2400, 2800, 3200];

/* ────────────────────────────── Tipos ────────────────────────────────── */

/**
 * Lo que consume un `<img>`: `src` (fallback sin `srcset`), `srcset`, `sizes` y `alt`,
 * más la proporción real (para `width`/`height` sin layout shift) y el foco del hotspot.
 *
 * `alt` es obligatorio a nivel de tipo (CLAUDE.md §8.1): una imagen sin `alt` cargado
 * no se resuelve y el componente no renderiza el `<img>`.
 */
export interface ResolvedImage {
  src: string;
  srcset?: string;
  sizes?: string;
  alt: string;
  /** Dimensiones intrínsecas (ya aplicado el crop del editor). */
  width: number;
  height: number;
  /** `object-position` desde el hotspot del editor, para las imágenes con `object-cover`. */
  objectPosition?: string;
}

/**
 * Caja donde se renderiza una imagen, como función del ancho del viewport (px CSS).
 * `height` solo en cajas de alto fijo con `object-cover`; sin él, la imagen fluye a su
 * proporción y lo que importa es el ancho.
 */
export type ImageBox = (viewport: number) => { width: number; height?: number };

/* ──────────────────────────── Geometría ──────────────────────────────── */

interface Crop {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/**
 * Dimensiones intrínsecas del asset, parseadas del `_ref`
 * (`image-{hash}-{ancho}x{alto}-{formato}`) y recortadas por el `crop` del editor, que
 * `urlFor()` aplica solo cuando el objeto de imagen lo trae.
 */
function intrinsicSize(image: SanityImage): { width: number; height: number } | undefined {
  const match = image.asset?._ref?.match(/-(\d+)x(\d+)-\w+$/);
  if (!match) return undefined;

  const crop = ((image as { crop?: Crop }).crop ?? {}) as Crop;
  const width = Number(match[1]) * (1 - (crop.left ?? 0) - (crop.right ?? 0));
  const height = Number(match[2]) * (1 - (crop.top ?? 0) - (crop.bottom ?? 0));
  return { width: Math.round(width), height: Math.round(height) };
}

/** Hotspot del editor → `object-position`, relativo al área recortada. */
function hotspotPosition(image: SanityImage): string | undefined {
  const hotspot = (image as { hotspot?: { x?: number; y?: number } }).hotspot;
  if (hotspot?.x === undefined || hotspot.y === undefined) return undefined;

  const crop = ((image as { crop?: Crop }).crop ?? {}) as Crop;
  const x = (hotspot.x - (crop.left ?? 0)) / (1 - (crop.left ?? 0) - (crop.right ?? 0));
  const y = (hotspot.y - (crop.top ?? 0)) / (1 - (crop.top ?? 0) - (crop.bottom ?? 0));
  const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value * 100)));
  return `${clamp(x)}% ${clamp(y)}%`;
}

/* ───────────────────────────── `sizes` ───────────────────────────────── */

/**
 * Viewports donde se mide cada caja para armar `sizes`. Van de a tramos (mobile, tablet
 * y desktop hasta el `max-width` del container) y en cada tramo se toma el PEOR caso —
 * el mayor ancho relativo al viewport—, así el navegador nunca elige una imagen chica.
 */
const MOBILE_VIEWPORTS = [320, 390, 480, 600, 768];
const TABLET_VIEWPORTS = [769, 900, 1024, 1180, 1280, 1440];
const DESKTOP_VIEWPORT = 1440;
/** Pantallas más anchas que el container: solo crecen las cajas a todo el ancho (heroes). */
const WIDE_VIEWPORTS = [1440, 1920, 2560];

/**
 * Ancho que la imagen ocupa en pantalla dentro de su caja. Con `object-cover` en una
 * caja de alto fijo, si la imagen es más "ancha" que la caja, se escala por alto y su
 * ancho real es `alto × proporción`, mayor que el de la caja. Pedirla solo por el ancho
 * de la caja la pixelaría (el caso de las imágenes apaisadas en grillas de 2 a 4
 * columnas); pedirla solo por alto, la pixelaría en el caso contrario (secciones a
 * ancho completo).
 */
function renderedWidth(box: ImageBox, viewport: number, aspect: number): number {
  const { width, height } = box(viewport);
  return height ? Math.max(width, height * aspect) : width;
}

/**
 * Caja → atributo `sizes` en tres tramos, sin funciones CSS (`min`/`max`) en el valor.
 *
 * El último tramo (más ancho que el container) es un valor fijo en px si la caja deja de
 * crecer —lo normal: todo lo que vive dentro de `.container`—, o en `vw` si sigue
 * creciendo con el viewport, como los heroes a todo el ancho.
 */
export function sizesFor(box: ImageBox, aspect: number): string {
  const worstVw = (viewports: number[]) =>
    Math.ceil(Math.max(...viewports.map((vp) => (renderedWidth(box, vp, aspect) / vp) * 100)));

  const desktopWidth = renderedWidth(box, DESKTOP_VIEWPORT, aspect);
  const keepsGrowing = WIDE_VIEWPORTS.some((vp) => renderedWidth(box, vp, aspect) > desktopWidth + 1);

  return [
    `(max-width: 48rem) ${worstVw(MOBILE_VIEWPORTS)}vw`,
    `(max-width: 90rem) ${worstVw(TABLET_VIEWPORTS)}vw`,
    keepsGrowing ? `${worstVw(WIDE_VIEWPORTS)}vw` : `${Math.ceil(desktopWidth)}px`,
  ].join(', ');
}

/* ─────────────────────────── Resolución ──────────────────────────────── */

const imageUrl = (source: SanityImage, width: number) =>
  urlFor(source).width(width).fit('max').quality(QUALITY).auto('format').url();

/**
 * Imagen de Sanity → `ResolvedImage` responsive.
 *
 * `box` describe dónde se renderiza (ver `IMAGE_BOXES` en `utils/imageBoxes`): de ahí
 * sale `sizes`. `src` —el fallback sin `srcset`— es el candidato que cubre la caja en
 * desktop a 1x.
 */
export function toImage(source: SanityImage | null | undefined, options: { box: ImageBox }): ResolvedImage | undefined {
  if (!source?.asset?._ref || !source.alt) return undefined;

  const size = intrinsicSize(source);
  if (!size) return undefined;

  const aspect = size.width / size.height;
  const widths = [...SRCSET_WIDTHS.filter((width) => width < size.width), size.width];
  const desktopWidth = renderedWidth(options.box, DESKTOP_VIEWPORT, aspect);
  const fallbackWidth = widths.find((width) => width >= desktopWidth) ?? size.width;

  return {
    src: imageUrl(source, fallbackWidth),
    srcset: widths.map((width) => `${imageUrl(source, width)} ${width}w`).join(', '),
    sizes: sizesFor(options.box, aspect),
    alt: source.alt,
    width: size.width,
    height: size.height,
    objectPosition: hotspotPosition(source),
  };
}

/**
 * Imagen recortada a un tamaño fijo (avatares e íconos en círculos): `fit=min` recorta
 * a la proporción pedida respetando el hotspot y, a diferencia de `fit=crop`, sin
 * agrandar nunca el original. `srcset` por densidad (1x/2x/3x), porque la caja no
 * cambia con el viewport.
 */
export function toFixedImage(
  source: SanityImage | null | undefined,
  options: { width: number; height: number }
): ResolvedImage | undefined {
  if (!source?.asset?._ref || !source.alt) return undefined;

  const size = intrinsicSize(source);
  if (!size) return undefined;

  const url = (density: number) =>
    urlFor(source)
      .width(options.width * density)
      .height(options.height * density)
      .fit('min')
      .quality(QUALITY)
      .auto('format')
      .url();

  return {
    src: url(2),
    srcset: [1, 2, 3].map((density) => `${url(density)} ${density}x`).join(', '),
    alt: source.alt,
    width: options.width,
    height: options.height,
  };
}

/**
 * URL suelta para `background-image` o `poster`, donde no hay `srcset`: se pide al ancho
 * de la caja en desktop × 2 (retina), sin superar el original.
 */
export function toImageUrl(source: SanityImage | null | undefined, options: { box: ImageBox }): string | undefined {
  const image = toImage(source, options);
  if (!image) return undefined;

  const retinaWidth = Math.min(image.width, Math.ceil(renderedWidth(options.box, DESKTOP_VIEWPORT, image.width / image.height) * 2));
  return imageUrl(source!, retinaWidth);
}

/**
 * Dimensiones intrínsecas de un asset de Sanity, escaladas al `width` pedido. Evita
 * layout shift en `<img>` remotas que no pasan por `<Image>`. `undefined` si el ref no
 * matchea el patrón esperado.
 */
export function imageDimensions(
  image: SanityImage | undefined,
  targetWidth: number
): { width: number; height: number } | undefined {
  const size = image ? intrinsicSize(image) : undefined;
  if (!size) return undefined;

  return { width: targetWidth, height: Math.round(targetWidth * (size.height / size.width)) };
}

/**
 * `ImageData` → atributos del `<img>`: `<img {...imgAttrs(image)} class="…" />`.
 *
 * Emite `srcset`/`sizes` solo si la imagen los trae, y el `object-position` del hotspot
 * como `style` — así el recorte de `object-cover` respeta el foco que marcó el editor en
 * el Studio en vez de centrar siempre. Sin hotspot no hay `style` y rige el del CSS.
 */
export function imgAttrs(image: ImageData) {
  return {
    src: image.src,
    srcset: image.srcset,
    sizes: image.sizes,
    alt: image.alt,
    style: image.objectPosition ? `object-position: ${image.objectPosition}` : undefined,
  };
}
