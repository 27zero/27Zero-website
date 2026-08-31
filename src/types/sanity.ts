// Espejo manual de los schemas definidos en 27zero-sanity/schemas.
// No hay build step ni sincronización automática entre repos: cuando se
// modifique un schema en el Studio, actualizar este archivo en el mismo
// ciclo de trabajo (mismos nombres de campo, mismos tipos, misma opcionalidad).
// Ver CLAUDE.md sección 8 — "Contrato de tipos".
//
// Estado: espejo del schema tal como quedó curado en Etapa 5 (ver
// `brief-cierre-etapa-5.md` §3 y §4).
//
// Criterio de opcionalidad: solo los campos con `Rule.required()` en el schema van
// como no-opcionales. Todo lo demás es `?`, incluso si hoy está cargado en los
// documentos reales — el editor puede vaciarlo desde el Studio sin que TypeScript
// se entere.

/* ────────────────────────────── Primitivas ────────────────────────────── */

/** Referencia sin expandir. Cuando la query usa `->`, el tipo pasa a ser el documento. */
export interface SanityReference {
  _ref: string;
  _type: 'reference';
}

export interface SanitySlug {
  _type: 'slug';
  current: string;
}

/**
 * Imagen de Sanity. `alt` y `caption` son campos custom que agrega el schema, no
 * parte del tipo `image` nativo — por eso no están en todas: `settings.logo`,
 * `client.logo` y `edtechMarketingPractice.heroImage` no los declaran.
 */
export interface SanityImage {
  _type: 'image';
  asset: SanityReference;
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string;
  caption?: string;
}

/**
 * Portable Text. Se tipa estructuralmente en vez de importar `@portabletext/types`:
 * hoy ningún componente lo renderiza (eso entra con las páginas de detalle), así que
 * sumar la dependencia solo por el tipo sería adelantar una decisión de renderer.
 */
export interface PortableTextBlock {
  _type: string;
  _key: string;
  [key: string]: unknown;
}

/** Campos que Sanity agrega a todo documento. */
export interface SanityDocument {
  _id: string;
  _type: string;
  _createdAt: string;
  _updatedAt: string;
  _rev: string;
}

/* ──────────────────────── Object types compartidos ────────────────────── */

/** `seo.ts` — embebido en todo documentType que renderiza una página propia. */
export interface Seo {
  title?: string;
  description?: string;
  ogImage?: SanityImage;
  canonicalUrl?: string;
  noIndex?: boolean;
}

/* ──────────────────────────── Taxonomías ──────────────────────────────── */

/**
 * `edtechMarketingService.category` y `edtechMarketingPractice.relatedServiceCategory`
 * — la misma lista de 8 valores, declarada por separado en cada schema.
 *
 * ⚠️ Taxonomía INDEPENDIENTE de `workCategory`: no comparte doctype, campo ni valores
 * (esta tiene "Project Management", "Content Development" y "Others"; `workCategory`
 * tiene "Thought Leadership Programs" y "Content Marketing"). Se parecen de nombre en
 * algunos casos y no son lo mismo.
 */
export type ServiceCategoryId =
  | 'ux-ui-web-design'
  | 'brand-messaging-strategy'
  | 'project-management'
  | 'events'
  | 'content-development'
  | 'marketing-programs'
  | 'strategic-services'
  | 'others';

/** Labels de `ServiceCategoryId`, en el orden en que se muestran en EdTech Marketing. */
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategoryId, string> = {
  'ux-ui-web-design': 'UX/UI & Web Design',
  'brand-messaging-strategy': 'Brand & Messaging Strategy',
  'project-management': 'Project Management',
  events: 'Events',
  'content-development': 'Content Development',
  'marketing-programs': 'Marketing Programs',
  'strategic-services': 'Strategic Services',
  others: 'Others',
};

/** Orden de aparición de las categorías en el menú de servicios (orden del vanilla). */
export const SERVICE_CATEGORY_ORDER: ServiceCategoryId[] = [
  'ux-ui-web-design',
  'brand-messaging-strategy',
  'project-management',
  'events',
  'content-development',
  'marketing-programs',
  'strategic-services',
  'others',
];

/** Íconos de `ServiceIcon.astro` — espejo de `ICON_OPTIONS` del schema. */
export type ServiceIconId = 'asterisk' | 'quatrefoil' | 'arc';

/**
 * Íconos de `PracticeIcon.astro`. Ya NO es espejo de nada: `edtechMarketingPractice`
 * perdió su campo `iconId`, porque los 3 íconos de la grilla son fijos y posicionales
 * (`PRACTICE_ICONS` en `edtech-marketing.astro`), no contenido editable.
 */
export type PracticeIconId = 'waves' | 'spiral' | 'square-circle';

/* ───────────────────────────── documentTypes ──────────────────────────── */

/**
 * `workCategory` — taxonomía de Work, pero como DOCUMENTO, no como lista cerrada.
 *
 * Por eso `slug.current` queda `string` y no una union de los 7 valores actuales: el
 * editor puede crear una categoría nueva desde el Studio y la union mentiría en el
 * primer alta. La lista de 7 sale siempre de la query, nunca de un tipo. (Contraste
 * con `ServiceCategoryId`, que sí es una `options.list` cerrada.)
 */
export interface WorkCategory extends SanityDocument {
  _type: 'workCategory';
  title: string;
  slug: SanitySlug;
  description?: string;
  color?: string;
}

/**
 * `mentorCategory` — taxonomía de EdTech Mentor. Mismo shape que `workCategory`, pero
 * además es dueña del copy de su propia sección en la página de índice: cada categoría
 * trae su headline, su bajada y el link a la página de la serie (Etapa 11).
 *
 * Reemplazó a la vieja lista cerrada `interviewCategory`: como es documento y no
 * `options.list`, el editor puede crear categorías nuevas desde el Studio — la lista
 * sale siempre de la query, nunca de un tipo.
 *
 * El botón "Go to {título}" NO tiene campo propio: se computa de `title` en el sitio.
 */
export interface MentorCategory extends SanityDocument {
  _type: 'mentorCategory';
  title: string;
  slug: SanitySlug;
  description?: string;
  color?: string;
  order: number;
  /**
   * Portable Text de una sola línea, igual que los `headline` de Home: el editor marca
   * en cursiva el tramo del acento tipográfico y `accentMarkComponents` lo traduce.
   */
  sectionHeadline: PortableTextBlock[];
  sectionSubtitle?: string;
  /** Vacío → el botón "Go to {título}" no se renderiza. */
  ctaUrl?: string;
}

/**
 * `author` — quién escribió el contenido. Referenciado desde `resource` y
 * `edtechMentor`, requerido en ambos desde Etapa 7 (lo necesita el `author` del
 * JSON-LD de Article).
 *
 * Ojo en `edtechMentor`: el author es 27zero, no el entrevistado — el guest es el
 * sujeto del artículo (`about` en schema.org), no su autor.
 */
export interface Author extends SanityDocument {
  _type: 'author';
  name: string;
  slug: SanitySlug;
  role?: string;
  company?: string;
  photo?: SanityImage;
  bio?: string;
  linkedin?: string;
  email?: string;
}

/** `client` — marca. Fuente de verdad del nombre de cliente en `work` y `testimonial`. */
export interface Client extends SanityDocument {
  _type: 'client';
  name: string;
  url?: string;
  logo?: SanityImage;
  logoLight?: SanityImage;
  isFeatured?: boolean;
  logoHeight?: number;
  logoOrder?: number;
  description?: string;
}

/** `work` — un case study. Alimenta Work, Clientes y la interna compartida. */
export interface Work extends SanityDocument {
  _type: 'work';

  // Overview
  title: string;
  slug: SanitySlug;
  client: SanityReference | Client;
  clientLogo?: SanityImage;
  category: SanityReference | WorkCategory;
  services?: string[];
  projectType?: string;
  agencyRole?: string;
  year?: number;
  excerpt: string;
  clientTagline?: string;

  // Metadata
  /** Asumió el rol del slider "Los mejores" — no es una categoría más (Etapa 5). */
  isFeatured?: boolean;
  order?: number;

  // Media
  thumbnail?: SanityImage;
  heroImage?: SanityImage;
  heroVideo?: string;
  gallery?: SanityImage[];

  // Case study
  brief?: string;
  description?: {
    projectTitle?: string;
    projectContent?: PortableTextBlock[];
    projectImages?: SanityImage[];
  };
  challenge?: {
    challengeTitle?: string;
    challengeContent?: PortableTextBlock[];
    challengeImages?: SanityImage[];
  };
  solution?: {
    headline?: string;
    body?: PortableTextBlock[];
    solutionImages?: SanityImage[];
  };
  impact?: { _key: string; verb?: string; result?: string }[];
  results?: { _key: string; number?: string; description?: string }[];
  contentSections?: {
    _key: string;
    title?: string;
    body?: string;
    images?: SanityImage[];
  }[];
  contributions?: string[];
  location?: string;

  seo?: Seo;
}

/**
 * `testimonial` — un slide del slider de Home.
 *
 * `workProject` es el único vínculo con `work`: el objeto embebido `work.testimonial`
 * se eliminó en Etapa 5, así que traer los testimonios de un `work` es una query
 * INVERSA desde acá (`*[_type == "testimonial" && workProject._ref == $workId]`).
 */
export interface Testimonial extends SanityDocument {
  _type: 'testimonial';
  quote: string;
  /** Si hay `client`, el nombre canónico sale de `client->name` vía `coalesce()`. */
  authorName?: string;
  authorRole?: string;
  avatarPhoto?: SanityImage;
  backgroundPhoto?: SanityImage;
  isFeatured?: boolean;
  order?: number;
  client?: SanityReference | Client;
  workProject?: SanityReference | Work;
}

/** `team` — un integrante del equipo. Grid de About. */
export interface Team extends SanityDocument {
  _type: 'team';
  name: string;
  role: string;
  photo?: SanityImage;
  isActive?: boolean;
  order?: number;
}

/** `resource` — un artículo de Resources. */
export interface Resource extends SanityDocument {
  _type: 'resource';
  title?: string;
  slug?: SanitySlug;
  /** Bajada corta de la card. Distinta de `description` (el body largo del hero). */
  shortDescription?: string;
  description?: string;
  publishedAt?: string;
  /** Requerido en el schema — `SanityReference` sin `->`, `Author` con `->`. */
  author: SanityReference | Author;
  /** Imagen de la card en el listado (ex `featuredImage`, renombrada en Etapa 5). */
  cardThumbnail?: SanityImage;
  /** Imagen del hero de la interna — NO se usa en el listado. */
  heroBanner?: SanityImage;
  body?: PortableTextBlock[];
  seo?: Seo;
}

/** Bloque insertable dentro de `edtechMentor.body` (Portable Text). */
export interface PearlOfWisdomBlock {
  _type: 'pearlOfWisdom';
  _key: string;
  quote?: string;
}

/** `edtechMentor` — una entrevista de The EdTech Mentor. */
export interface EdtechMentor extends SanityDocument {
  _type: 'edtechMentor';

  // Guest
  guestName?: string;
  guestCompany?: string;
  guestRole?: string;
  guestPhoto?: SanityImage;

  // Content
  title?: string;
  shortDescription?: string;
  thumbnail?: SanityImage;
  highlightTitle?: string;
  bannerPost?: SanityImage;
  /** Fieldset `interviewIntro`. */
  introText?: string;
  /** Fieldset `interviewIntro`. */
  mainImage?: SanityImage;
  body?: (PortableTextBlock | PearlOfWisdomBlock)[];
  rapidFire?: {
    description?: string;
    image?: SanityImage;
    questions?: { _key: string; question?: string; answer?: string }[];
  };

  // Metadata
  slug?: SanitySlug;
  /** Requerido en el schema — `SanityReference` sin `->`, `MentorCategory` con `->`. */
  category: SanityReference | MentorCategory;
  isFeatured?: boolean;
  publishedAt?: string;
  /** Requerido en el schema — `SanityReference` sin `->`, `Author` con `->`. */
  author: SanityReference | Author;
  linkedinUrl?: string;
  mediumUrl?: string;

  seo?: Seo;
}

/** `edtechMarketingPractice` — una de las 3 prácticas. Card en EdTech Marketing + interna. */
export interface EdtechMarketingPractice extends SanityDocument {
  _type: 'edtechMarketingPractice';

  // Card
  title: string;
  slug: SanitySlug;
  shortDescription: string;
  /** Fondo de la card de la práctica en el índice de EdTech Marketing (800×600). */
  cardImage?: SanityImage;
  order?: number;
  relatedServiceCategory?: ServiceCategoryId;

  // Page Content — fieldset `intro`
  introTitle?: string;
  introDescription?: string;
  capabilities?: string[];

  // Hero
  heroHeadline?: string;
  heroText?: string;
  heroImage?: SanityImage;

  // Fieldset `clients`
  clientSectionTitle?: string;
  clientNames?: string[];

  // Fieldset `practiceScopes`
  practiceScopesTitle?: string;
  practiceScopes?: {
    _key: string;
    title?: string;
    description?: string;
    ctaLabel?: string;
    ctaHref?: string;
  }[];

  // Fieldset `pageCta`
  ctaTitle?: string;
  ctaLabel?: string;
  ctaHref?: string;

  seo?: Seo;
}

/** `edtechMarketingService` — un servicio del menú de EdTech Marketing + interna. */
export interface EdtechMarketingService extends SanityDocument {
  _type: 'edtechMarketingService';
  title: string;
  slug: SanitySlug;
  category: ServiceCategoryId;
  iconId?: ServiceIconId;
  description?: string;

  // Fieldset `intro`
  introTitle?: string;
  introDescription?: string;

  // Fieldset `features`
  featuresTitle?: string;
  features?: { _key: string; title?: string; description?: string }[];

  // Fieldset `proofPoint`
  proofPointTitle?: string;
  proofPointDescription?: string;
  proofPointImage?: SanityImage;

  // Fieldset `pageCta`
  ctaTitle?: string;
  ctaLabel?: string;
  ctaHref?: string;

  seo?: Seo;
}

/* ──────────────────────────────── Singleton ───────────────────────────── */

interface LinkItem {
  _key: string;
  label?: string;
  href?: string;
}

/**
 * Uno de los 3 slides fijos de "What Sets 27zero Apart" — los tres comparten shape.
 * Fijos y no un array: el componente siempre muestra exactamente 3.
 */
interface ApartSlide {
  image?: SanityImage;
  title?: string;
  text?: string;
}

/** Card del bloque final de Contact — `bookCard` y `subscribeCard` comparten shape. */
interface ContactCard {
  title?: string;
  subtitle?: string;
  link?: string;
  bgImage?: SanityImage;
}

/**
 * `settings` — singleton de configuración del sitio.
 *
 * ⚠️ El `name` del documentType en el Studio es `settings`, NO `siteSettings`:
 * `CLAUDE.md` §4 y §8 lo llaman `siteSettings` por su rol, pero las queries GROQ
 * tienen que filtrar por `_type == "settings"`.
 */
export interface Settings extends SanityDocument {
  _type: 'settings';

  // Identity
  siteTitle?: string;
  siteDescription?: string;
  siteUrl?: string;
  logo?: SanityImage;

  /** Fallback global de SEO — hereda cualquier campo que la página deje vacío. */
  seo?: Seo;

  // Analytics
  gaId?: string;
  hubspotId?: string;

  // Social
  linkedinUrl?: string;
  twitterUrl?: string;

  // Navbar
  navbarCta?: { text?: string; url?: string; micro?: string };
  navbarWorkDropdown?: { items?: LinkItem[] };

  // Footer
  footerCta?: { eyebrow?: string; headline?: string; text?: string; buttonText?: string };
  footerNavigation?: { links?: LinkItem[] };
  footerCopyright?: { year?: string };

  /**
   * "What Sets 27zero Apart" — componente compartido, no contenido de Home.
   * Vivía como `homeApart` dentro del grupo `home` hasta la Etapa 10; se movió a su
   * propio grupo porque Home, About y EdTech Marketing renderizan el mismo slider.
   */
  apartSection?: {
    headline?: string;
    description?: string;
    slideOne?: ApartSlide;
    slideTwo?: ApartSlide;
    slideThree?: ApartSlide;
  };

  // Home
  /** SEO por página estática/shell (Etapa 7) — fallback a `settings.seo`. */
  homeSeo?: Seo;
  /**
   * Los `headline` de Home son Portable Text de una sola línea, no `string`: el editor
   * marca en cursiva el tramo que va con el acento tipográfico y el render lo traduce
   * (Etapa 10). El bloque solo habilita el decorador `em`.
   */
  homeHero?: {
    headline?: PortableTextBlock[];
    subtitle?: string;
    /** Si está vacío, el botón del hero no se renderiza. */
    ctaLink?: string;
    ctaCaption?: string;
    video?: string;
    poster?: SanityImage;
  };
  homeWork?: {
    headline?: PortableTextBlock[];
    subtitle?: string;
    showreelUrl?: string;
    /** Sin expandir. La query que la resuelve a datos de card entra con el wiring. */
    featuredWork?: SanityReference;
  };
  homeMentor?: { headline?: PortableTextBlock[]; subtitle?: string };
  homeNewsletter?: { headline?: string; placeholder?: string };

  // About
  aboutSeo?: Seo;
  aboutHero?: { headline?: string; text?: string; image?: SanityImage };
  aboutDna?: { headline?: string; text?: string };
  aboutProofPoint?: { title?: string; text?: string; image?: SanityImage };
  aboutTeam?: { headline?: string; text?: string };

  // Work
  workSeo?: Seo;
  workHero?: { eyebrow?: string; headline?: string; subtitle?: string };

  // Clientes — misma plantilla que Work, distinta vista.
  clientsSeo?: Seo;
  clientsHero?: { eyebrow?: string; headline?: string; subtitle?: string };

  // Mentor
  mentorSeo?: Seo;
  mentorHero?: { headline?: string; text?: string };
  /**
   * El primer botón ("Let's Talk" → `/contact`) está hardcodeado en el componente: es
   * ruta interna fija, no copy editable. Solo el secundario sale del CMS.
   */
  mentorCta?: {
    headline?: string;
    text?: string;
    secondaryCtaText?: string;
    /** Vacío → el segundo botón no se renderiza. */
    secondaryCtaLink?: string;
  };

  // Resources
  resourcesSeo?: Seo;
  resourcesHero?: { headline?: string; subtitle?: string };

  // Contact
  contactSeo?: Seo;
  contactHero?: { headline?: string; text?: string; ctaLink?: string };
  contactEmail?: string;
  officeUSNew?: { address?: string; phone?: string; email?: string };
  officeCONew?: { address?: string; phone?: string; email?: string };
  /** Legacy plano — reemplazado por `officeUSNew`, todavía en el schema. */
  officeUS?: string;
  /** Legacy plano — reemplazado por `officeCONew`, todavía en el schema. */
  officeCO?: string;
  /** Fieldset `form` — encabezado del formulario de contacto. */
  formTitle?: string;
  formSubtitle?: string;
  /** Fieldset `bottomCards` — título de la sección de cards al pie de Contact. */
  waysTitle?: string;
  bookCard?: ContactCard;
  subscribeCard?: ContactCard;

  // EdTech Marketing
  agencySeo?: Seo;
  agencyHero?: {
    headline?: string;
    text?: string;
    image?: SanityImage;
    /** Si está vacío, el botón del hero no se renderiza. */
    ctaLink?: string;
    ctaCaption?: string;
  };
  agencyPracticesSection?: { headline?: string; text?: string };
  agencyClosingCta?: {
    headline?: string;
    /** Si está vacío, el botón no se renderiza. */
    ctaLink?: string;
  };
  /** Fieldset `services` — intro del menú de servicios (agregado en Etapa 5). */
  servicesTitle?: string;
  servicesDescription?: string;
}
