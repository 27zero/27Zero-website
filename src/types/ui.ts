import type { PortableTextBlock } from './sanity';

// Shapes de presentación que consumen los componentes de `sections/`.
//
// Migrados desde `lib/mockData/` en Etapa 6: los mocks se borran, pero estos tipos
// no eran data — eran el contrato entre página y componente. Viven acá porque no son
// espejo de ningún schema de Sanity: son la forma que la página arma DESPUÉS de
// resolver la query (agrupar, derivar iniciales, formatear fecha).
//
// Nota de naming: en los mocks el shape de grupo se llamaba `WorkCategory`, nombrado
// por su primer uso aunque el propio mock aclaraba que era genérico (Clientes lo
// reutiliza agrupando por cliente, no por categoría). Acá pasa a `WorkGroup` porque
// `WorkCategory` ya es el documentType real de Sanity en `types/sanity.ts` y tenerlos
// homónimos obligaría a aliasear en cada import.

/* ─────────────────────────── Work / Clientes ──────────────────────────── */

/** Props de `WorkCard`, ya resueltas contra Sanity. */
export interface WorkCardData {
  href: string;
  title: string;
  eyebrow?: string;
  image?: { src: string; alt: string };
  clientName?: string;
  clientLogo?: { src: string; alt: string };
  /** Alternativa al logo: iniciales del cliente dentro del círculo. */
  clientInitials?: string;
}

/**
 * Un bloque de `CategorySliders`: título + slider. Work agrupa por categoría de
 * servicio, Clientes por cliente — misma forma, distinto criterio.
 */
export interface WorkGroup {
  /** Slug: `id` del `.category-anchor` y `data-filter` del pill correspondiente. */
  id: string;
  label: string;
  items: WorkCardData[];
}

/* ───────────────────────────── EdTech Mentor ──────────────────────────── */

/** Props compartidas por `EdtechMentorCard` y `FeaturedCard`. */
export interface MentorCardData {
  href: string;
  title: string;
  tag?: string;
  /** Fondo de `.card-edtech-mentor-body`, desde `edtechMentor.thumbnail`. */
  image?: { src: string; alt: string };
  role?: string;
  name?: string;
  avatar?: { src: string; alt: string };
  /** Alternativa al avatar: iniciales dentro del círculo. */
  avatarInitials?: string;
}

/**
 * Props de `FeaturedCard` cuando el origen NO es una entrevista.
 *
 * El componente nació consumiendo `MentorCardData` por spread, y esas props siguen
 * siendo compatibles; este tipo es el mismo contrato con nombres genéricos, para las
 * páginas que le pasan un `work` (el destacado del Intro de Home). No es
 * `WorkCardData`: ese es el contrato de `WorkCard.astro`, con `eyebrow`,
 * `clientName` y `clientLogo` en vez de `tag`, `name` y `avatar`.
 */
export interface FeaturedCardData {
  href: string;
  title: string;
  tag?: string;
  name?: string;
  role?: string;
  avatar?: { src: string; alt: string };
  avatarInitials?: string;
  /** Fondo de la card, desde `work.thumbnail`. */
  image?: { src: string; alt: string };
}

/**
 * Un bloque de `MentorCategorySection` — un documento `mentorCategory` ya resuelto.
 *
 * Hasta Etapa 10 el copy (`heading`/`headingAccent`/`subtext`) era constante de la
 * página y solo los `items` salían del CMS. En Etapa 11 la categoría pasó a ser
 * documento y se llevó su propio copy con ella: el encabezado dejó de partirse en dos
 * strings (base + acento) porque ahora es Portable Text de una línea, donde el tramo
 * acentuado lo marca el editor con cursiva y lo traduce `accentMarkComponents`.
 */
export interface MentorCategoryGroup {
  /** Slug de la categoría: `id` del `.category-anchor` y `data-filter` de su pill. */
  id: string;
  /** Título del CMS. Label del pill y del botón "Go to {título}". */
  title: string;
  /** `sectionHeadline`: Portable Text de una línea con el mark `em` como acento. */
  headline?: PortableTextBlock[];
  subtitle?: string;
  /** `ctaUrl`. Vacío → el botón "Go to {título}" no se renderiza. */
  ctaUrl?: string;
  items: MentorCardData[];
}

/* ──────────────────────────── EdTech Marketing ────────────────────────── */

/** Props de `ServiceCard` + el `iconId` que resuelve `ServiceIcon`. */
export interface ServiceCardData {
  href: string;
  title: string;
  iconId: string;
}

/** Un bloque de `ServiceCategoryBlock`: título de categoría + grid de servicios. */
export interface ServiceGroup {
  title: string;
  services: ServiceCardData[];
}

/* ─────────────────────────────── Resources ────────────────────────────── */

/** Props compartidas por `ResourceCard` y `ResourceCardFeatured`. */
export interface ResourceCardData {
  href: string;
  /** Ya formateada para display (ej. "June 19, 2026"), no ISO. */
  date: string;
  title: string;
  description: string;
  image?: { src: string; alt: string };
}
