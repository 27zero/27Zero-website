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
import type { InterviewCategory, SanityImage } from '../../types/sanity';
import { INTERVIEW_CATEGORY_LABELS } from '../../types/sanity';
import type { MentorCardData, ResourceCardData, WorkCardData } from '../../types/ui';
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
  interviewCategory?: InterviewCategory;
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

/** Devuelve `resourceListQuery`. */
export interface ResourceProjection {
  _id: string;
  title?: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  publishedAt?: string;
  cardThumbnail?: SanityImage;
}

/* ──────────────────────────────── Mappers ─────────────────────────────── */

/**
 * `work` → props de `WorkCard`.
 *
 * `eyebrow` es la categoría en Work/Home y el cliente en Clientes, así que se recibe
 * como parámetro: es criterio de la página, no del documento. En el vanilla iba entre
 * corchetes (`[Client Name]`) porque era placeholder — con contenido real el texto va
 * limpio, y el `capitalize` lo resuelve el CSS de la card.
 */
export function toWorkCard(work: WorkCardProjection, eyebrow?: string): WorkCardData {
  return {
    href: workUrl(work.slug),
    title: work.title,
    eyebrow: eyebrow ?? work.categoryTitle,
    image: toImage(work.thumbnail, { width: 700 }),
    clientName: work.clientName,
    clientLogo: toImage(work.clientLogo, { width: 160 }),
    /* Solo si no hay logo: la card muestra uno u otro, nunca los dos. */
    clientInitials: work.clientLogo ? undefined : getInitials(work.clientName),
  };
}

/**
 * `edtechMentor` → props de `EdtechMentorCard` / `FeaturedCard`.
 *
 * `tag` toma el label de la categoría de entrevista. En el vanilla decía literalmente
 * "Tag" porque no había dato detrás; ahora que `interviewCategory` existe, es lo que
 * ese chip estaba esperando.
 *
 * `title` es el título del episodio y es lo que la card muestra en el hover; el nombre
 * del invitado va aparte, en `name`. Cae a `guestName` solo cuando `title` está vacío:
 * hay documentos reales cargados a medias, y una card sin ningún texto no es navegable.
 */
export function toMentorCard(mentor: MentorCardProjection): MentorCardData {
  const avatar = toImage(mentor.guestPhoto, { width: 128, height: 128 });

  return {
    href: mentorUrl(mentor.slug),
    title: mentor.title ?? mentor.guestName ?? '',
    tag: mentor.interviewCategory ? INTERVIEW_CATEGORY_LABELS[mentor.interviewCategory] : undefined,
    role: mentor.guestRole ?? mentor.guestCompany,
    name: mentor.guestName,
    /* Fondo de la card. Es `thumbnail` y NO `guestPhoto`: esa última es la foto de la
       persona y ya se usa como avatar del header, acá arriba. */
    image: toImage(mentor.thumbnail, { width: 700 }),
    avatar,
    avatarInitials: avatar ? undefined : getInitials(mentor.guestName),
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
