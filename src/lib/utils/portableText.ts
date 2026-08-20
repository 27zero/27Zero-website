/**
 * Helpers de Portable Text — 27zero.
 *
 * Solo lo que se necesita ANTES de renderizar (derivar un TOC, saber si un campo trae
 * contenido). La serialización a HTML vive en `components/ui/PortableText.astro`, que
 * importa `headingId()` de acá para que el `id` que emite un `<h2>` y el `href` que
 * arma el TOC salgan de la misma función. Si cada uno slugificara por su cuenta, el
 * día que una de las dos reglas cambie el TOC apunta a anclas inexistentes y no falla
 * nada — solo deja de andar.
 */
import { slugify } from './format';

/** Bloque de Portable Text, tipado al mínimo que estos helpers necesitan leer. */
interface TextBlock {
  _type?: string;
  style?: string;
  children?: { text?: string }[];
}

/**
 * Texto plano de un bloque. Se usa para derivar ids y labels de TOC — nunca para
 * renderizar: ahí van los serializers, que sí respetan marks, links y anidamiento.
 */
export function blockText(block: unknown): string {
  const children = (block as TextBlock)?.children;
  if (!Array.isArray(children)) return '';
  return children.map((child) => child?.text ?? '').join('');
}

/** `id` del ancla de un heading. Fuente única para el `<h2 id>` y para el TOC. */
export function headingId(block: unknown): string {
  return slugify(blockText(block));
}

/**
 * Headings de un Portable Text, para armar una tabla de contenidos.
 *
 * Devuelve `[]` si el campo está vacío o no tiene headings, que es el caso real hoy en
 * `resource`: el único documento cargado trae el TOC pegado como párrafo con links
 * absolutos, y el cuerpo del artículo nunca se migró. La página trata el array vacío
 * como "sin TOC" y renderiza el artículo a ancho completo.
 */
export function getHeadings(value: unknown, styles: string[] = ['h2']): { id: string; label: string }[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((block: TextBlock) => block?._type === 'block' && styles.includes(block?.style ?? ''))
    .map((block) => ({ id: headingId(block), label: blockText(block) }))
    .filter((heading) => heading.id !== '' && heading.label !== '');
}

/** `true` si el campo trae al menos un bloque. Evita renderizar secciones vacías. */
export function hasContent(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}
