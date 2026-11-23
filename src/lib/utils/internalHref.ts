/**
 * Links internos escritos a mano en el CMS → URL final, sin pasar por redirecciones.
 *
 * Por qué existe: el contenido de Sanity (Portable Text, `ctaHref`, `ctaLink`) trae links
 * viejos de Webflow (`/services/website`, `/work/anthology-marketing-programs`) o sin
 * barra final (`/contact`). Funcionan, pero cada clic pasa por un 301 de Netlify, y Google
 * cuenta cada uno como un salto extra. El crawl del 23 nov 2026 encontró 23 links internos
 * así, uno de ellos (`/contact`) en 72 páginas.
 *
 * Por qué se resuelve al renderizar y no reescribiendo el contenido: `scripts/fix-content-
 * links.mjs` deliberadamente NO reescribe en Sanity los links a casos que hoy redirigen a un
 * listado (`/work/anthology-legacy-conversations` → `/work/`), para no perder a qué caso
 * apuntaban. Acá el dato en Sanity queda intacto y solo cambia el HTML: cuando ese caso se
 * publique y se quite su regla de `_redirects`, el link vuelve solo a la página del caso.
 *
 * Fuente única: las mismas reglas de `public/_redirects` que aplica Netlify. Se lee una vez
 * por build; no hay un segundo mapa que mantener.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE_HOSTS = new Set(['www.27zero.agency', '27zero.agency']);

/** Máximo de saltos a seguir: protege de un ciclo accidental en `_redirects`. */
const MAX_HOPS = 5;

/** Extensión de archivo al final del path (`.xml`, `.pdf`): esos no llevan barra final. */
const FILE_EXTENSION = /\.[a-z0-9]{2,5}$/i;

interface RedirectRule {
  /** Path exacto, o prefijo si la regla termina en `/*`. */
  from: string;
  isSplat: boolean;
  to: string;
}

/**
 * Reglas de path de `_redirects`, en orden (Netlify aplica la primera que coincide).
 *
 * Se descartan:
 *  - las de dominio (`https://27zero.co/*`): no aplican a un path;
 *  - las "redes de seguridad" (`/x/*  /x/`): Netlify solo las aplica cuando la página NO
 *    existe, cosa que acá no se puede saber. Aplicarlas mandaría al índice links a
 *    entrevistas publicadas.
 */
function loadRules(): RedirectRule[] {
  let text: string;
  try {
    text = readFileSync(join(process.cwd(), 'public', '_redirects'), 'utf-8');
  } catch {
    /* Sin el archivo los links salen tal como vienen del CMS: igual funcionan vía
       Netlify. No es motivo para romper el build. */
    return [];
  }

  const rules: RedirectRule[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const [from, to] = line.split(/\s+/);
    if (!from?.startsWith('/') || !to) continue;

    const isSplat = from.endsWith('/*');
    const prefix = isSplat ? from.slice(0, -1) : from;
    if (isSplat && to === prefix) continue;

    rules.push({ from: isSplat ? prefix : from.replace(/\/+$/, ''), isSplat, to });
  }
  return rules;
}

const RULES = loadRules();

function applyRules(path: string): string | null {
  const bare = path.replace(/\/+$/, '') || '/';
  for (const rule of RULES) {
    if (rule.isSplat) {
      if (path.startsWith(rule.from)) return rule.to.replace(':splat', path.slice(rule.from.length));
    } else if (bare === rule.from) {
      return rule.to;
    }
  }
  return null;
}

const withTrailingSlash = (path: string): string =>
  path.endsWith('/') || FILE_EXTENSION.test(path) ? path : `${path}/`;

/**
 * Href del CMS → href final. Externos, `mailto:`, `tel:` y anclas pasan sin tocar.
 * Los absolutos al dominio propio se vuelven relativos (mismo destino, sin depender del
 * host de cada entorno: staging, deploy preview).
 */
export function resolveInternalHref(href: string | null | undefined): string {
  const raw = href?.trim() ?? '';
  if (!raw) return raw;

  let url: URL;
  try {
    url = new URL(raw, 'https://www.27zero.agency');
  } catch {
    return raw;
  }

  const isRelative = raw.startsWith('/');
  if (!isRelative && !(/^https?:/i.test(raw) && SITE_HOSTS.has(url.hostname))) return raw;

  let path = url.pathname;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const next = applyRules(path);
    if (next === null || next === path) break;
    /* Un destino absoluto a otro dominio en `_redirects` no es un link interno: se
       devuelve tal cual. */
    if (/^https?:/i.test(next)) return next;
    path = next;
  }

  return `${withTrailingSlash(path)}${url.search}${url.hash}`;
}
