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
  role?: string;
  name?: string;
  avatar?: { src: string; alt: string };
  /** Alternativa al avatar: iniciales dentro del círculo. */
  avatarInitials?: string;
}

/**
 * Un bloque de `MentorCategorySection`. `heading`/`headingAccent`/`subtext` son copy
 * de la página (maquetación única, CLAUDE.md §4) — no salen de Sanity; lo único que
 * viene del CMS son los `items`.
 */
export interface MentorGroup {
  /** `id` del `.category-anchor` y `data-filter` del pill correspondiente. */
  id: string;
  /** Texto base del `h2` (Lora), sin la palabra de acento. */
  heading: string;
  /** Palabra final del `h2`, en `<span class="inter-accent">` (Inter). */
  headingAccent: string;
  subtext: string;
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
