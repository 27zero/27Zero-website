// TEMP: mock data — swap en Etapa 6 (GROQ)
// `work` agrupado por categoría de servicio, para la página Work.
//
// Las 8 categorías (id + label) son la taxonomía de display de la página, no data de
// Sanity: los `id` son slugs que cumplen un doble rol — `data-filter` de cada pill y
// `id` del `.category-anchor` al que esa pill scrollea. Derivar la lista de pills de
// este mismo array (ver `WORK_FILTER_CATEGORIES`) garantiza que todo pill apunte a un
// anchor existente.
//
// Los labels van tal cual el vanilla (no camelCase todavía). El nombre/valor definitivo
// del campo de categoría en Sanity se resuelve en Etapa 5 — para Etapa 4 son solo
// labels estáticos de display.
//
// Contenido de las cards: placeholder literal repetido dentro de cada categoría (mismo
// criterio que `team` en About). Lo único que varía entre categorías es el eyebrow, que
// lleva el label de su categoría entre corchetes — igual que el vanilla.

export interface WorkMock {
  href: string;
  eyebrow: string;
  title: string;
  clientName: string;
  clientInitials: string;
}

export interface WorkCategory {
  /** Slug: `id` del `.category-anchor` y `data-filter` del pill correspondiente. */
  id: string;
  label: string;
  items: WorkMock[];
}

/** Orden de aparición en la página. "Los mejores" va primero y es la única sin pill. */
const CATEGORIES: { id: string; label: string }[] = [
  { id: 'los-mejores', label: 'Los mejores' },
  { id: 'ux-ui-web-design', label: 'Ux/Ui & Web Design' },
  { id: 'brand-messaging-strategy', label: 'Brand & Messaging Strategy' },
  { id: 'events', label: 'Events' },
  { id: 'content-marketing', label: 'Content Marketing' },
  { id: 'marketing-programs', label: 'Marketing Programs' },
  { id: 'thought-leadership-programs', label: 'Thought Leadership Programs' },
  { id: 'strategic-services', label: 'Strategic Services' },
];

/** 6 cards por categoría, idénticas entre sí salvo el eyebrow (contenido del vanilla). */
const buildItems = (label: string): WorkMock[] =>
  Array.from({ length: 6 }, () => ({
    href: '#',
    eyebrow: `[${label}]`,
    title: '[Project headline]',
    clientName: '[Client Name]',
    clientInitials: 'CL',
  }));

export const WORK_BY_CATEGORY: WorkCategory[] = CATEGORIES.map((category) => ({
  ...category,
  items: buildItems(category.label),
}));

/**
 * Categorías que llevan pill en el filtro. "Los mejores" queda afuera: en el vanilla
 * tiene su slider pero no su pill (el pill "All" lo antepone `FilterPills`).
 */
export const WORK_FILTER_CATEGORIES = WORK_BY_CATEGORY.filter(
  (category) => category.id !== 'los-mejores'
).map(({ id, label }) => ({ id, label }));
