/**
 * Formateadores de display — 27zero.
 *
 * Corren solo en build (Astro SSG), así que `Intl` acá no pesa nada en el cliente.
 */

/**
 * ISO de Sanity (`publishedAt`) → "June 19, 2026", el formato del vanilla.
 *
 * Fuerza `timeZone: 'UTC'`: sin eso el mismo documento puede renderizar un día
 * distinto según dónde corra el build (local vs. Netlify), y el contenido cambiaría
 * sin que nadie lo haya editado.
 */
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMATTER.format(date);
}

/**
 * "Erin Grant" → "EG". Las cards del vanilla caen a iniciales cuando no hay foto ni
 * logo cargado, que es el estado de casi todo el dataset hoy.
 */
export function getInitials(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

/**
 * "Student First" → "student-first". `client` no tiene campo `slug` en el schema, así
 * que el `id` del `.category-anchor` de Clientes (y el `data-filter` de su pill) se
 * deriva del nombre. Coincide con los ids que tenía el mock.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
