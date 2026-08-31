/**
 * Resolución de SEO desde el singleton `settings` — 27zero.
 *
 * Una sola query de `settings` para todo el build, no una por página.
 * `loadOnce()` cachea la PROMESA (no el resultado) a nivel de módulo: las 13 páginas
 * se renderizan en el mismo proceso de Node, así que la primera que llame dispara el
 * fetch y las otras 12 esperan esa misma promesa. Cachear la promesa y no el valor
 * evita la carrera de que dos páginas entren antes de que la primera resuelva y se
 * disparen dos requests (CLAUDE.md §10, "queries GROQ repetidas por página").
 *
 * Dos puertas de entrada, según de dónde salga el `seo` de la página:
 *  - `getPageSeo(page)`  → las 8 estáticas/shell: el `seo` sale de `settings.{page}Seo`
 *  - `getSeoSettings()`  → las 5 internas: el `seo` sale de su propio documento, de acá
 *                          solo sale el fallback global
 *
 * Nunca las dos para la misma página (CLAUDE.md §8, "nunca ambas fuentes").
 */
import type { PortableTextBlock, SanityImage, Seo, Settings } from '../../types/sanity';
import { ogImageUrl, resolveSeo, type ResolvedSeo } from '../seo/resolveSeo';
import type { WorkCardProjection } from './cards';
import { sanityClient } from './client';
import { imageDimensions, toImage } from './image';
import { siteSettingsSeoQuery } from './queries';

/** Una oficina, para el nodo `ProfessionalService` del JSON-LD. */
export interface Office {
  /** Código ISO del país — lo sabemos por el campo, no se parsea de la dirección. */
  country: 'US' | 'CO';
  label: string;
  address?: string;
  phone?: string;
}

/** Lo que `Metadata.astro` y el JSON-LD necesitan del sitio, con imágenes resueltas. */
export interface SiteSeoSettings {
  siteTitle?: string;
  siteUrl?: string;
  /** Fallback global: cubre cualquier campo que la página deje vacío. */
  seo?: ResolvedSeo;
  /** Structured data — hoy todos vacíos en Sanity salvo las oficinas. */
  logoUrl?: string;
  sameAs?: string[];
  offices?: Office[];
  /**
   * URL de LinkedIn, cruda. Ya alimenta `sameAs` del JSON-LD, pero el footer la
   * necesita suelta para el `href` del link visible (Etapa 8, Hallazgo 1): leerla de
   * `sameAs[0]` acoplaría el footer al orden de ese array. `Page.astro` la baja a
   * `Footer.astro`.
   */
  linkedinUrl?: string;
}

/**
 * Una de las dos cards del bloque final de Contact, con la imagen ya resuelta a URL.
 *
 * El prefijo `Resolved` sigue el mismo criterio que `ResolvedSeo`: distingue el shape
 * ya procesado del crudo que devuelve Sanity, que vive como `ContactCard` en
 * `types/sanity.ts` (el espejo del schema) y trae `bgImage` como `SanityImage`.
 */
export interface ResolvedContactCard {
  title?: string;
  subtitle?: string;
  link?: string;
  /**
   * URL ya resuelta. Si no hay imagen — o si la imagen no trae `alt` — queda
   * `undefined` y la card cae al fondo gris por default (`bg-gray`).
   */
  bgImageUrl?: string;
}

/**
 * Contenido editable de Contact (Etapa 10).
 *
 * Aparte de `SiteSeoSettings` a propósito: eso es lo que necesitan `Metadata.astro`
 * y el JSON-LD, no contenido de página. Sale de la misma query y de la misma promesa
 * cacheada, así que no cuesta un fetch extra.
 */
export interface ContactContent {
  headline?: string;
  text?: string;
  /** Si está vacío, el botón del hero no se renderiza. */
  ctaLink?: string;
  formTitle?: string;
  formSubtitle?: string;
  waysTitle?: string;
  /* Requeridos, no opcionales: `load()` siempre construye los dos objetos, con o sin
     contenido detrás. Lo que puede venir vacío de Sanity son sus campos, no la card. */
  bookCard: ResolvedContactCard;
  subscribeCard: ResolvedContactCard;
}

/**
 * Uno de los 3 slides de "What Sets 27zero Apart", con la imagen ya resuelta.
 *
 * Es el mismo shape que ya tiene el fallback local de `ShapesSlider`, para que el
 * componente pueda elegir entre uno y otro sin traducir nada.
 */
export interface ApartSlideContent {
  /**
   * `width`/`height` son las dimensiones intrínsecas del asset escaladas al ancho
   * pedido: el `<img>` remoto no pasa por `<Image>`, así que sin ellas el navegador
   * no puede reservar el espacio y la sección salta al cargar.
   */
  image?: { src: string; alt: string; width?: number; height?: number };
  title?: string;
  text?: string;
}

/**
 * "What Sets 27zero Apart" — el slider de shapes, compartido por Home, About y
 * EdTech Marketing. Un solo lugar de edición para las 3 páginas.
 */
export interface ApartSectionContent {
  headline?: string;
  description?: string;
  slideOne?: ApartSlideContent;
  slideTwo?: ApartSlideContent;
  slideThree?: ApartSlideContent;
}

/**
 * Ancho al que se le pide cada shape al Image CDN. Es el mismo `SHAPE_WIDTH` que
 * `ShapesSlider.astro` le pasa a sus imágenes locales de respaldo: el slot mide
 * 19,25rem en desktop y hasta ~70vw en mobile, así que 640 cubre 2x en ambos.
 */
const APART_SHAPE_WIDTH = 640;

/**
 * Ancho al que se le pide el fondo de cada card de Contact al Image CDN.
 *
 * El grid es de 2 columnas dentro del container de 90rem con `px-container-x`, así
 * que cada card mide ~620px de CSS en desktop; 1280 la cubre a 2x. NO se resuelve con
 * `ogImageUrl()`, que recorta a 1200×630 para la tarjeta de Open Graph — sobre una
 * card más alta que ancha ese recorte se ve mal encuadrado y escalado.
 */
const CONTACT_CARD_BG_WIDTH = 1280;

/**
 * Ancho al que se le pide el poster del hero al Image CDN.
 *
 * Es un fondo full-bleed, no una card: se sirve al ancho del viewport de desktop
 * (1440) redondeado hacia arriba para cubrir pantallas más anchas. NO se resuelve con
 * `ogImageUrl()`, que recorta a 1200×630 — ese tamaño es el de la tarjeta de Open
 * Graph y deformaría el fondo.
 */
const HERO_POSTER_WIDTH = 1920;

/**
 * Contenido editable de Home (Etapa 10).
 *
 * Los `headline` son Portable Text de una sola línea, no `string`: el editor marca en
 * cursiva el tramo acentuado y `accentMarkComponents` (`utils/portableText`) lo traduce
 * al `.inter-accent` del design system, que es un cambio de tipografía (Lora → Inter),
 * no de color — hereda el color del heading que lo contiene.
 *
 * `featuredWork` sale crudo, sin mapear a props de card: eso lo hace la página con
 * `toFeaturedWorkCard()`, igual que ya hace con `toWorkCard()` / `toMentorCard()`.
 */
export interface HomeContent {
  hero: {
    headline?: PortableTextBlock[];
    subtitle?: string;
    /** Si está vacío, el botón del hero no se renderiza. */
    ctaLink?: string;
    ctaCaption?: string;
    videoUrl?: string;
    posterUrl?: string;
    posterAlt?: string;
  };
  work: {
    headline?: PortableTextBlock[];
    subtitle?: string;
    featuredWork?: WorkCardProjection;
  };
  mentor: {
    headline?: PortableTextBlock[];
    subtitle?: string;
  };
}

/**
 * Contenido editable de EdTech Mentor (Etapa 11).
 *
 * Solo el copy del shell — hero y CTA de cierre. Las secciones de categoría NO salen
 * de acá: cada una es un documento `mentorCategory` y las trae `mentorListQuery`,
 * junto con sus entrevistas.
 *
 * El primer botón del CTA ("Let's Talk" → `/contact`) tampoco está acá: es ruta
 * interna fija, hardcodeada en la página, mismo criterio que los "Book a strategy
 * session" de Etapa 10.
 */
export interface MentorContent {
  hero: { headline?: string; text?: string };
  cta: {
    headline?: string;
    text?: string;
    /** Label del botón secundario. `initialValue` "Learn More" en el schema. */
    secondaryCtaText?: string;
    /** Si está vacío, el botón secundario no se renderiza. */
    secondaryCtaLink?: string;
  };
}

/** Las 8 páginas estáticas/shell que no tienen documento propio en Sanity. */
export type SeoPage =
  | 'home'
  | 'about'
  | 'work'
  | 'clients'
  | 'mentor'
  | 'resources'
  | 'agency'
  | 'contact';

/** Shape crudo que devuelve `siteSettingsSeoQuery`, antes de resolver las imágenes. */
interface SettingsSeoProjection {
  siteTitle?: string;
  siteUrl?: string;
  seo?: Seo;
  logo?: SanityImage;
  linkedinUrl?: string;
  twitterUrl?: string;
  officeUSNew?: { address?: string; phone?: string; email?: string };
  officeCONew?: { address?: string; phone?: string; email?: string };
  homeSeo?: Seo;
  aboutSeo?: Seo;
  workSeo?: Seo;
  clientsSeo?: Seo;
  mentorSeo?: Seo;
  resourcesSeo?: Seo;
  agencySeo?: Seo;
  contactSeo?: Seo;
  homeHero?: {
    headline?: PortableTextBlock[];
    subtitle?: string;
    ctaLink?: string;
    ctaCaption?: string;
    video?: string;
    poster?: SanityImage;
  };
  /** `featuredWork` llega ya expandido por la query, no como referencia cruda. */
  homeWork?: {
    headline?: PortableTextBlock[];
    subtitle?: string;
    showreelUrl?: string;
    featuredWork?: WorkCardProjection;
  };
  homeMentor?: { headline?: PortableTextBlock[]; subtitle?: string };
  mentorHero?: { headline?: string; text?: string };
  mentorCta?: Settings['mentorCta'];
  /* Se reusa el espejo del schema en vez de redeclarar el shape: la query lo trae
     plano, tal cual, sin proyección de subcampos. */
  apartSection?: Settings['apartSection'];
  contactHero?: { headline?: string; text?: string; ctaLink?: string };
  formTitle?: string;
  formSubtitle?: string;
  waysTitle?: string;
  bookCard?: { title?: string; subtitle?: string; link?: string; bgImage?: SanityImage };
  subscribeCard?: { title?: string; subtitle?: string; link?: string; bgImage?: SanityImage };
}

async function load(): Promise<{
  siteSettings: SiteSeoSettings;
  pages: Record<SeoPage, ResolvedSeo | undefined>;
  contactContent: ContactContent;
  homeContent: HomeContent;
  mentorContent: MentorContent;
  apartSection: ApartSectionContent;
}> {
  /* `?? {}`: hoy el singleton existe pero está vacío, y en un dataset nuevo podría no
     existir. Sin esto el build entero se cae por metadata faltante — que es
     justamente lo que el fallback tiene que absorber. */
  const settings = (await sanityClient.fetch<SettingsSeoProjection | null>(siteSettingsSeoQuery)) ?? {};

  /* `sameAs` con un hueco adentro es peor que sin la propiedad: se filtra acá y, si
     no queda ninguna, el nodo la omite entera en vez de emitir un array vacío. */
  const socialUrls = [settings.linkedinUrl, settings.twitterUrl].filter(
    (url): url is string => Boolean(url)
  );

  return {
    siteSettings: {
      siteTitle: settings.siteTitle,
      siteUrl: settings.siteUrl,
      seo: resolveSeo(settings.seo),
      logoUrl: ogImageUrl(settings.logo),
      sameAs: socialUrls.length ? socialUrls : undefined,
      linkedinUrl: settings.linkedinUrl,
      offices: [
        {country: 'US' as const, label: 'United States', ...settings.officeUSNew},
        {country: 'CO' as const, label: 'Colombia', ...settings.officeCONew},
      ].filter((office) => office.address || office.phone),
    },
    pages: {
      home: resolveSeo(settings.homeSeo),
      about: resolveSeo(settings.aboutSeo),
      work: resolveSeo(settings.workSeo),
      clients: resolveSeo(settings.clientsSeo),
      mentor: resolveSeo(settings.mentorSeo),
      resources: resolveSeo(settings.resourcesSeo),
      agency: resolveSeo(settings.agencySeo),
      contact: resolveSeo(settings.contactSeo),
    },
    contactContent: {
      headline: settings.contactHero?.headline,
      text: settings.contactHero?.text,
      ctaLink: settings.contactHero?.ctaLink,
      formTitle: settings.formTitle,
      formSubtitle: settings.formSubtitle,
      waysTitle: settings.waysTitle,
      bookCard: {
        title: settings.bookCard?.title,
        subtitle: settings.bookCard?.subtitle,
        link: settings.bookCard?.link,
        bgImageUrl: toImage(settings.bookCard?.bgImage, { width: CONTACT_CARD_BG_WIDTH })?.src,
      },
      subscribeCard: {
        title: settings.subscribeCard?.title,
        subtitle: settings.subscribeCard?.subtitle,
        link: settings.subscribeCard?.link,
        bgImageUrl: toImage(settings.subscribeCard?.bgImage, { width: CONTACT_CARD_BG_WIDTH })?.src,
      },
    } satisfies ContactContent,
    homeContent: {
      hero: {
        headline: settings.homeHero?.headline,
        subtitle: settings.homeHero?.subtitle,
        ctaLink: settings.homeHero?.ctaLink,
        ctaCaption: settings.homeHero?.ctaCaption,
        videoUrl: settings.homeHero?.video,
        /* `toImage()` devuelve `undefined` si la imagen no trae `alt`, así que un
           poster sin alt no se renderiza. Es el enforcement de CLAUDE.md §8.1 ("alt
           obligatorio, no queda a criterio del editor"), no un caso a cubrir con
           fallback. */
        posterUrl: toImage(settings.homeHero?.poster, { width: HERO_POSTER_WIDTH })?.src,
        posterAlt: settings.homeHero?.poster?.alt,
      },
      work: {
        headline: settings.homeWork?.headline,
        subtitle: settings.homeWork?.subtitle,
        featuredWork: settings.homeWork?.featuredWork,
      },
      mentor: {
        headline: settings.homeMentor?.headline,
        subtitle: settings.homeMentor?.subtitle,
      },
    } satisfies HomeContent,
    mentorContent: {
      hero: {
        headline: settings.mentorHero?.headline,
        text: settings.mentorHero?.text,
      },
      cta: {
        headline: settings.mentorCta?.headline,
        text: settings.mentorCta?.text,
        secondaryCtaText: settings.mentorCta?.secondaryCtaText,
        secondaryCtaLink: settings.mentorCta?.secondaryCtaLink,
      },
    } satisfies MentorContent,
    apartSection: {
      headline: settings.apartSection?.headline,
      description: settings.apartSection?.description,
      slideOne: toApartSlide(settings.apartSection?.slideOne),
      slideTwo: toApartSlide(settings.apartSection?.slideTwo),
      slideThree: toApartSlide(settings.apartSection?.slideThree),
    } satisfies ApartSectionContent,
  };
}

/**
 * Un slide crudo → resuelto. `toImage()` devuelve `undefined` si el slide no tiene
 * imagen o si la imagen no trae `alt`; en ese caso `ShapesSlider` cae a su asset
 * local de respaldo.
 */
function toApartSlide(
  slide: NonNullable<Settings['apartSection']>['slideOne']
): ApartSlideContent {
  const image = toImage(slide?.image, { width: APART_SHAPE_WIDTH });
  const dimensions = imageDimensions(slide?.image, APART_SHAPE_WIDTH);

  return {
    /* Si el ref no matchea el patrón esperado, `dimensions` es `undefined` y el
       spread no agrega nada: el `<img>` sale sin `height`, como antes. */
    image: image ? { ...image, ...dimensions } : undefined,
    title: slide?.title,
    text: slide?.text,
  };
}

let cached: ReturnType<typeof load> | null = null;

function loadOnce() {
  cached ??= load();
  return cached;
}

/** Páginas estáticas/shell: devuelve su `seo` propio + el fallback global, en un solo await. */
export async function getPageSeo(
  page: SeoPage
): Promise<{ seo: ResolvedSeo | undefined; siteSettings: SiteSeoSettings }> {
  const { siteSettings, pages } = await loadOnce();
  return { seo: pages[page], siteSettings };
}

/** Internas de detalle: solo el fallback global — el `seo` lo pone el documento. */
export async function getSeoSettings(): Promise<SiteSeoSettings> {
  return (await loadOnce()).siteSettings;
}

/** Contenido editable de Contact (Etapa 10). Misma promesa cacheada que `getPageSeo`/`getSeoSettings`. */
export async function getContactContent(): Promise<ContactContent> {
  return (await loadOnce()).contactContent;
}

/** Contenido editable de Home (Etapa 10). Misma promesa cacheada, sin query extra. */
export async function getHomeContent(): Promise<HomeContent> {
  return (await loadOnce()).homeContent;
}

/**
 * Copy del shell de EdTech Mentor (Etapa 11). Misma promesa cacheada: la página ya
 * awaitea `getPageSeo('mentor')`, así que esto no agrega ni un request.
 */
export async function getMentorContent(): Promise<MentorContent> {
  return (await loadOnce()).mentorContent;
}

/**
 * "What Sets 27zero Apart" (Etapa 10). Lo pide `ShapesSlider`, que se renderiza en
 * 3 páginas — las 3 comparten esta misma promesa memoizada, sin query extra.
 */
export async function getApartSection(): Promise<ApartSectionContent> {
  return (await loadOnce()).apartSection;
}
