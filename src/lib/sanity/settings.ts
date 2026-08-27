/**
 * Resolución de SEO desde el singleton `settings` — 27zero.
 *
 * Una sola query de `settings` para todo el build, no una por página.
 * `loadOnce()` cachea la PROMESA (no el resultado) a nivel de módulo: las 13 páginas
 * se renderizan en el mismo proceso de Node, así que la primera que llame dispara el
 * fetch y las otras 12 esperan esa misma promesa. Cachear la promesa y no el valor
 * evita la carrera de que dos páginas entren antes de que la primera resuelva y se
 * disparen dos requests (CLAUDE.md §10, "queries GROQ repetidas por página").
 *
 * Dos puertas de entrada, según de dónde salga el `seo` de la página:
 *  - `getPageSeo(page)`  → las 8 estáticas/shell: el `seo` sale de `settings.{page}Seo`
 *  - `getSeoSettings()`  → las 5 internas: el `seo` sale de su propio documento, de acá
 *                          solo sale el fallback global
 *
 * Nunca las dos para la misma página (CLAUDE.md §8, "nunca ambas fuentes").
 */
import type { SanityImage, Seo } from '../../types/sanity';
import { ogImageUrl, resolveSeo, type ResolvedSeo } from '../seo/resolveSeo';
import { sanityClient } from './client';
import { siteSettingsSeoQuery } from './queries';

/** Una oficina, para el nodo `ProfessionalService` del JSON-LD. */
export interface Office {
  /** Código ISO del país — lo sabemos por el campo, no se parsea de la dirección. */
  country: 'US' | 'CO';
  label: string;
  address?: string;
  phone?: string;
}

/** Lo que `Metadata.astro` y el JSON-LD necesitan del sitio, con imágenes resueltas. */
export interface SiteSeoSettings {
  siteTitle?: string;
  siteUrl?: string;
  /** Fallback global: cubre cualquier campo que la página deje vacío. */
  seo?: ResolvedSeo;
  /** Structured data — hoy todos vacíos en Sanity salvo las oficinas. */
  logoUrl?: string;
  sameAs?: string[];
  offices?: Office[];
  /**
   * URL de LinkedIn, cruda. Ya alimenta `sameAs` del JSON-LD, pero el footer la
   * necesita suelta para el `href` del link visible (Etapa 8, Hallazgo 1): leerla de
   * `sameAs[0]` acoplaría el footer al orden de ese array. `Page.astro` la baja a
   * `Footer.astro`.
   */
  linkedinUrl?: string;
}

/** Las 8 páginas estáticas/shell que no tienen documento propio en Sanity. */
export type SeoPage =
  | 'home'
  | 'about'
  | 'work'
  | 'clients'
  | 'mentor'
  | 'resources'
  | 'agency'
  | 'contact';

/** Shape crudo que devuelve `siteSettingsSeoQuery`, antes de resolver las imágenes. */
interface SettingsSeoProjection {
  siteTitle?: string;
  siteUrl?: string;
  seo?: Seo;
  logo?: SanityImage;
  linkedinUrl?: string;
  twitterUrl?: string;
  officeUSNew?: { address?: string; phone?: string; email?: string };
  officeCONew?: { address?: string; phone?: string; email?: string };
  homeSeo?: Seo;
  aboutSeo?: Seo;
  workSeo?: Seo;
  clientsSeo?: Seo;
  mentorSeo?: Seo;
  resourcesSeo?: Seo;
  agencySeo?: Seo;
  contactSeo?: Seo;
}

async function load(): Promise<{
  siteSettings: SiteSeoSettings;
  pages: Record<SeoPage, ResolvedSeo | undefined>;
}> {
  /* `?? {}`: hoy el singleton existe pero está vacío, y en un dataset nuevo podría no
     existir. Sin esto el build entero se cae por metadata faltante — que es
     justamente lo que el fallback tiene que absorber. */
  const settings = (await sanityClient.fetch<SettingsSeoProjection | null>(siteSettingsSeoQuery)) ?? {};

  /* `sameAs` con un hueco adentro es peor que sin la propiedad: se filtra acá y, si
     no queda ninguna, el nodo la omite entera en vez de emitir un array vacío. */
  const socialUrls = [settings.linkedinUrl, settings.twitterUrl].filter(
    (url): url is string => Boolean(url)
  );

  return {
    siteSettings: {
      siteTitle: settings.siteTitle,
      siteUrl: settings.siteUrl,
      seo: resolveSeo(settings.seo),
      logoUrl: ogImageUrl(settings.logo),
      sameAs: socialUrls.length ? socialUrls : undefined,
      linkedinUrl: settings.linkedinUrl,
      offices: [
        {country: 'US' as const, label: 'United States', ...settings.officeUSNew},
        {country: 'CO' as const, label: 'Colombia', ...settings.officeCONew},
      ].filter((office) => office.address || office.phone),
    },
    pages: {
      home: resolveSeo(settings.homeSeo),
      about: resolveSeo(settings.aboutSeo),
      work: resolveSeo(settings.workSeo),
      clients: resolveSeo(settings.clientsSeo),
      mentor: resolveSeo(settings.mentorSeo),
      resources: resolveSeo(settings.resourcesSeo),
      agency: resolveSeo(settings.agencySeo),
      contact: resolveSeo(settings.contactSeo),
    },
  };
}

let cached: ReturnType<typeof load> | null = null;

function loadOnce() {
  cached ??= load();
  return cached;
}

/** Páginas estáticas/shell: devuelve su `seo` propio + el fallback global, en un solo await. */
export async function getPageSeo(
  page: SeoPage
): Promise<{ seo: ResolvedSeo | undefined; siteSettings: SiteSeoSettings }> {
  const { siteSettings, pages } = await loadOnce();
  return { seo: pages[page], siteSettings };
}

/** Internas de detalle: solo el fallback global — el `seo` lo pone el documento. */
export async function getSeoSettings(): Promise<SiteSeoSettings> {
  return (await loadOnce()).siteSettings;
}
