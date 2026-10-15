#!/usr/bin/env node
/**
 * fix-content-links — 27zero.
 *
 * Corrige los links internos escritos a mano dentro del contenido de Sanity (los
 * `markDefs` de tipo `link` de cualquier Portable Text) para que apunten directo a la
 * página final, sin pasar por las redirecciones 301 de Netlify.
 *
 * Solo hace cambios SIN PÉRDIDA — el link termina exactamente donde ya termina hoy:
 *   - barra final:  …/resources/foo          → …/resources/foo/
 *   - dominio:      http://27zero.agency/…   → https://www.27zero.agency/…
 *   - slug viejo con redirección 1:1 a su página (`/work/doctums` → `/work/doctums-…/`)
 *   - REPLACEMENTS: los casos decididos a mano (ver abajo).
 *
 * NO toca los links a URLs viejas de Webflow que hoy redirigen a un listado o a la home
 * (`/work/anthology-legacy-conversations` → `/work/`): reescribirlos borraría a qué
 * caso apuntaba el link, y cuando ese caso se cree en Sanity ya no habría forma de
 * reconectarlo. Esos se listan en el reporte y siguen funcionando vía `_redirects`.
 *
 * Seguridad:
 *   - Por defecto corre en modo prueba: muestra qué cambiaría y no escribe nada.
 *   - `--apply` guarda antes una copia completa de cada documento afectado en
 *     `scripts/backups/` y escribe todo en UNA transacción con `ifRevisionID`: si
 *     alguien editó un documento mientras tanto, no se aplica nada (ni a medias) y no
 *     se pisa su cambio.
 *   - Corrige también el borrador (`drafts.<id>`) si existe; si no, al publicarlo
 *     volvería el link viejo.
 *   - El historial de Sanity guarda igual cada revisión (Studio → History).
 *
 * Uso (desde la raíz del repo):
 *   node scripts/fix-content-links.mjs            # modo prueba
 *   node scripts/fix-content-links.mjs --apply    # aplica los cambios
 *   node scripts/fix-content-links.mjs --plan=plan.json   # además guarda el plan en JSON
 *
 * Requiere SANITY_PROJECT_ID y SANITY_DATASET (en `.env` o en el entorno). Para ver
 * borradores y para `--apply` requiere además SANITY_API_TOKEN con permiso Editor;
 * nunca se versiona (CLAUDE.md §2) — crearlo en sanity.io/manage y borrarlo al terminar.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@sanity/client';

if (existsSync('.env')) process.loadEnvFile('.env');

const APPLY = process.argv.includes('--apply');
const { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_API_TOKEN } = process.env;

const ORIGIN = 'https://www.27zero.agency';
const OWN_HOSTS = new Set(['www.27zero.agency', '27zero.agency']);

/**
 * Reemplazos decididos a mano: href exacto (como está en Sanity) → href final.
 * Se resuelven por href completo y no por path para no capturar nada de más.
 */
const REPLACEMENTS = new Map([
  /* El pilar "EdTech marketing agency" de Webflow vive hoy como resource. */
  ['https://www.27zero.agency/edtech-marketing-agency', `${ORIGIN}/resources/edtech-marketing-agency/`],
  ['https://www.27zero.agency/edtech-marketing-agency/', `${ORIGIN}/resources/edtech-marketing-agency/`],
  /* "Let's Talk" de Webflow = `/contact` del sitio nuevo. */
  ['https://www.27zero.agency/lets-talk', `${ORIGIN}/contact/`],
  ['http://27zero.agency/lets-talk', `${ORIGIN}/contact/`],
  /* Alguien pegó el texto del link en vez de la URL. */
  ['https://Edtech marketing operations agency', `${ORIGIN}/resources/edtech-marketing-operations-agency/`],
]);

/** Tipos con Portable Text que se renderiza en el sitio. */
const DOCUMENT_TYPES = [
  'edtechMentor',
  'resource',
  'work',
  'edtechMarketingPractice',
  'edtechMarketingService',
  'settings',
  'team',
  'testimonial',
];

if (!SANITY_PROJECT_ID || !SANITY_DATASET) {
  console.error('Faltan SANITY_PROJECT_ID / SANITY_DATASET (en .env o en el entorno).');
  process.exit(1);
}
if (APPLY && !SANITY_API_TOKEN) {
  console.error('--apply necesita SANITY_API_TOKEN con permiso Editor.');
  process.exit(1);
}

const client = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: '2026-08-20',
  token: SANITY_API_TOKEN,
  useCdn: false,
  /* `raw` devuelve publicados y borradores por separado, cada uno con su `_rev`. */
  perspective: SANITY_API_TOKEN ? 'raw' : 'published',
});

/** Recorre el documento y devuelve cada link con su path de patch por `_key`. */
function findLinks(node, path = [], out = []) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      const segment = item && typeof item === 'object' && item._key ? `[_key=="${item._key}"]` : `[${index}]`;
      findLinks(item, [...path.slice(0, -1), `${path.at(-1)}${segment}`], out);
    });
  } else if (node && typeof node === 'object') {
    if (node._type === 'link' && typeof node.href === 'string' && path.length) {
      out.push({ path: [...path, 'href'].join('.'), href: node.href });
    }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_') && key !== '_key') continue;
      if (value && typeof value === 'object') findLinks(value, [...path, key], out);
    }
  }
  return out;
}

const resolved = new Map();

/** Destino final de un link interno siguiendo las redirecciones del sitio en vivo. */
async function resolveFinal(href) {
  if (resolved.has(href)) return resolved.get(href);
  let result = null;
  try {
    const response = await fetch(href, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    result = { status: response.status, url: response.url };
  } catch (error) {
    result = { status: `ERR ${error.message}`, url: null };
  }
  resolved.set(href, result);
  return result;
}

/** Igualdad "sin pérdida": mismo path salvo la barra final, cualquier host propio. */
const samePage = (a, b) =>
  OWN_HOSTS.has(a.host) && OWN_HOSTS.has(b.host) && a.pathname.replace(/\/+$/, '') === b.pathname.replace(/\/+$/, '');

/**
 * Página de detalle (`/work/<slug>/`, `/resources/<slug>/`…), no un listado ni la home.
 * Una redirección que termina en un detalle es 1:1 (el slug cambió, la página es la
 * misma) y se puede reescribir; una que termina en un listado es una pérdida y no.
 */
const isDetailPage = (url) => url.pathname.split('/').filter(Boolean).length >= 2;

/** Decide el href nuevo, o `null` si el link se deja como está (con el motivo). */
async function decide(href) {
  if (REPLACEMENTS.has(href)) return { next: REPLACEMENTS.get(href), reason: 'reemplazo decidido' };

  let url;
  try {
    url = new URL(href);
  } catch {
    return { next: null, reason: 'URL inválida (revisar a mano)' };
  }
  if (!/^https?:$/.test(url.protocol) || !OWN_HOSTS.has(url.host)) return null; // externo, mailto, tel

  const final = await resolveFinal(href);
  if (final.status !== 200 || !final.url) return { next: null, reason: `destino responde ${final.status}` };

  const finalUrl = new URL(final.url);
  const same = samePage(url, finalUrl);
  if (!same && !isDetailPage(finalUrl)) {
    return { next: null, reason: `redirige al listado ${finalUrl.pathname} (URL vieja, se deja)` };
  }

  const next = `${ORIGIN}${finalUrl.pathname}${url.search}${url.hash}`;
  if (next === href) return null;
  return { next, reason: same ? 'barra final / dominio' : 'slug viejo → su página actual' };
}

const documents = await client.fetch(`*[_type in $types]`, { types: DOCUMENT_TYPES });

const changes = []; // { doc, edits: [{ path, from, to, reason }] }
const skipped = []; // { id, href, reason }

for (const doc of documents) {
  const edits = [];
  for (const { path, href } of findLinks(doc)) {
    const decision = await decide(href);
    if (!decision) continue;
    if (decision.next) edits.push({ path, from: href, to: decision.next, reason: decision.reason });
    else skipped.push({ id: doc._id, href, reason: decision.reason });
  }
  if (edits.length) changes.push({ doc, edits });
}

const totalEdits = changes.reduce((sum, change) => sum + change.edits.length, 0);
console.log(`\n${APPLY ? 'APLICANDO' : 'MODO PRUEBA (no se escribe nada)'} — ${SANITY_DATASET}`);
if (!SANITY_API_TOKEN) console.log('Sin token: solo se leyeron documentos publicados (los borradores no se ven).');
console.log(`Documentos revisados: ${documents.length} | a corregir: ${changes.length} | links: ${totalEdits}\n`);

for (const { doc, edits } of changes) {
  console.log(`${doc._id}  (${doc._type}${doc.slug?.current ? ` · ${doc.slug.current}` : ''})`);
  for (const edit of edits) console.log(`   ${edit.from}\n → ${edit.to}   [${edit.reason}]`);
}

if (skipped.length) {
  console.log(`\nSe dejan como están (${skipped.length}):`);
  for (const item of skipped) console.log(`   ${item.href}   [${item.reason}]  en ${item.id}`);
}

/* `--plan=<archivo>`: guarda el plan (documentos, revisión y cada cambio) en JSON, para
   revisarlo o compartirlo antes de aplicar. */
const planFile = process.argv.find((arg) => arg.startsWith('--plan='))?.slice('--plan='.length);
if (planFile) {
  const plan = changes.map(({ doc, edits }) => ({ _id: doc._id, _rev: doc._rev, _type: doc._type, edits }));
  writeFileSync(planFile, JSON.stringify({ changes: plan, skipped }, null, 2));
  console.log(`\nPlan guardado en ${planFile}`);
}

if (!APPLY) {
  console.log('\nPara aplicar: node scripts/fix-content-links.mjs --apply');
  process.exit(0);
}

const backupDir = join('scripts', 'backups');
mkdirSync(backupDir, { recursive: true });
const backupFile = join(backupDir, `content-links-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(backupFile, JSON.stringify(changes.map(({ doc }) => doc), null, 2));
console.log(`\nCopia de seguridad: ${backupFile}`);

/* Una sola transacción: o se corrigen todos los documentos o ninguno. Si alguno cambió
   desde la lectura (`ifRevisionID`), Sanity rechaza la transacción entera y no queda
   nada a medias — se vuelve a correr el script y lee las versiones nuevas. */
const transaction = client.transaction();
for (const { doc, edits } of changes) {
  const set = Object.fromEntries(edits.map((edit) => [edit.path, edit.to]));
  transaction.patch(client.patch(doc._id).ifRevisionId(doc._rev).set(set));
}

try {
  await transaction.commit({ autoGenerateArrayKeys: false });
} catch (error) {
  console.error(`\nNo se aplicó ningún cambio: ${error.message}`);
  console.error('Si un documento se editó mientras corría el script, volver a correrlo.');
  process.exit(1);
}

console.log(`\nListo: ${changes.length} documento(s) y ${totalEdits} link(s) corregidos.`);
