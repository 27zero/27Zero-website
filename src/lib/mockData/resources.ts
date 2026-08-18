// TEMP: mock data — swap en Etapa 6 (GROQ)
// `resource` — 1 destacado + 6 del grid, para la página Resources.
//
// Data 100% estática: aunque ya existe un doc `resource` cargado en Sanity, esta etapa
// no lo referencia (planning-maquetado-resources.md § Fuera de alcance) — el cableado
// real, y con él la fecha formateada desde el campo de Sanity, es Etapa 6.
//
// Las 6 del grid repiten el mismo placeholder literal (mismo título, desc y fecha),
// igual que el vanilla — mismo criterio que `team` en About y `work` en Work/Clientes.
//
// `href: '#'` tal cual el vanilla: apuntan al detalle de cada resource
// (`getStaticPaths`), que es Etapa 6.
//
// Sin campo de imagen: en el vanilla las cards son un `div` de color plano
// (`--color-placeholder: #E3E3E3`) a la espera de los assets reales del cliente. Los
// componentes renderizan ese placeholder; el `<img>` con `alt` entra cuando haya
// asset (Etapa 6).

export interface ResourceMock {
  href: string;
  date: string;
  title: string;
  description: string;
}

/** El único con `isFeatured: true` — el que renderiza `ResourceCardFeatured`. */
export const FEATURED_RESOURCE: ResourceMock = {
  href: '#',
  date: 'June 19, 2026',
  title: 'EdTech Marketing Agency',
  description:
    'Education technology is transforming how learners, educators, and institutions engage with knowledge.',
};

/** Las 6 del grid. En el vanilla las 6 repiten el mismo contenido. */
export const RESOURCES: ResourceMock[] = Array.from({ length: 6 }, () => ({
  href: '#',
  date: 'June 19, 2026',
  title: 'What should I look for when choosing an EdTech marketing',
  description: 'A specialized EdTech marketing agency is more than a creative partner.',
}));
