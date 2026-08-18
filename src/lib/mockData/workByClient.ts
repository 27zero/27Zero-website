// TEMP: mock data — swap en Etapa 6 (GROQ)
// `work` agrupado por cliente, para la página Clientes.
//
// Mismo `documentType` y mismo shape que `workByCategory.ts` (Work y Clientes son la
// misma plantilla con distinto criterio de agrupación), así que reutiliza sus tipos:
// `WorkCategory` es la forma genérica de un grupo (`id` + `label` + `items`) que
// consume `CategorySliders`, nombrada por su primer uso, no exclusiva de categorías.
//
// Los `id` son slugs con doble rol: `data-filter` del pill y `id` del
// `.category-anchor` al que scrollea. Derivar la lista de pills de este mismo array
// (ver `WORK_FILTER_CLIENTS`) garantiza que todo pill apunte a un anchor existente.
//
// A diferencia de Work, acá NO hay grupo "Los mejores" — no existe en el vanilla de
// Clientes, y por eso los 8 clientes llevan pill (ninguno queda afuera del filtro).
//
// Contenido de las cards: placeholder literal repetido dentro de cada cliente. Varían
// el eyebrow y el nombre de cliente (ambos llevan el label del cliente entre
// corchetes, igual que el vanilla); el titular y las iniciales del logo son fijos.

import type { WorkCategory, WorkMock } from './workByCategory';

/** Orden de aparición en la página. */
const CLIENTS: { id: string; label: string }[] = [
  { id: 'skillwell', label: 'Skillwell' },
  { id: 'doctums', label: 'Doctums' },
  { id: 'student-first', label: 'Student First' },
  { id: 'wql', label: 'WQL' },
  { id: 'oes', label: 'OES' },
  { id: 'iee', label: 'IEE' },
  { id: 'd2l', label: 'D2L' },
  { id: 'scholarship-magic', label: 'Scholarship Magic' },
];

/** 6 cards por cliente, idénticas entre sí (contenido del vanilla). */
const buildItems = (label: string): WorkMock[] =>
  Array.from({ length: 6 }, () => ({
    href: '#',
    eyebrow: `[${label}]`,
    title: '[Project headline]',
    clientName: `[${label}]`,
    clientInitials: 'CL',
  }));

export const WORK_BY_CLIENT: WorkCategory[] = CLIENTS.map((client) => ({
  ...client,
  items: buildItems(client.label),
}));

/** Los 8 clientes llevan pill — el pill "All" lo antepone `FilterPills`. */
export const WORK_FILTER_CLIENTS = WORK_BY_CLIENT.map(({ id, label }) => ({ id, label }));
