// TEMP: mock data — swap en Etapa 6 (GROQ)
// `edtechMarketingPractice` — las 3 prácticas de EdTech Marketing.
//
// A diferencia del resto de los mocks del proyecto, el copy acá es CONTENIDO REAL y
// final (título + body de cada práctica), no lorem ni placeholder. El comentario TEMP
// aplica igual: lo temporal es que viva hardcodeado en el repo en vez de en Sanity.
//
// `href: '#'` tal cual el vanilla: apuntan a la página interna de cada práctica
// (`edtechMarketingPractice` detail), que es Etapa 6.
//
// `iconId` referencia el diccionario de `components/ui/PracticeIcon.astro` — el markup
// SVG no vive en la data.

export interface PracticeMock {
  href: string;
  title: string;
  body: string;
  iconId: string;
}

export const PRACTICES: PracticeMock[] = [
  {
    href: '#',
    title: 'Customer Marketing',
    body: 'Turning communities into growth engines. Peer-driven storytelling strengthens credibility because people trust those who share their experiences.',
    iconId: 'waves',
  },
  {
    href: '#',
    title: 'Granular Marketing Programs',
    body: 'Driving relevance within niche audiences. Audience layering aligns messages to specific needs across the entire B2B EdTech buying journey.',
    iconId: 'spiral',
  },
  {
    href: '#',
    title: 'Agile Brand Development',
    body: 'Scalable branding for evolving realities. Steady, on-demand brand assets keep you top of mind, so recognition drives preference.',
    iconId: 'square-circle',
  },
];
