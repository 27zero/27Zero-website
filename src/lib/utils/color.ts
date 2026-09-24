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

/**
 * Colores de una superficie entera (sección) cargados en el CMS: fondo + texto.
 *
 * A diferencia de `accentColors()` (pills), acá el fondo tiene un default propio de cada
 * sección — blanco en las Additional Sections de Work, por ejemplo — y el `textValue`
 * del editor se respeta aunque el fondo haya caído a ese default: el editor ve la
 * sección con ese fondo en el diseño y elige el texto para él. Sin texto válido, se
 * elige negro o blanco por contraste.
 */
export function surfaceColors(
  value: string | null | undefined,
  textValue: string | null | undefined,
  fallbackBackground: string
): { background: string; text: string } {
  const background = normalizeHex(value) ?? fallbackBackground;
  const text = normalizeHex(textValue) ?? (isDarkColor(background) ? LIGHT_TEXT : DARK_TEXT);

  return { background, text };
}
