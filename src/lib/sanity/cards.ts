/**
 * Adaptadores proyección GROQ → props de card — 27zero.
 *
 * No es un shim para sostener el shape de los mocks (eso es justo lo que Etapa 6
 * elimina): es el mapeo que igual habría que escribir en cada página, porque hay tres
 * cosas que GROQ no puede resolver y TypeScript sí necesita resueltas —
 *
 *   1. la URL de la imagen, que depende de `urlFor()` y del ancho de cada contexto;
 *   2. el `href` de la interna, que se arma con los builders de `utils/routes`;
 *   3. el fallback a iniciales cuando no hay foto ni logo cargado.
 *
 * Vive acá y no en cada `.astro` porque las mismas cards aparecen en 5 páginas
 * (`WorkCard` en Home, About, Work y Clientes; las de mentor en Home, About y EdTech
 * Mentor) y duplicar el mapeo garantizaría que se desincronicen.
 *
 * Los tipos de proyección de abajo son el contrato de los fragmentos de `queries.ts`
 * (`WORK_CARD_FIELDS`, `MENTOR_CARD_FIELDS`, `TESTIMONIAL_FIELDS`): si se agrega o
 * saca un campo de un fragmento, se actualiza el tipo acá, mismo ciclo.
 */
import type { SanityImage } from '../../types/sanity';
import type { FeaturedCardData, MentorCardData, ResourceCardData, WorkCardData } from '../../types/ui';
import { formatDate, getInitials } from '../utils/format';
import { mentorUrl, resourceUrl, workUrl } from '../utils/routes';
import { toImage } from './image';

/* ────────────────────────── Tipos de proyección ───────────────────────── */

/** Devuelve `WORK_CARD_FIELDS`. */
export interface WorkCardProjection {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  isFeatured?: boolean;
  order?: number;
  thumbnail?: SanityImage;
  clientLogo?: SanityImage;
  clientName?: string;
  categoryTitle?: string;
  categorySlug?: string;
}

/** Devuelve `MENTOR_CARD_FIELDS`. */
export interface MentorCardProjection {
  _id: string;
  title?: string;
  slug: string;
  guestName?: string;
  guestRole?: string;
  guestCompany?: string;
  guestPhoto?: SanityImage;
  thumbnail?: SanityImage;
  /** Título de la `mentorCategory` referenciada, ya resuelto por la query. */
  categoryTitle?: string;
  isFeatured?: boolean;
  publishedAt?: string;
}

/** Devuelve `TESTIMONIAL_FIELDS`. */
export interface TestimonialProjection {
  _id: string;
  quote: string;
  authorName?: string;
  authorRole?: string;
  avatarPhoto?: SanityImage;
  order?: number;
}

/** Devuelve el key `resources` de `resourceListQuery`. */
export interface ResourceProjection {
  _id: string;
  title?: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  publishedAt?: string;
  cardThumbnail?: SanityImage;
}

/* ──────────────────────────── Anchos de imagen ─────────────────────────── */

/**
 * Ancho al que se le pide cada imagen al Image CDN de Sanity, por contexto de render.
 *
 * Los valores NO son estimados: salen de medir el ancho CSS real de cada `<img>` en el
 * build servido, en desktop (1440px) y en mobile (390px), y tomar el mayor × 2 para
 * cubrir pantallas de densidad doble. Antes había un `700` fijo para todo (Etapa 8), que
 * daba de casualidad el valor correcto para las cards y 6x de más para el logo.
 *
 * Cada mapper acepta un override, porque el mismo documento se renderiza a tamaños
 * distintos según la página que lo pida (es lo que `toResourceCard` ya hacía con
 * `imageWidth` desde Etapa 6).
 *
 * | contexto              | render CSS máx. | ancho pedido |
 * |-----------------------|-----------------|--------------|
 * | card de work          | 350px           | 700          |
 * | card de mentor        | 350px           | 700          |
 * | logo de cliente       | 28px            | 64           |
 * | avatar de invitado    | 50px            | 128          |
 */
const CARD_IMAGE_WIDTH = 700;

/** 28px de render — `160` servía una imagen casi 6x más grande de lo necesario. */
const CLIENT_LOGO_WIDTH = 64;

/**
 * Se queda en 128 y no baja a 100 (50px × 2) a propósito: es la única imagen del set que
 * cae dentro del rango de las pantallas 3x, donde 100 se vería blando. A este tamaño la
 * diferencia de bytes es despreciable y Lighthouse no la marca.
 */
const AVATAR_WIDTH = 128;

/* ──────────────────────────────── Mappers ─────────────────────────────── */

/**
 * `work` → props de `WorkCard`.
 *
 * `eyebrow` es la categoría en Work/Home y el cliente en Clientes, así que se recibe
 * en `options`: es criterio de la página, no del documento. En el vanilla iba entre
 * corchetes (`[Client Name]`) porque era placeholder — con contenido real el texto va
 * limpio, y el `capitalize` lo resuelve el CSS de la card.
 */
export function toWorkCard(
  work: WorkCardProjection,
  options: { eyebrow?: string; imageWidth?: number } = {}
): WorkCardData {
  return {
    href: workUrl(work.slug),
    title: work.title,
    eyebrow: options.eyebrow ?? work.categoryTitle,
    image: toImage(work.thumbnail, { width: options.imageWidth ?? CARD_IMAGE_WIDTH }),
    clientName: work.clientName,
    clientLogo: toImage(work.clientLogo, { width: CLIENT_LOGO_WIDTH }),
    /* Solo si no hay logo: la card muestra uno u otro, nunca los dos. */
    clientInitials: work.clientLogo ? undefined : getInitials(work.clientName),
  };
}

/**
 * `edtechMentor` → props de `EdtechMentorCard` / `FeaturedCard`.
 *
 * `tag` toma el título de la categoría referenciada. En el vanilla decía literalmente
 * "Tag" porque no había dato detrás; desde Etapa 11 sale de `mentorCategory.title`, o
 * sea que el editor controla ese chip sin tocar código.
 *
 * `title` es el título del episodio y es lo que la card muestra en el hover; el nombre
 * del invitado va aparte, en `name`. Cae a `guestName` solo cuando `title` está vacío:
 * hay documentos reales cargados a medias, y una card sin ningún texto no es navegable.
 */
export function toMentorCard(
  mentor: MentorCardProjection,
  options: { imageWidth?: number } = {}
): MentorCardData {
  const avatar = toImage(mentor.guestPhoto, { width: AVATAR_WIDTH, height: AVATAR_WIDTH });

  return {
    href: mentorUrl(mentor.slug),
    title: mentor.title ?? mentor.guestName ?? '',
    tag: mentor.categoryTitle,
    role: mentor.guestRole ?? mentor.guestCompany,
    name: mentor.guestName,
    /* Fondo de la card. Es `thumbnail` y NO `guestPhoto`: esa última es la foto de la
       persona y ya se usa como avatar del header, acá arriba. */
    image: toImage(mentor.thumbnail, { width: options.imageWidth ?? CARD_IMAGE_WIDTH }),
    avatar,
    avatarInitials: avatar ? undefined : getInitials(mentor.guestName),
  };
}

/**
 * `work` → props de `FeaturedCard`, para el destacado de la sección Intro de Home.
 *
 * El mapeo replica el de `toWorkCard()` campo por campo, traducido a los nombres
 * genéricos del componente: la categoría entra como `tag`, el cliente como `name` y
 * su logo como `avatar`, con las mismas iniciales de fallback. `role` queda afuera —
 * `work` no tiene nada equivalente al rol del invitado de una entrevista.
 */
export function toFeaturedWorkCard(work: WorkCardProjection): FeaturedCardData {
  const avatar = toImage(work.clientLogo, { width: CLIENT_LOGO_WIDTH });

  return {
    href: workUrl(work.slug),
    title: work.title,
    tag: work.categoryTitle,
    name: work.clientName,
    avatar,
    /* Solo si no hay logo: la card muestra uno u otro, nunca los dos. */
    avatarInitials: avatar ? undefined : getInitials(work.clientName),
    image: toImage(work.thumbnail, { width: CARD_IMAGE_WIDTH }),
  };
}

/**
 * `resource` → props de `ResourceCard` / `ResourceCardFeatured`.
 *
 * La bajada usa `shortDescription` y cae a `description` si está vacía: son dos campos
 * distintos por schema, pero el brief de Etapa 5 (§4) los deja marcados como posible
 * duplicado a revisar con contenido real. Hasta que se decida, la card prefiere la
 * corta y no se queda sin texto si el editor solo cargó la larga.
 */
export function toResourceCard(
  resource: ResourceProjection,
  options: { imageWidth: number }
): ResourceCardData {
  return {
    href: resourceUrl(resource.slug),
    date: formatDate(resource.publishedAt),
    title: resource.title ?? '',
    description: resource.shortDescription ?? resource.description ?? '',
    image: toImage(resource.cardThumbnail, { width: options.imageWidth }),
  };
}
