/**
 * Cajas de imagen — 27zero.
 *
 * La geometría de cada lugar donde se renderiza una imagen de Sanity, como función del
 * ancho del viewport (px CSS). De acá sale el atributo `sizes` de cada `<img>`
 * (`sizesFor()` en `lib/sanity/image`), así que el navegador pide la imagen al tamaño
 * con el que realmente se ve — ni la de 900px estirada a 2516 que pixelaba Doctums, ni
 * una de 2800 para un avatar.
 *
 * Los valores replican los tokens de `global.css` y los `clamp()` de cada componente
 * (curva 320px → 1440px, CLAUDE.md §5). Si cambia un tamaño en el CSS, se actualiza la
 * caja acá: una caja más chica que la real vuelve a pixelar; una más grande solo hace
 * que se descargue de más.
 */
import type { ImageBox } from '../sanity/image';

/* ──────────────────────────── Primitivas ─────────────────────────────── */

const MOBILE_MAX = 768;
const CONTAINER_MAX = 1440;

/** `clamp()` fluido de la curva del proyecto: `min` a 320px de viewport, `max` a 1440px. */
export function fluid(min: number, max: number) {
  return (viewport: number) => Math.min(max, Math.max(min, min + ((max - min) * (viewport - 320)) / 1120));
}

/** `--spacing-container-x`: clamp(1.125rem, -0.1786rem + 6.5179vw, 5.6875rem). */
const gutter = (viewport: number) => Math.min(91, Math.max(18, -2.857 + 0.065179 * viewport));

/** Ancho interno de `.container` (max-width 90rem, con su padding lateral). */
export const containerWidth = (viewport: number) => Math.min(viewport, CONTAINER_MAX) - 2 * gutter(viewport);

/** `--spacing-card`: clamp(15.625rem, 13.8393rem + 8.9286vw, 21.875rem). */
const card = (viewport: number) => Math.min(350, Math.max(250, 221.43 + 0.089286 * viewport));

/** Gap de las grillas de imágenes del Case Study: clamp(0.6019rem, …, 0.9363rem). */
const imageGap = (viewport: number) => Math.min(15, Math.max(9.6, 8.1 + 0.004777 * viewport));

/** Columna de una grilla de `columns` dentro del container; en mobile, siempre 1 columna. */
const column = (columns: number) => (viewport: number) => {
  if (viewport <= MOBILE_MAX || columns <= 1) return containerWidth(viewport);
  return (containerWidth(viewport) - (columns - 1) * imageGap(viewport)) / columns;
};

/* ──────────────────────────── Case Study ─────────────────────────────── */

/**
 * Imagen en una grilla de 1 a 4 columnas con alto fijo y `object-cover` en todos los
 * breakpoints (galería de Results).
 */
const fixedHeightGridBox =
  (columns: number, height: (viewport: number) => number): ImageBox =>
  (viewport) => ({ width: column(columns)(viewport), height: height(viewport) });

/**
 * Imágenes de una sección del Case Study (`CaseStudyBlock`). En desktop, grilla de 1 a 4
 * columnas con el alto de `heightVariant` y `object-cover`. En mobile, 1 columna con
 * `height: auto`: la imagen se ve completa en su proporción, así que solo cuenta el
 * ancho — sin `height` en la caja, `sizes` no suma el ancho extra que agregaba el recorte.
 */
export const caseStudyBox =
  (columns: number, height: (viewport: number) => number): ImageBox =>
  (viewport) =>
    viewport <= MOBILE_MAX
      ? { width: containerWidth(viewport) }
      : { width: column(columns)(viewport), height: height(viewport) };

/* ──────────────────────────────── Cajas ──────────────────────────────── */

export const IMAGE_BOXES = {
  /** Hero de la interna de Work: container completo, clamp(21.375rem → 33.25rem). */
  workHero: ((viewport) => ({ width: containerWidth(viewport), height: fluid(342, 532)(viewport) })) as ImageBox,
  /** Galería de Results: clamp(12.375rem → 19.25rem). */
  workGallery: (columns: number) => fixedHeightGridBox(columns, fluid(198, 308)),
  /** Logo del cliente en la interna: 70px de alto máximo, ancho según su proporción. */
  clientLogo: (() => ({ width: 0, height: 70 })) as ImageBox,

  /** `WorkCard` base y `EdtechMentorCard`: el cuadrado de `--spacing-card`. */
  card: ((viewport) => ({ width: card(viewport), height: card(viewport) })) as ImageBox,
  /** `WorkCard size="tall"` (categorías destacadas de Work). */
  cardTall: ((viewport) => ({ width: card(viewport), height: fluid(320, 480)(viewport) })) as ImageBox,
  /** `WorkCard` en el slider de About: alto 30em, clamp(16.875rem → 26.25rem). */
  cardAbout: ((viewport) => ({ width: card(viewport), height: fluid(270, 420)(viewport) })) as ImageBox,

  /** `FeaturedCard` a ancho completo (destacado del índice de EdTech Mentor). */
  featuredWide: ((viewport) => ({ width: containerWidth(viewport), height: fluid(320, 615)(viewport) })) as ImageBox,
  /** `FeaturedCard` en media columna (Home y About): en mobile ocupa todo el container. */
  featuredHalf: ((viewport) => ({
    width: viewport <= MOBILE_MAX ? containerWidth(viewport) : containerWidth(viewport) / 2,
    height: fluid(320, 615)(viewport),
  })) as ImageBox,

  /** Fondo de un hero a todo el ancho del viewport (About, EdTech Marketing, internas). */
  fullBleedHero: ((viewport) => ({ width: viewport, height: fluid(480, 720)(viewport) })) as ImageBox,

  /** Imagen de media columna con proporción fija 5:3 (Proof Point de About y Services). */
  proofPoint: ((viewport) => {
    const width = viewport <= MOBILE_MAX ? containerWidth(viewport) : ((containerWidth(viewport) - 45) * 2) / 3.5;
    return { width, height: viewport <= MOBILE_MAX ? (width * 9) / 16 : (width * 3) / 5 };
  }) as ImageBox,

  /** Imagen del bloque Featured de la interna de EdTech Mentor (columna 1.25fr). */
  mentorIntro: ((viewport) => ({
    width: viewport <= MOBILE_MAX ? containerWidth(viewport) : ((containerWidth(viewport) - 45) * 1.25) / 2.25,
    height: viewport <= MOBILE_MAX ? 256 : 560,
  })) as ImageBox,
  /** Imagen de Rapid Fire de la interna de EdTech Mentor (columna 1fr de 2.2fr). */
  mentorRapidFire: ((viewport) => ({
    width: viewport <= MOBILE_MAX ? containerWidth(viewport) : (containerWidth(viewport) - 70) / 2.2,
    height: viewport <= MOBILE_MAX ? 256 : 640,
  })) as ImageBox,

  /** `TeamCard` de About: cuadrado, grilla de 3 a todo el ancho; 1 columna en mobile. */
  team: ((viewport) => {
    const width = viewport <= MOBILE_MAX ? viewport : Math.min(viewport, CONTAINER_MAX) / 3;
    return { width, height: width };
  }) as ImageBox,

  /** `PracticesCard`: 3 columnas del container; en mobile, carrusel de 18.75 × 23.75rem. */
  practiceCard: ((viewport) =>
    viewport <= MOBILE_MAX
      ? { width: 300, height: 380 }
      : { width: (containerWidth(viewport) - 60) / 3, height: fluid(380, 560)(viewport) }) as ImageBox,

  /** `ResourceCard`: 3 columnas del container (gap-x de hasta 0.8125rem), 18.75rem de alto. */
  resourceCard: ((viewport) => ({
    width: viewport <= MOBILE_MAX ? containerWidth(viewport) : (containerWidth(viewport) - 26) / 3,
    height: 300,
  })) as ImageBox,
  /** `ResourceCardFeatured`: columna 1.3fr de 2.3fr; en mobile, container completo. El alto
      no es fijo: la imagen se estira al de la columna de texto (~710px medidos en desktop). */
  resourceFeatured: ((viewport) => ({
    width: viewport <= MOBILE_MAX ? containerWidth(viewport) : ((containerWidth(viewport) - 35) * 1.3) / 2.3,
    height: viewport <= MOBILE_MAX ? fluid(200, 320)(viewport) : 720,
  })) as ImageBox,

  /** Shapes de "What Sets 27zero Apart": max-width clamp(12.375rem → 19.25rem), alto libre;
      en mobile cada slide del carrusel ocupa el 70% del viewport. */
  apartShape: ((viewport) => ({ width: viewport <= MOBILE_MAX ? viewport * 0.7 : fluid(198, 308)(viewport) })) as ImageBox,

  /** Cards de Contact (fondo por CSS, sin `srcset`): media columna del container. */
  contactCard: ((viewport) => ({
    width: viewport <= MOBILE_MAX ? containerWidth(viewport) : containerWidth(viewport) / 2,
    height: 480,
  })) as ImageBox,
} as const;

/* ─────────────────────── Altura de imágenes del Case Study ─────────────────────── */

/**
 * `heightVariant` → alto en px a 320px de viewport (mobile) y a 1440px (desktop). Los tres
 * presets son los valores revisados en la ronda 1; `custom` usa `customHeight` como
 * desktop y escala a 2/3 en mobile — la misma proporción que los presets (~0.66).
 */
const HEIGHT_RANGES = {
  low: [160, 240],
  medium: [240, 360],
  high: [320, 512],
} as const;

const toRem = (px: number) => `${Number((px / 16).toFixed(4))}rem`;

/**
 * Alto de las imágenes de una sección del Case Study: el `clamp()` para el CSS y la
 * función para la caja de `sizes`, salidos de los mismos dos números.
 *
 * `customHeight` sin `custom` se ignora, y `custom` sin `customHeight` (el schema lo
 * valida, pero un documento puede llegar a medio cargar) cae a `medium`. GROQ devuelve
 * `null`, no `undefined`, para un campo vacío: de ahí el `?? 'medium'`.
 */
export function caseStudyImageHeight(
  variant: 'low' | 'medium' | 'high' | 'custom' | null | undefined,
  customHeight?: number | null
): { css: string; at: (viewport: number) => number } {
  const [min, max] =
    variant === 'custom' && customHeight
      ? [Math.round((customHeight * 2) / 3), customHeight]
      : HEIGHT_RANGES[variant === 'custom' ? 'medium' : (variant ?? 'medium')];

  const slopeVw = ((max - min) / 1120) * 100;
  const interceptPx = min - (slopeVw / 100) * 320;

  return {
    css: `clamp(${toRem(min)}, ${toRem(interceptPx)} + ${Number(slopeVw.toFixed(4))}vw, ${toRem(max)})`,
    at: fluid(min, max),
  };
}
