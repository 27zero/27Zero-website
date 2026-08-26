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

/** Campos de `work` que consume una `WorkCard`. Nada del detalle del case study. */
const WORK_CARD_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  isFeatured,
  order,
  thumbnail,
  clientLogo,
  "clientName": client->name,
  "categoryTitle": category->title,
  "categorySlug": category->slug.current
`;

/** Campos de `edtechMentor` que consumen `EdtechMentorCard` y `FeaturedCard`. */
const MENTOR_CARD_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  guestName,
  guestRole,
  guestCompany,
  guestPhoto,
  thumbnail,
  interviewCategory,
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
 * `featuredWorks` usa `isFeatured == true`: en Etapa 5 ese booleano asumió el rol del
 * slider "Los mejores", que dejó de existir como `workCategory`.
 *
 * `testimonials` es la lista general ordenada por `order`, no la filtrada por
 * proyecto: Home muestra todos los testimonios destacados, sin importar a qué `work`
 * pertenecen. La query inversa por `$workId` (`testimonialsByWorkQuery`) es para la
 * interna de `work`, que se arma en la sesión de detalle.
 */
export const homeQuery = `{
  "featuredWorks": *[_type == "work" && isFeatured == true && defined(slug.current)]
    | order(order asc, title asc) {${WORK_CARD_FIELDS}},

  "featuredMentor": *[_type == "edtechMentor" && isFeatured == true && defined(slug.current)]
    | order(publishedAt desc)[0] {${MENTOR_CARD_FIELDS}},

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
    | order(publishedAt desc)[0] {${MENTOR_CARD_FIELDS}},

  "mentorPosts": *[_type == "edtechMentor" && defined(slug.current)]
    | order(publishedAt desc)[0...6] {${MENTOR_CARD_FIELDS}},

  "proofPoint": *[_type == "settings"][0].aboutProofPoint {title, text, image}
}`;

/* ────────────────────────── Work / Clientes ───────────────────────────── */

/**
 * Work — las 7 categorías + todos los works. El agrupado se hace en la página, no en
 * GROQ: una query por categoría serían 7 round-trips en build para el mismo dataset.
 *
 * `categories` usa el campo `order` de `workCategory` (agregado en el Studio después
 * de 6B) para respetar el orden del Figma, con `title asc` como desempate para las
 * categorías que todavía no lo tengan cargado.
 */
export const workListQuery = `{
  "categories": *[_type == "workCategory" && defined(slug.current)]
    | order(order asc, title asc) {_id, title, "slug": slug.current},

  "works": *[_type == "work" && defined(slug.current)]
    | order(order asc, title asc) {${WORK_CARD_FIELDS}}
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
    | order(order asc, title asc) {${WORK_CARD_FIELDS}}
}`;

/* ─────────────────────────────── Resources ────────────────────────────── */

/**
 * Resources — todos los artículos, más nuevo primero.
 *
 * `resource` no tiene campo `isFeatured`, así que el destacado es el más reciente y
 * el resto va al grid; el corte lo hace la página. Trae `cardThumbnail` (imagen de
 * card) y NO `heroBanner`, que es la del hero de la interna.
 */
export const resourceListQuery = `
  *[_type == "resource" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    description,
    publishedAt,
    cardThumbnail
  }
`;

/* ───────────────────────────── EdTech Mentor ──────────────────────────── */

/**
 * EdTech Mentor — el destacado + todas las entrevistas con categoría asignada.
 *
 * `defined(interviewCategory)` filtra los docs sin categoría: la página son tres
 * secciones (Essential / Investor / Founders) y una entrevista sin categoría no tiene
 * dónde caer. Hoy deja afuera a "Ready Education" — ver reporte de entrega.
 */
export const mentorListQuery = `{
  "featured": *[_type == "edtechMentor" && isFeatured == true && defined(slug.current)]
    | order(publishedAt desc)[0] {${MENTOR_CARD_FIELDS}},

  "mentors": *[_type == "edtechMentor" && defined(slug.current) && defined(interviewCategory)]
    | order(publishedAt desc) {${MENTOR_CARD_FIELDS}}
}`;

/* ──────────────────────────── EdTech Marketing ────────────────────────── */

/**
 * EdTech Marketing — las prácticas, el menú de servicios y el copy del singleton.
 *
 * `services` viene plano y ordenado por título; el agrupado por categoría lo hace la
 * página siguiendo `SERVICE_CATEGORY_ORDER` (el orden del Figma), porque el orden de
 * las 8 categorías es de diseño y no un dato del CMS.
 *
 * `practices` NO trae `iconId` ni `description`: los dos se borraron del schema. Los 3
 * íconos de `.practices-card` son fijos y posicionales, resueltos en la página
 * (`PRACTICE_ICONS` en `edtech-marketing.astro`), y el body de la card sale de
 * `shortDescription`, que es requerido por schema.
 *
 * `practices` SÍ trae `cardImage` (campo nuevo, `27zero-sanity@612215b`): es el fondo de
 * la `.practices-card`, el `.practices-card-bg` que en el vanilla era placeholder. Va
 * cruda, como el resto de las imágenes, para que la página la resuelva con `toImage()`.
 * Ningún documento la tiene cargada todavía, así que hoy la card cae al placeholder.
 */
export const edtechMarketingQuery = `{
  "practices": *[_type == "edtechMarketingPractice"]
    | order(order asc, title asc) {
      _id, title, "slug": slug.current, shortDescription, cardImage
    },

  "services": *[_type == "edtechMarketingService" && defined(slug.current)]
    | order(title asc) {
      _id, title, "slug": slug.current, category, iconId
    },

  "settings": *[_type == "settings"][0] {servicesTitle, servicesDescription}
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
 * `[0]` porque la interna muestra un solo testimonio (la sección "Client's feedback" del
 * template tiene una sola cita). Si un `work` tuviera más de uno cargado, gana el de
 * `order` más bajo.
 */
export const workDetailQuery = `
  *[_type == "work"] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    brief,
    projectType,
    agencyRole,
    year,
    location,
    contributions,
    clientTagline,
    clientLogo,
    thumbnail,
    heroImage,
    gallery,
    results[]{_key, number, description},
    "client": client->{_id, name, url, logo},
    description{projectTitle, projectContent, projectImages},
    challenge{challengeTitle, challengeContent, challengeImages},
    solution{headline, body, solutionImages},
    contentSections[]{_key, title, body, images},
    "testimonial": *[_type == "testimonial" && workProject._ref == ^._id]
      | order(order asc)[0] {${TESTIMONIAL_FIELDS}}
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
    interviewCategory,
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
 * Trae `heroBanner` (imagen del hero de la interna) y NO `cardThumbnail`, que es la del
 * listado. La tabla de contenidos no es un campo: se deriva de los `h2` de `body` en la
 * página (`getHeadings()` de `utils/portableText`).
 */
export const resourceDetailQuery = `
  *[_type == "resource"] {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    description,
    publishedAt,
    heroBanner,
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
 * `services` trae los `edtechMarketingService` de la categoría que la práctica declara
 * en `relatedServiceCategory`. NO es una `reference`: las dos taxonomías comparten los 8
 * valores pero se declaran por separado en cada schema, así que el join es por valor.
 *
 * ⚠️ El schema sumó `relatedServices` (array de references a `edtechMarketingService`,
 * selección explícita en vez de join por categoría). NO se proyecta todavía a propósito:
 * el menú sigue saliendo de `relatedServiceCategory` hasta que se decida cuál de los dos
 * mecanismos queda.
 */
export const practiceDetailQuery = `
  *[_type == "edtechMarketingPractice"] {
    _id,
    title,
    "slug": slug.current,
    shortDescription,
    relatedServiceCategory,
    heroHeadline,
    heroText,
    heroImage,
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
    "services": *[_type == "edtechMarketingService"
        && defined(slug.current)
        && category == ^.relatedServiceCategory]
      | order(title asc) {_id, title, "slug": slug.current, category, iconId}
  }
`;

/** `edtechMarketingService` — interna de un servicio. */
export const serviceDetailQuery = `
  *[_type == "edtechMarketingService"] {
    _id,
    title,
    "slug": slug.current,
    category,
    iconId,
    description,
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
