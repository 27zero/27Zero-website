/**
 * og:type por documentType — 27zero.
 *
 * La tabla vive acá y no en cada página: el criterio de qué es `article` y qué es
 * `website` es una decisión de SEO del sitio entero, no de la plantilla que la
 * consume. Una página pasa su documentType — que es un hecho, no una decisión — y
 * el mapeo lo resuelve este módulo.
 *
 * `article` es para contenido editorial fechado, no para "cualquier interna":
 *  - `resource`     → es un blog (33 posts entran en Etapa 12)
 *  - `edtechMentor` → entrevistas
 * El resto son páginas de producto/servicio, que en Open Graph son `website`:
 * `work` (case studies), `edtechMarketingPractice` y `edtechMarketingService`.
 *
 * El `Record` es exhaustivo a propósito: agregar un documentType al union sin
 * asignarle og:type no compila, así que un tipo nuevo no puede caer en un default
 * silencioso.
 */

export type OgType = 'website' | 'article';

/** Los 5 documentTypes con página de detalle propia. */
export type SeoDocumentType =
  | 'work'
  | 'edtechMentor'
  | 'resource'
  | 'edtechMarketingPractice'
  | 'edtechMarketingService';

const OG_TYPE_BY_DOCUMENT: Record<SeoDocumentType, OgType> = {
  resource: 'article',
  edtechMentor: 'article',
  work: 'website',
  edtechMarketingPractice: 'website',
  edtechMarketingService: 'website',
};

/** Las 8 estáticas/shell no tienen documentType: son `website` por definición. */
export const DEFAULT_OG_TYPE: OgType = 'website';

export function ogTypeFor(documentType: SeoDocumentType): OgType {
  return OG_TYPE_BY_DOCUMENT[documentType];
}
