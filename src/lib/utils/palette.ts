/**
 * Colores de heroes y de la card de Practice — 27zero (ronda 3 de feedback).
 *
 * Sanity guarda un NOMBRE (`BgColor` / `TextColor`, `schemaTypes/lib/palette.ts`) que
 * no coincide con el nombre del token de `global.css`, y el token no se renombra:
 *   dark   → `--color-black` (#101010)
 *   black  → `--color-pure-black` (#000)
 *   light  → `--color-white`
 *   purple, indigo, blue, yellow → su token homónimo
 *
 * Por eso el mapeo es explícito y a clases COMPLETAS y literales: Tailwind solo genera
 * las utilidades que encuentra escritas tal cual en el código, así que armar el nombre
 * (`bg-${valor}` o `var(--color-${valor})`) no funcionaría y además mapearía mal `dark`.
 *
 * Vacío o desconocido → fondo `dark`, texto `light`. No se valida el contraste: la
 * combinación la elige el editor (el Studio le avisa en la descripción del campo).
 */
import type { BgColor, TextColor } from '../../types/sanity';

const BG_CLASSES: Record<BgColor, string> = {
  dark: 'bg-black',
  light: 'bg-white',
  black: 'bg-pure-black',
  purple: 'bg-purple',
  indigo: 'bg-indigo',
  blue: 'bg-blue',
  yellow: 'bg-yellow',
};

const TEXT_CLASSES: Record<TextColor, string> = {
  light: 'text-white',
  dark: 'text-black',
};

/**
 * Variante de `Button` según el tono del texto: las dos existentes que son espejo una de
 * la otra. `whiteOnDark` (relleno blanco, en hover se vacía a borde y texto blancos) y
 * `blackWhite` (relleno negro, en hover se vacía a borde y texto negros). El hover no
 * depende del fondo: siempre toma el color del texto elegido.
 */
const BUTTON_VARIANTS = {
  light: 'whiteOnDark',
  dark: 'blackWhite',
} as const satisfies Record<TextColor, string>;

const DEFAULT_BG: BgColor = 'dark';
const DEFAULT_TEXT: TextColor = 'light';

const isBgColor = (value: string | null | undefined): value is BgColor => Boolean(value && value in BG_CLASSES);
const isTextColor = (value: string | null | undefined): value is TextColor => Boolean(value && value in TEXT_CLASSES);

export interface Surface {
  /** Clase de fondo (`bg-*`). */
  bg: string;
  /** Clase de color de texto (`text-*`). */
  text: string;
  /** Tono del contenido, para los elementos con variantes propias (flecha, ícono). */
  tone: TextColor;
  /** Variante de `Button` que corresponde al tono. */
  button: (typeof BUTTON_VARIANTS)[TextColor];
}

/** `bgColor` + `textColor` de Sanity → clases listas para pintar, con fallback dark/light. */
export function surface(bgColor: string | null | undefined, textColor: string | null | undefined): Surface {
  const bg = isBgColor(bgColor) ? bgColor : DEFAULT_BG;
  const tone = isTextColor(textColor) ? textColor : DEFAULT_TEXT;

  return { bg: BG_CLASSES[bg], text: TEXT_CLASSES[tone], tone, button: BUTTON_VARIANTS[tone] };
}
