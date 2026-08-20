/**
 * Rutas de las páginas de detalle — 27zero.
 *
 * El patrón de URL se define acá, en un solo lugar, en vez de repetir
 * `` `/work/${slug}` `` en cinco páginas. Los listados lo usan para el `href` de cada
 * card y los `getStaticPaths()` de las internas para el `params.slug`, así que ambos
 * lados no pueden desalinearse: si cambia la ruta, cambia una función.
 *
 * `normalizeSlug` existe por data real, no por prolijidad. En el dataset de hoy hay
 * tres formas rotas de guardar un slug:
 *   - con la barra adentro del campo (`/scott-blevins`, `/carlos-marquez`), que sin
 *     limpiar deja el href en `/edtech-mentor//scott-blevins`;
 *   - con espacios y mayúsculas (`EdTech Marketing Agency`, el único `resource`
 *     cargado), que obliga al navegador a percent-encodear la URL;
 *   - en CamelCase (`LaureanoDiaz`, `JuniorGomez`), contra la convención kebab-case
 *     de CLAUDE.md §6.
 *
 * La normalización es deliberadamente conservadora: baja a minúsculas, colapsa espacios
 * a guiones y descarta lo que no sea seguro en una URL, pero NO toca los guiones que ya
 * están (`universidad-de-los-andes---marketing-programs` se conserva tal cual). Un
 * slugify completo reescribiría URLs que hoy son válidas y ya están indexadas.
 *
 * El fix de fondo es corregir esos documentos en el Studio — ver reporte de entrega.
 */

/**
 * Slug del CMS → segmento de URL. Se exporta porque `getStaticPaths()` necesita emitir
 * exactamente el mismo segmento que los listados ponen en el `href`.
 *
 * Devuelve `''` para un slug vacío o que quede vacío tras limpiarlo: quien la llame
 * tiene que descartar ese documento del `getStaticPaths`, no generar `/work/`.
 */
export function normalizeSlug(slug: string | null | undefined): string {
  if (!slug) return '';

  return slug
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    /* Todo lo que no sea alfanumérico, guion, guion bajo o punto se descarta: son los
       únicos caracteres que no obligan a percent-encodear el segmento. */
    .replace(/[^a-z0-9\-_.]/g, '')
    .replace(/^-+|-+$/g, '');
}

export const workUrl = (slug: string): string => `/work/${normalizeSlug(slug)}`;

export const resourceUrl = (slug: string): string => `/resources/${normalizeSlug(slug)}`;

export const mentorUrl = (slug: string): string => `/edtech-mentor/${normalizeSlug(slug)}`;

/** Práctica y servicio cuelgan de `/edtech-marketing` en subcarpetas distintas: sus
 *  slugs se solapan por nombre (ej. "Project Management" existe en ambas taxonomías). */
export const practiceUrl = (slug: string): string => `/edtech-marketing/practices/${normalizeSlug(slug)}`;

export const serviceUrl = (slug: string): string => `/edtech-marketing/services/${normalizeSlug(slug)}`;

/**
 * Lista de documentos → `paths` de `getStaticPaths()`, saltando los que no pueden
 * tener URL.
 *
 * Existe porque las cinco internas necesitan exactamente las mismas dos defensas y
 * hacerlas a mano cinco veces garantiza que alguna quede sin una:
 *
 *   1. **Slug vacío o que se vacía al normalizar.** Hay un `edtechMentor` sin slug
 *      ("Jose") en el dataset. Sin este filtro, Astro emitiría la interna en la ruta
 *      del listado y la pisaría.
 *   2. **Colisión tras normalizar.** Dos slugs distintos en el Studio pueden caer en el
 *      mismo segmento (`Foo Bar` y `foo-bar`). Astro falla el build con un error de
 *      ruta duplicada; acá gana el primero y el segundo se saltea con aviso.
 *
 * Ambos casos avisan por consola en vez de romper el build: son datos a corregir en el
 * Studio, y un build roto por un documento a medio cargar deja el sitio entero sin
 * publicar (CLAUDE.md §10 — el build corre en cada publicación de contenido).
 */
export function toStaticPaths<T>(
  documents: T[],
  options: { label: string; slugOf: (document: T) => string | null | undefined }
): { params: { slug: string }; props: T }[] {
  const seen = new Set<string>();
  const paths: { params: { slug: string }; props: T }[] = [];

  for (const document of documents) {
    const raw = options.slugOf(document);
    const slug = normalizeSlug(raw);

    if (slug === '') {
      console.warn(`[${options.label}] documento sin slug válido (${JSON.stringify(raw)}) — se excluye de getStaticPaths.`);
      continue;
    }

    if (seen.has(slug)) {
      console.warn(`[${options.label}] slug duplicado tras normalizar: "${raw}" → "${slug}" — se excluye de getStaticPaths.`);
      continue;
    }

    seen.add(slug);
    paths.push({ params: { slug }, props: document });
  }

  return paths;
}
