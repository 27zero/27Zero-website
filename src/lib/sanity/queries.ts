/**
 * Queries GROQ — 27zero.
 *
 * Una query por página (CLAUDE.md §10: varias queries por página inflan el build y
 * cuentan contra el límite de minutos de Netlify). Las páginas que necesitan datos de
 * varios documentTypes los piden en un solo objeto GROQ, no en varios `fetch()`.
 *
 * Las proyecciones traen las imágenes CRUDAS (el objeto `image` entero, con su `alt`),
 * no una URL: `urlFor()` necesita el `asset._ref` para pedirle el resize al CDN, así
 * que el mapeo a `{ src, alt }` lo hace la página con `toImage()`.
 *
 * ⚠️ El singleton se filtra por `_type == "settings"`, no `"siteSettings"`: ese es el
 * `name` real del documentType en el Studio (CLAUDE.md lo llama `siteSettings` por su
 * rol, no por su nombre).
 */
/* ─────────────────────────── Fragmentos comunes ───────────────────────── */

/**
 * Campos de `work` que consume una `WorkCard`. Nada del detalle del case study.
 *
 * Feedback Work (Notas 1 y 2): el círculo del cliente lee `client.icon`. Ronda 2: el
 * título de la card es `headline` (con `title` de respaldo, lo resuelve `toWorkCard`).
 * `clientLogo`, `excerpt` e `isFeatured` se eliminaron del schema.
 *
 * Feedback 2026-10-09: el título de la card pasa a ser `subtitle` (con `headline` de
 * respaldo) y el eyebrow, las practices del proyecto (`projectType[]->practiceName`,
 * nunca `title`). La categoría se sigue trayendo: es el `data-category` del filtro de
 * Work, aunque la card ya no la muestre.
 */
const WORK_CARD_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  headline,
  subtitle,
  "practices": projectType[]->practiceName,
  order,
  thumbnail,
  "clientName": client->name,
  "clientIcon": client->icon,
  "categoryTitle": category->title,
  "categorySlug": category->slug.current
`;

/**
 * Categorías destacadas de Work (Nota 9): reemplazan a `work.isFeatured` y al bloque
 * fijo "Los mejores". Cada una trae su selección curada en el orden del Studio.
 *
 * Se filtra por `isFeaturedCategory` y no solo por tener `featuredWorks`: el Studio
 * oculta el array cuando se desmarca la categoría, pero el dato puede quedar cargado.
 */
const FEATURED_WORK_CATEGORIES = `
  *[_type == "workCategory" && isFeaturedCategory == true && defined(slug.current)]
    | order(order asc, title asc) {
      _id,
      title,
      "slug": slug.current,
      "works": featuredWorks[]->{${WORK_CARD_FIELDS}}
    }
`;

/**
 * Campos de `edtechMentor` que consumen `EdtechMentorCard` y `FeaturedCard`.
 *
 * `categoryTitle` sale de la referencia expandida, no de un campo suelto: desde
 * Etapa 11 la categoría es un documento (`mentorCategory`) y su título es editable,
 * así que el chip de la card muestra lo que el editor cargue — antes salía de un
 * `Record` de labels hardcodeado contra la lista cerrada `interviewCategory`.
 *
 * `categoryColor`, `categoryTextColor` y `season` alimentan los pills de la card
 * (feedback EdTech Mentor, Notas 5.2 y 7.3; `textColor` es de la segunda ronda). La
 * season no tiene color de texto: el suyo se calcula siempre por contraste. El campo de color se llama `color` en ambos documentTypes — no
 * `accentColor`. `season` es opcional: sin referencia, la proyección da `null`.
 */
const MENTOR_CARD_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  guestName,
  guestRole,
  guestCompany,
  guestPhoto,
  thumbnail,
  "categoryTitle": category->title,
  "categoryColor": category->color,
  "categoryTextColor": category->textColor,
  "season": season->{title, color},
  isFeatured,
  publishedAt
`;

/**
 * `authorName` se resuelve con `coalesce(client->name, authorName)`: cuando el
 * testimonio está linkeado a un `client`, el nombre canónico es el del documento y el
 * campo suelto queda como fallback para testimonios sin cliente cargado (Modelo B
 * documentado en el schema).
 */
const TESTIMONIAL_FIELDS = `
  _id,
  quote,
  "authorName": coalesce(client->name, authorName),
  authorRole,
  avatarPhoto,
  order
`;

/* ──────────────────────────────── Home ────────────────────────────────── */

/**
 * Home — works destacados, la sección EdTech Mentor y los testimonios.
 *
 * `featuredWorkCategory` alimenta el slider de works destacados: desde el feedback de
 * Work (Nota 9) la selección vive en las categorías marcadas como destacadas, no en
 * `work.isFeatured`, que se eliminó del schema. Feedback 2026-10-09: Home muestra UNA
 * sola — la de menor `order` (`[0]` sobre el mismo orden de `FEATURED_WORK_CATEGORIES`)
 * —, con su `title` como título del slider. `null` si no hay ninguna marcada.
 *
 * `testimonials` es la lista general ordenada por `order`, no la filtrada por
 * proyecto: Home muestra todos los testimonios destacados, sin importar a qué `work`
 * pertenecen. La query inversa por `$workId` (`testimonialsByWorkQuery`) es para la
 * interna de `work`, que se arma en la sesión de detalle.
 */
/**
 * `settings` — solo lo que consumen el SEO y el structured data.
 *
 * Proyección acotada a propósito: el singleton tiene ~40 campos de copy de sección
 * que no tienen nada que ver con metadata. La resuelve `getPageSeo()` /
 * `getSeoSettings()` de `lib/sanity/settings.ts`, que memoiza el resultado — esta
 * query corre UNA vez por build, no una vez por cada una de las 13 páginas.
 *
 * `seo` es el fallback global; los 8 `{page}Seo` son el SEO por página
 * estática/shell (Etapa 7). Las 5 internas no salen de acá: traen su propio `seo`
 * desde su documento.
 */
export const siteSettingsSeoQuery = `
  *[_type == "settings"][0] {
    siteTitle,
    siteUrl,
    seo,
    logo,
    linkedinUrl,
    twitterUrl,
    officeUSNew,
    officeCONew,
    homeSeo,
    aboutSeo,
    workSeo,
    clientsSeo,
    mentorSeo,
    mentorHero,
    mentorCta,
    resourcesSeo,
    agencySeo,
    contactSeo,
    contactHero,
    formTitle,
    formSubtitle,
    waysTitle,
    bookCard,
    subscribeCard,
    homeHero,
    homeMentor,
    "homeWork": homeWork{
      ...,
      "featuredWork": featuredWork->{${WORK_CARD_FIELDS}}
    },
    apartSection
  }
`;

export const homeQuery = `{
  "featuredWorkCategory": ${FEATURED_WORK_CATEGORIES}[0],

  "featuredMentor": *[_type == "edtechMentor" && isFeatured == true && defined(slug.current)]
    | order(publishedAt desc)[0] {${MENTOR_CARD_FIELDS}, bannerPost},

  "mentorPosts": *[_type == "edtechMentor" && defined(slug.current)]
    | order(publishedAt desc)[0...6] {${MENTOR_CARD_FIELDS}},

  "testimonials": *[_type == "testimonial"
      && isFeatured == true
      && defined(coalesce(client->name, authorName))]
    | order(order asc) {${TESTIMONIAL_FIELDS}}
}`;

/**
 * Testimonios de UN `work`. Query INVERSA: `work.testimonial` (objeto embebido) se
 * eliminó en Etapa 5, el vínculo vive del lado de `testimonial` vía `workProject`.
 * La usa la interna de `work` (sesión de detalle), no ningún listado.
 */
export const testimonialsByWorkQuery = `
  *[_type == "testimonial" && workProject._ref == $workId]
    | order(order asc) {${TESTIMONIAL_FIELDS}}
`;

/* ──────────────────────────────── About ───────────────────────────────── */

/**
 * About — grid de equipo, slider de work y el copy de Proof Point.
 *
 * `isActive` filtra bajas sin borrarlas del Studio (ese es el motivo del campo).
 * `aboutProofPoint` sale de `settings`: hoy está vacío, así que la página aplica su
 * copy actual como default (ver nota de fallback en `about.astro`).
 */
export const aboutQuery = `{
  "team": *[_type == "team" && isActive == true]
    | order(order asc, name asc) {_id, name, role, photo},

  "works": *[_type == "work" && defined(slug.current)]
    | order(order asc, title asc)[0...6] {${WORK_CARD_FIELDS}},

  "featuredMentor": *[_type == "edtechMentor" && isFeatured == true && defined(slug.current)]
    | order(publishedAt desc)[0] {${MENTOR_CARD_FIELDS}, bannerPost},

  "mentorPosts": *[_type == "edtechMentor" && defined(slug.current)]
    | order(publishedAt desc)[0...6] {${MENTOR_CARD_FIELDS}},

  "proofPoint": *[_type == "settings"][0].aboutProofPoint {title, text, image},
  "aboutHero": *[_type == "settings"][0].aboutHero {headline, text, image, bgColor, textColor},
  "aboutDna": *[_type == "settings"][0].aboutDna,
  "aboutTeam": *[_type == "settings"][0].aboutTeam
}`;

/* ────────────────────────── Work / Clientes ───────────────────────────── */

/**
 * Work — las 7 categorías + todos los works. El agrupado se hace en la página, no en
 * GROQ: una query por categoría serían 7 round-trips en build para el mismo dataset.
 *
 * `categories` usa el campo `order` de `workCategory` (agregado en el Studio después
 * de 6B) para respetar el orden del Figma, con `title asc` como desempate para las
 * categorías que todavía no lo tengan cargado.
 *
 * `featuredCategories` son los sliders destacados que van arriba de todo (Nota 9).
 */
export const workListQuery = `{
  "featuredCategories": ${FEATURED_WORK_CATEGORIES},

  "categories": *[_type == "workCategory" && defined(slug.current)]
    | order(order asc, title asc) {_id, title, "slug": slug.current},

  "works": *[_type == "work" && defined(slug.current)]
    | order(order asc, title asc) {${WORK_CARD_FIELDS}},

  "hero": *[_type == "settings"][0].workHero
}`;

/**
 * Clientes — misma plantilla que Work con otro criterio de agrupación.
 *
 * Trae solo los `client` que tienen al menos un `work` publicado: un cliente sin
 * proyectos renderizaría un slider vacío con su pill apuntando a un anchor sin cards.
 * Los `work` vienen con `clientName` ya resuelto, y la página agrupa por ahí.
 */
export const workByClientQuery = `{
  "clients": *[_type == "client" && count(*[_type == "work" && client._ref == ^._id && defined(slug.current)]) > 0]
    | order(name asc) {_id, name},

  "works": *[_type == "work" && defined(slug.current) && defined(client)]
    | order(order asc, title asc) {${WORK_CARD_FIELDS}},

  "hero": *[_type == "settings"][0].clientsHero
}`;

/* ─────────────────────────────── Resources ────────────────────────────── */

/**
 * Resources — todos los artículos, más nuevo primero.
 *
 * `resource` no tiene campo `isFeatured`, así que el destacado es el más reciente y
 * el resto va al grid; el corte lo hace la página. Trae `cardThumbnail` (imagen de
 * card) y NO `heroBanner`, que es la del hero de la interna.
 */
export const resourceListQuery = `{
  "resources": *[_type == "resource" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    description,
    publishedAt,
    cardThumbnail
  },

  "hero": *[_type == "settings"][0].resourcesHero
}`;

/* ───────────────────────────── EdTech Mentor ──────────────────────────── */

/**
 * EdTech Mentor — el destacado, una sección por cada `mentorCategory` y el catálogo
 * completo para el buscador.
 *
 * Slider de cada sección (feedback cliente, Nota 3.3): sale de `featuredInterviews`,
 * la selección curada del Studio (máx. 10, en el orden en que el editor las arrastró).
 * Se trae también `latestInterviews` — las 10 más recientes de la categoría — como
 * fallback para las categorías sin curar: hoy NINGUNA tiene `featuredInterviews`
 * cargado, y sin fallback la página quedaría sin un solo slider. La elección la hace
 * la página, no GROQ, porque las referencias a documentos sin publicar resuelven a
 * `null` y hay que filtrarlas antes de decidir si la selección está vacía.
 *
 * `featuredInterviews` no filtra por categoría propia en el schema: si el editor elige
 * una entrevista de otra serie, se respeta su selección tal cual (sin validar acá).
 *
 * Las categorías NO se filtran por `defined(slug.current)`: el slug es opcional en el
 * schema y, vacío, la URL se arma con el título (`mentorCategorySlug`). Filtrarlo acá
 * haría desaparecer la categoría en vez de usar el fallback. Por eso `slug` puede
 * llegar `null`.
 *
 * `interviewCount` decide si la sección (y su página de categoría) existe: una
 * categoría sin entrevistas no se renderiza. `references(^._id)` matchea contra el
 * `category` singular de la entrevista; `^` es la categoría del nivel de arriba.
 *
 * `interviews` es el catálogo entero para el modal de búsqueda. Ya no se puede
 * derivar de los sliders: desde la Nota 3.3 muestran 10 por categoría, no todas.
 *
 * `featured` suma `bannerPost` a los campos de card: el destacado del índice usa el
 * banner horizontal y no el `thumbnail` cuadrado (Nota 14).
 */
export const mentorListQuery = `{
  "featured": *[_type == "edtechMentor" && isFeatured == true && defined(slug.current)]
    | order(publishedAt desc)[0] {${MENTOR_CARD_FIELDS}, bannerPost},

  "categories": *[_type == "mentorCategory"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    color,
    textColor,
    sectionHeadline,
    sectionSubtitle,
    "interviewCount": count(*[_type == "edtechMentor" && defined(slug.current) && references(^._id)]),
    "featuredInterviews": featuredInterviews[]->{${MENTOR_CARD_FIELDS}},
    "latestInterviews": *[_type == "edtechMentor" && defined(slug.current) && references(^._id)]
      | order(publishedAt desc)[0...10] {${MENTOR_CARD_FIELDS}}
  },

  "interviews": *[_type == "edtechMentor" && defined(slug.current)]
    | order(publishedAt desc) {${MENTOR_CARD_FIELDS}}
}`;

/**
 * Páginas de categoría de EdTech Mentor (`/edtech-mentor/[category]`, Nota 3.2).
 *
 * Una sola query para todas las categorías, con TODAS sus entrevistas anidadas (no
 * `featuredInterviews`, que es exclusivo del slider del índice). Mismo patrón que las
 * internas: una query por build, no una por página generada.
 *
 * `interviewSlugs` existe para detectar colisiones: la página de categoría comparte
 * prefijo con la interna de la entrevista (`/edtech-mentor/[slug]`), así que un slug de
 * categoría igual al de una entrevista generaría la misma ruta dos veces.
 */
export const mentorCategoryPagesQuery = `{
  "categories": *[_type == "mentorCategory"] | order(order asc) {
    _id,
    title,
    "slug": slug.current,
    sectionHeadline,
    sectionSubtitle,
    "interviews": *[_type == "edtechMentor" && defined(slug.current) && references(^._id)]
      | order(publishedAt desc) {${MENTOR_CARD_FIELDS}}
  },

  "interviewSlugs": *[_type == "edtechMentor" && defined(slug.current)].slug.current
}`;

/* ──────────────────────────── EdTech Marketing ────────────────────────── */

/**
 * EdTech Marketing — las prácticas, el menú de servicios y el copy del singleton.
 *
 * `services` viene plano y ordenado por título; el agrupado por categoría lo hace la
 * página siguiendo `SERVICE_CATEGORY_ORDER` (el orden del Figma), porque el orden de
 * las 8 categorías es de diseño y no un dato del CMS.
 *
 * `practices` es una lista abierta (hoy 9, va a crecer): sin slice ni límite, el orden
 * lo decide `order`. NO trae `iconId` ni `description`: los dos se borraron del schema.
 * Los íconos de `.practices-card` son fijos y rotan por posición (`PRACTICE_ICONS` en
 * `edtech-marketing.astro`).
 *
 * Card (feedback Practices, sept 2026): `title` es el titular en voz del comprador,
 * `practiceName` el label corto que va antes de `shortDescription`, y `cardCtaLabel` el
 * texto del link (vacío → "Explore the practice", lo resuelve `PracticesCard`).
 *
 * Ronda 3: la card ya no tiene imagen. `bgColor` / `textColor` pintan el fondo y el
 * contenido (vacíos → dark / light, lo resuelve `utils/palette`).
 *
 * `agencyHero` va entero: trae `image` (modo imagen) y `bgColor` / `textColor` (modo color).
 */
export const edtechMarketingQuery = `{
  "practices": *[_type == "edtechMarketingPractice"]
    | order(order asc, title asc) {
      _id, title, practiceName, "slug": slug.current, shortDescription, cardCtaLabel, bgColor, textColor
    },

  "services": *[_type == "edtechMarketingService" && defined(slug.current)]
    | order(title asc) {
      _id, title, "slug": slug.current, category, iconId
    },

  "settings": *[_type == "settings"][0] {
    servicesTitle,
    servicesDescription,
    agencyHero,
    agencyPracticesSection,
    agencyClosingCta
  }
}`;

/* ══════════════════════════ Páginas de detalle ═════════════════════════ */

/**
 * Las cinco queries de abajo traen TODOS los documentos de su tipo en una sola llamada,
 * y `getStaticPaths()` reparte cada uno como props de su página. Es una query por
 * documentType en todo el build, no una por página generada: pedir el detalle documento
 * por documento adentro de `getStaticPaths` es exactamente el patrón que CLAUDE.md §10
 * marca como causa de build lento, y acá costaría N round-trips para el mismo dataset.
 *
 * Ninguna filtra por `defined(slug.current)`: el filtro de slug vive en
 * `toStaticPaths()` (`utils/routes`), que además normaliza el slug y avisa qué documento
 * quedó afuera. Filtrarlo también en GROQ escondería esos documentos del reporte.
 */

/**
 * `work` — interna compartida por Work y Clientes.
 *
 * El testimonio va como subquery INVERSA dentro de la proyección (`^._id` referencia al
 * `work` que se está proyectando): `work.testimonial` como objeto embebido se eliminó en
 * Etapa 5. Resolverlo acá y no como query aparte evita una segunda llamada y deja el
 * documento entero disponible en las props de la página.
 *
 * `testimonials` trae TODOS los testimonios linkeados, ordenados por `order`: desde el
 * feedback de Work (Nota 7.2) "Client's feedback" es un slider, no una sola cita.
 *
 * Ronda 2: `headline` es el título público (el `h1`; `title` queda como respaldo y
 * nombre interno) y el Final CTA es un documento `cta` referenciado, expandido con `->`
 * (una referencia vacía o a un documento sin publicar llega `null` y la sección no se
 * renderiza). `customHeight` acompaña a `heightVariant` en las 4 secciones con imágenes.
 *
 * Los tres bloques narrativos traen su `sectionLabel` / `challengeTitle` y su
 * `heightVariant`; el label puede venir vacío en documentos cargados antes de que
 * existiera el campo (el `initialValue` solo aplica a documentos nuevos), y la página
 * cae al nombre estándar de la sección.
 *
 * `practices` (feedback 2026-10-09): `projectType` pasó a ser un array de referencias a
 * `edtechMarketingPractice`. Se proyecta `practiceName` — el nombre corto —, nunca
 * `title`, que es el titular largo de la card de Practice. Una referencia a una
 * práctica sin publicar llega `null`; la filtra `practiceNames()`.
 */
export const workDetailQuery = `
  *[_type == "work"] {
    _id,
    title,
    subtitle,
    "slug": slug.current,
    seo,
    headline,
    briefParagraph,
    "practices": projectType[]->practiceName,
    agencyRole,
    year,
    location,
    thumbnail,
    heroImage,
    heroVideo,
    gallery,
    galleryHeightVariant,
    galleryCustomHeight,
    results[]{_key, number, description},
    "client": client->{_id, name, url, logo},
    challenge{challengeTitle, challengeContent, challengeImages, heightVariant, customHeight},
    communicationChallenge{sectionLabel, content, images, heightVariant, customHeight},
    solution{sectionLabel, headline, body, solutionImages, heightVariant, customHeight},
    contentSections[]{_key, title, body, images, heightVariant, customHeight, bgColor, textColor},
    "cta": cta->{headline, bodyText, ctaText, ctaLink, bgColor, headlineColor, bodyTextColor},
    "testimonials": *[_type == "testimonial" && workProject._ref == ^._id]
      | order(order asc) {${TESTIMONIAL_FIELDS}}
  }
`;

/**
 * `edtechMentor` — interna de una entrevista.
 *
 * NO trae `imageSquare`, `imageHighlight`, `interviewer` ni el campo plano
 * `pearlOfWisdom`: los tres primeros se eliminaron del schema en Etapa 5 y el cuarto en
 * `27zero-sanity@432cb5c`. Ojo: el que SÍ sigue vivo es el bloque inline `pearlOfWisdom`
 * de `body` (Portable Text) — viaja adentro de `body` y lo serializa la interna.
 *
 * El `interviewer` que sobrevive en el JSON crudo de "Ready Education" es dato huérfano,
 * no editable desde el Studio — pedirlo sería renderizar algo que ningún editor puede
 * corregir.
 *
 * `related` son las otras entrevistas para el slider "Read more!" del final: se resuelve
 * acá y no con una query aparte por página, y se excluye a sí misma con `_id != ^._id`.
 */
export const mentorDetailQuery = `
  *[_type == "edtechMentor"] {
    _id,
    title,
    "slug": slug.current,
    seo,
    guestName,
    guestRole,
    guestCompany,
    guestPhoto,
    highlightTitle,
    shortDescription,
    introText,
    mainImage,
    bannerPost,
    body,
    rapidFire{description, image, questions[]{_key, question, answer}},
    author->{_id, name, role, linkedin},
    publishedAt,
    linkedinUrl,
    mediumUrl,
    "related": *[_type == "edtechMentor" && _id != ^._id && defined(slug.current)]
      | order(publishedAt desc)[0...6] {${MENTOR_CARD_FIELDS}}
  }
`;

/**
 * `resource` — interna de un artículo.
 *
 * El hero es de color (`heroBgColor` / `heroTextColor`, ronda 3). `heroBanner` ya no se
 * renderiza, pero se sigue trayendo: con `cardThumbnail` alimenta la imagen del Article
 * (`ogImageUrl(heroBanner, cardThumbnail)`). La tabla de contenidos no es un campo: se
 * deriva de los `h2` de `body` en la página (`getHeadings()` de `utils/portableText`).
 */
export const resourceDetailQuery = `
  *[_type == "resource"] {
    _id,
    title,
    "slug": slug.current,
    seo,
    shortDescription,
    description,
    author->{_id, name, role, linkedin},
    publishedAt,
    heroBanner,
    heroBgColor,
    heroTextColor,
    cardThumbnail,
    body
  }
`;

/**
 * `edtechMarketingPractice` — interna de una práctica.
 *
 * Proyecta los fieldsets curados en Etapa 5 (`intro`, `clients`, `practiceScopes`,
 * `pageCta`). Los campos viejos que modelaban esas mismas secciones (`credibility*`,
 * `conversationItems`, `closingCtaHeadline`) ya no existen: se borraron del schema junto
 * con `description` e `iconId`, que tampoco se leían acá.
 *
 * `relatedServices` (feedback Practices, sept 2026) reemplazó al join por valor de
 * `relatedServiceCategory`: la práctica elige servicios sueltos, de cualquier categoría,
 * y el orden del array ES el orden del menú. El filtro va sobre las referencias ANTES
 * de expandirlas y descarta las que no resuelven (servicio borrado o sin publicar) o no
 * tienen slug, que no tendrían página a la que linkear. Filtrar después de la
 * proyección (`->{...}[defined(slug)]`) no sirve: GROQ lo aplica por elemento y
 * devuelve un array de `null`.
 */
export const practiceDetailQuery = `
  *[_type == "edtechMarketingPractice"] {
    _id,
    title,
    practiceName,
    "slug": slug.current,
    seo,
    shortDescription,
    heroHeadline,
    heroText,
    bgColor,
    textColor,
    introTitle,
    introDescription,
    capabilities,
    clientSectionTitle,
    clientNames,
    practiceScopesTitle,
    practiceScopes[]{_key, title, description, ctaLabel, ctaHref},
    ctaTitle,
    ctaLabel,
    ctaHref,
    "relatedServices": relatedServices[defined(@->slug.current)]->{
      title, "slug": slug.current, category, iconId, description
    }
  }
`;

/** `edtechMarketingService` — interna de un servicio. */
export const serviceDetailQuery = `
  *[_type == "edtechMarketingService"] {
    _id,
    title,
    "slug": slug.current,
    seo,
    category,
    iconId,
    description,
    heroBgColor,
    heroTextColor,
    introTitle,
    introDescription,
    featuresTitle,
    features[]{_key, title, description},
    proofPointTitle,
    proofPointDescription,
    proofPointImage,
    ctaTitle,
    ctaLabel,
    ctaHref
  }
`;
