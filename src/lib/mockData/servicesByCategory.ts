// TEMP: mock data — swap en Etapa 6 (GROQ)
// `edtechMarketingService` agrupado por categoría, para el menú de EdTech Marketing.
//
// Copy REAL y final: los 28 títulos de servicio y las 8 categorías salen literales del
// vanilla, no son placeholder. El comentario TEMP aplica igual: lo temporal es que viva
// hardcodeado en el repo en vez de en Sanity.
//
// ⚠️ Taxonomía DISTINTA a la de Work/Clientes: no comparte ids, labels ni tipos con
// `workByCategory.ts`. Work agrupa por categoría de proyecto (7, incluye "Thought
// Leadership Programs"); esto agrupa por categoría de servicio (8, incluye "Project
// Management", "Content Development" y "Others"). Se parecen de nombre en algunos
// casos y no son lo mismo — mezclarlas rompería el mapeo de Etapa 5.
//
// Las categorías no llevan slug/id: a diferencia de Work no hay pills ni anchor scroll,
// solo bloques apilados. El nombre/valor definitivo de la categoría en Sanity se
// resuelve en Etapa 5.
//
// `href: '#'` tal cual el vanilla: apuntan a la página interna de cada servicio
// (`edtechMarketingService` detail), que es Etapa 6.
//
// `iconId` referencia el diccionario de `components/ui/ServiceIcon.astro`. En el vanilla
// no hay ícono propio por servicio: los 28 rotan entre 3 marcos de marca
// (asterisk → quatrefoil → arc), reiniciando en cada categoría. Se conserva la
// asignación exacta para que el render sea 1:1; ver `ServiceIcon.astro`.

export interface ServiceMock {
  href: string;
  title: string;
  iconId: string;
}

export interface ServiceCategory {
  title: string;
  services: ServiceMock[];
}

/** Rotación de íconos del vanilla, reiniciada en cada categoría. */
const ICON_ROTATION = ['asterisk', 'quatrefoil', 'arc'];

const buildServices = (titles: string[]): ServiceMock[] =>
  titles.map((title, i) => ({
    href: '#',
    title,
    iconId: ICON_ROTATION[i % ICON_ROTATION.length],
  }));

/* "Performace Review" va con la errata del vanilla, sin corregir: es copy que el
   cliente todavía tiene que validar, y arreglarlo acá lo haría divergir de la fuente.
   Igual con "Project Management", que aparece en su propia categoría y otra vez en
   "Others". */
const CATEGORIES: { title: string; services: string[] }[] = [
  {
    title: 'UX/UI & Web Design',
    services: ['Website Adjustments or Updates', 'Website Design', 'SEO | GEO'],
  },
  {
    title: 'Brand & Messaging Strategy',
    services: ['Corporate Video', 'Corporate-level messaging update', 'Brand Awareness Fundamentals'],
  },
  {
    title: 'Project Management',
    services: ['Project Management', 'Follow-up Sessions', 'Performace Review', 'Marketing Operations'],
  },
  {
    title: 'Events',
    services: ['In-Person Event Marketing', 'Webinar Marketing'],
  },
  {
    title: 'Content Development',
    services: [
      'On-Demand Creative Production',
      'Special Email Campaigns',
      'Newsletter',
      'LinkedIn Posts',
      'Blog',
      'Ad-hoc Announcements',
      'Ad-hoc Social Post',
      'WhitePaper',
    ],
  },
  {
    title: 'Marketing Programs',
    services: [
      'Paid Advertising Management',
      'ABM Granular Campaigns',
      'Brand Awareness Marketing Campaigns',
      'Core Content Campaigns',
      'Customer Spotlights / Case Studies',
    ],
  },
  {
    title: 'Strategic Services',
    services: ['Marketing Audit', 'Marketing Strategy Development'],
  },
  {
    title: 'Others',
    services: ['Project Management'],
  },
];

export const SERVICES_BY_CATEGORY: ServiceCategory[] = CATEGORIES.map((category) => ({
  title: category.title,
  services: buildServices(category.services),
}));
