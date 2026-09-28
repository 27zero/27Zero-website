/**
 * Colores de acento del CMS — 27zero.
 *
 * `mentorCategory.color` y `mentorSeason.color` son strings libres en el Studio (el
 * editor tipea el hex a mano), así que pueden llegar vacíos, con espacios, sin `#` o
 * directamente mal formados. Todo color de acento que se pinte en el sitio pasa por
 * `accentColors()`, que normaliza el valor y cae al negro del design system si no es
 * un hex válido (sanity-changes.md Nota 5.3).
 *
 * Color de TEXTO:
 *   - `mentorCategory` tiene `textColor` (opcional). Se usa solo si el fondo (`color`)
 *     también es un hex válido: si el fondo cae al negro por defecto, un texto elegido
 *     para otro fondo podría no leerse.
 *   - `mentorSeason` no tiene campo de texto, y una categoría sin `textColor` tampoco:
 *     en esos casos se elige por contraste WCAG entre el negro y el blanco del design
 *     system.
 */

/** `--color-black` de `global.css`. Fallback de todo acento vacío o inválido. */
export const DEFAULT_ACCENT = '#101010';

const DARK_TEXT = '#101010';
const LIGHT_TEXT = '#FFFFFF';

/** `#rgb` o `#rrggbb` (con o sin `#`) → `#rrggbb` en minúsculas. Cualquier otra cosa → `undefined`. */
export function normalizeHex(value: string | null | undefined): string | undefined {
  const hex = value?.trim().replace(/^#/, '').toLowerCase();
  if (!hex) return undefined;

  if (/^[0-9a-f]{3}$/.test(hex)) {
    return `#${hex
      .split('')
      .map((char) => char + char)
      .join('')}`;
  }

  return /^[0-9a-f]{6}$/.test(hex) ? `#${hex}` : undefined;
}

/** Luminancia relativa WCAG 2.x de un `#rrggbb` ya normalizado. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Color de acento del CMS → par fondo/texto listo para pintar.
 *
 * `textValue` manda solo si fondo y texto son hex válidos. Si no, `text` es el que da
 * más contraste contra `background` entre negro y blanco — no un umbral fijo de
 * luminancia, que en los grises medios elige mal.
 */
export function accentColors(
  value: string | null | undefined,
  textValue?: string | null
): { background: string; text: string } {
  const accent = normalizeHex(value);
  const background = accent ?? DEFAULT_ACCENT;
  const customText = accent ? normalizeHex(textValue) : undefined;
  const text =
    customText ??
    (contrast(background, DARK_TEXT) >= contrast(background, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT);

  return { background, text };
}

/** `true` si el texto claro contrasta más que el oscuro sobre `hex` (ya normalizado). */
export function isDarkColor(hex: string): boolean {
  return contrast(hex, LIGHT_TEXT) > contrast(hex, DARK_TEXT);
}

/* ───────────────────────────── Paleta de marca ───────────────────────────── */

/**
 * Colores de sección elegibles en el Studio (feedback Work ronda 2, §4): el CMS guarda
 * el NOMBRE del token (`indigo`, `purple`, `black`, `white`), no un hex. Se pintan con
 * `var(--color-<nombre>)`, así `global.css` sigue siendo la única fuente de los valores.
 *
 * El hex de acá es solo un espejo de `global.css` para decidir contraste en build (el
 * color de texto por defecto y la variante del botón): no se escribe en el HTML. Si
 * cambia un token, se actualiza también acá.
 */
const PALETTE_HEX = {
  indigo: '#440e92',
  purple: '#b382f9',
  black: '#101010',
  white: '#ffffff',
} as const;

export type PaletteName = keyof typeof PALETTE_HEX;

const isPaletteName = (value: string | null | undefined): value is PaletteName =>
  Boolean(value && value in PALETTE_HEX);

/**
 * Fondo + texto de una sección con colores de la paleta. Un valor vacío o desconocido
 * cae a `fallbackBackground`; sin texto (o con el mismo color que el fondo), negro o
 * blanco según el contraste con el fondo.
 * Devuelve las `var()` para el CSS y si el fondo es oscuro (para elegir la variante de
 * los botones que van encima).
 */
export function paletteSurface(
  background: string | null | undefined,
  text: string | null | undefined,
  fallbackBackground: PaletteName
): { background: string; text: string; isDark: boolean } {
  const backgroundName = isPaletteName(background) ? background : fallbackBackground;
  const isDark = isDarkColor(PALETTE_HEX[backgroundName]);
  const contrastName: PaletteName = isDark ? 'white' : 'black';
  /* Un texto igual al fondo sería invisible (pasa si el editor eligió texto blanco y dejó
     el fondo vacío, que cae a blanco): ahí rige el contraste. */
  const textName: PaletteName = isPaletteName(text) && text !== backgroundName ? text : contrastName;

  return { background: `var(--color-${backgroundName})`, text: `var(--color-${textName})`, isDark };
}
