# CLAUDE.md — 27zero

> Instancia de proyecto de la plantilla base Astro + Sanity. Complementa a `PLANNING.md` (etapas y estado de la migración) — este archivo son las reglas fijas del stack.
>
> **Working repo:** este `CLAUDE.md` vive en `https://github.com/27zero/27Zero-website.git` — es el ÚNICO repo donde Claude Code escribe código. `27zero-vanilla` (`https://github.com/SantiagoLopez0/27zero.git`) se clona aparte como referencia de solo lectura (markup, clases, lógica JS, design system) — nunca se escribe ahí. `27zero-sanity` (`https://github.com/27zero/27zero-sanity.git`, admin access) se toca solo en tareas explícitas de schema.

---

## 0. Paso obligatorio antes de codear

Completar este archivo es el **primer paso de cualquier proyecto**. Claude no genera código, estructura ni schemas hasta que las secciones `[completar al iniciar proyecto]` estén resueltas.

**Respuestas del briefing (27zero) — CERRADO:**

1. **Total de páginas: 13**, confirmadas contra Figma:
   1. Home — estática
   2. Work — CMS (`documentType: work`, vista/orden A)
   3. Clientes — CMS (`documentType: work`, mismo tipo, vista/orden B)
   4. Interna Work/Clientes — CMS, plantilla de detalle compartida (`documentType: work` + `getStaticPaths()`)
   5. EdTech Mentor — CMS (`documentType: edtechMentor`)
   6. EdTech Mentor interna — CMS detalle
   7. Resources — CMS (`documentType: resource`)
   8. Resources interna — CMS detalle
   9. EdTech Marketing — estática, con cards que referencian `edtechMarketingPractice` y `edtechMarketingService`
   10. EdTech Marketing Practice — CMS (`documentType: edtechMarketingPractice`)
   11. EdTech Marketing Service — CMS (`documentType: edtechMarketingService`)
   12. About — estática, con componente Team que llama CMS (`documentType: team` o referenciado)
   13. Let's Talk — estática (equivalente a `/contact` del repo vanilla)

   *"Menu" del repo vanilla (`/index.html`) no es página final — era navegación de desarrollo del prototipo, no se migra como ruta.*

2. **`documentType` a crear/auditar en `27zero-sanity`:** `work` (ya existe como `Work`, PascalCase — evaluar rename a camelCase en Etapa 1), `edtechMentor`, `resource`, `edtechMarketingPractice`, `edtechMarketingService`, `team`. Mapeo a nivel componente (qué más allá de estas páginas llama Sanity) se resuelve en `PLANNING.md` Etapa 5.
3. **Páginas fijas con campos editables:** ninguna.
4. **`siteSettings`:** sí — ya existe en `27zero-sanity`, se ajusta, no se crea.
5. **Design system / brand guide:** sin fuente externa al Figma — toda la documentación vive en el repo vanilla, se toma de ahí.

---

## 1. Principios rectores

Cuando dos reglas de este documento entren en conflicto, gana el principio:

1. **Reusabilidad y escalabilidad** por encima de la solución rápida.
2. **Código limpio y legible** — sin abstracciones prematuras ni indirección innecesaria.
3. **Cuestionar antes de implementar.** Ante cualquier decisión de implementación, Claude plantea **al menos dos approaches con sus trade-offs y espera decisión**. No se asume la primera solución viable como la correcta ni se cierra una única opción sin contraste.

### Regla crítica
Claude nunca crea contenido, secciones o estructura sin instrucciones explícitas o referencia visual (Figma/screenshot). Esperar specs claras antes de construir.

---

## 2. Stack

- **Framework:** Astro (SSG)
- **Islands:** React (`.tsx`) solo donde haya interactividad real
- **CMS:** Sanity — repo y deploy independientes del sitio, hosting gratuito (`cliente.sanity.studio`)
- **CSS:** Tailwind v4 con tokens fluidos en `@theme`
- **Animación:** GSAP en `<script>` de Astro. Swiper / Embla según necesidad
- **Hosting:** Netlify. Sanity → Deploy Hook para rebuild por publicación de contenido
  - Por qué: el plan Hobby de Vercel prohíbe uso comercial (cualquier deploy con código de un consultor pago califica como tal); Netlify free permite proyectos comerciales y su pricing es más simple para cuentas multi-usuario de cliente
- **Imágenes:** Sanity Image CDN vía `urlFor()` (no cuenta contra bandwidth del hosting)

**Nota sobre hosting gratuito de Sanity:** la URL del Studio es `cliente.sanity.studio` (dominio propio requiere plan pago) y hay tope de usuarios en el plan free — verificar si el cliente tendrá varios editores.

### Variables de entorno y secrets

- **Producción:** viven en el panel de Environment Variables de Netlify, nunca en el repo.
- **Local:** archivo `.env` en la raíz del proyecto, listado en `.gitignore` desde el primer commit — no después.
- Se versiona un `.env.example` con las keys sin valores, como referencia para el cliente o para retomar el proyecto.
- Mínimo por proyecto: `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN` (si hay contenido privado/draft), keys de servicios de terceros (forms, analytics) si aplica.

---

## 3. Estructura de carpetas

Repos separados: **sitio** y **studio**.

```
sitio/
  src/
    components/
      ui/        → Button, Badge, Card (atómicos, reutilizables)
      sections/  → Hero, Features, CTA, Testimonials (bloques de página)
      layout/    → Header, Footer, Nav
      seo/       → Metadata.astro, OpenGraph.astro, JsonLd.astro
    layouts/     → Base.astro, Page.astro
    pages/
      index.astro
      [...slug].astro   → páginas que comparten plantilla
      sitemap-index.xml.ts  → @astrojs/sitemap
      robots.txt.ts
    lib/
      sanity/    → client.ts, queries.ts, image.ts
      seo/       → generateJsonLd.ts
      utils/
    styles/      → global.css (tokens + @theme)
    types/       → sanity.ts (espejo manual del schema)
  public/fonts/

studio/
  schemas/
  sanity.config.ts
```

**Criterio de ubicación de componentes:** si recibe datos de Sanity y ocupa el ancho de la página, es `sections/`. Si se reutiliza dentro de otros componentes, es `ui/`. Si es estructura global, es `layout/`.

**No separar por tecnología.** `.astro` y `.tsx` conviven en la misma carpeta; la extensión ya los distingue. Agrupar por rol, no por librería.

---

## 4. Sanity vs. contenido estático

**El criterio se aplica por tipo de contenido dentro del proyecto, no por proyecto entero.**

Pregunta única: *¿el cliente necesita cambiar esto sin llamarme?*

### Default: páginas fijas 100% estáticas
El contenido aprobado en Figma vive en el código. Cambios posteriores se hacen en branch → PR → merge a `main`. No se construye un espejo del diseño en Sanity: infla el Desk con formularios que el cliente no usa.

### Va a Sanity si cumple al menos una:
- Existen N instancias del mismo shape (blog, servicios, equipo, casos, testimonials)
- El contenido cambia sin que cambie el diseño
- El cliente lo edita de forma recurrente

### Excepción, nunca default
Si en briefing el cliente pide explícitamente editar textos de una página fija, se crea un **singleton acotado solo con esos campos**. Nunca un espejo de la página completa. Si no lo pide, no se construye.

### Siempre estático
Copy legal, 404, labels de UI, y cualquier sección con maquetación única de una sola página.

- Tipos de contenido en Sanity: `work` (Work + Clientes + interna compartida — mismo documentType, distinto orden/criterio de vista), `edtechMentor`, `resource`, `edtechMarketingPractice`, `edtechMarketingService`, `team` (referenciado desde About)
- Páginas fijas con campos editables: ninguna
- `siteSettings`: **sí** — ya existe en `27zero-sanity`, se ajusta, no se crea

---

## 5. CSS — Tailwind v4 + tokens fluidos

**El design system vive en `src/styles/global.css`, no en este archivo.** Aquí se documenta la convención; los valores se escriben una sola vez en `@theme` para evitar que la documentación quede desactualizada respecto al CSS.

### Tokens
```css
@import "tailwindcss";

@theme {
  --text-h1:       clamp(2.5rem, 1.8rem + 3.5vw, 4.5rem);
  --text-body:     clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --spacing-section: clamp(4rem, 2rem + 10vw, 10rem);
}
```
Genera utilidades nativas (`text-h1`, `py-section`).

### Reglas
- **rem exclusivamente.** No se usa `em` en ningún caso — no se mezclan unidades. Los componentes que necesiten escalar llevan variantes explícitas (`sm`, `md`, `lg`), no herencia de `font-size`.
- **`clamp()` siempre en formato `rem + vw`.** El término medio nunca puede ser solo `vw`: rompe el zoom del navegador y penaliza el score de accesibilidad.
- **El primer valor del `clamp()` es el tamaño mobile del Figma; el tercero, el desktop.** Ambos se respetan exactos en los extremos.
- **Media queries solo si la escala del diseño no es lineal** (ej. mobile 32 → tablet 36 → desktop 72). `clamp()` no reproduce saltos no lineales.

### Desvíos del token
Los tokens son recomendación, no valor estricto:
1. **Token primero.**
2. Si el diseño exige un valor fuera de escala → **escape hatch nativo de Tailwind** en rem: `mt-[3.25rem]`. Preferir esto a `<style>` scoped.
3. Si el mismo valor arbitrario aparece **3+ veces**, dejó de ser excepción: se promueve a token.
4. `<style>` scoped solo cuando el desvío es estructural (grid particular, animación), no por un valor puntual.

`[completar al iniciar proyecto]`
- Link al Figma / brand kit: `___` (no bloqueante — fuente de verdad primaria es el repo vanilla, ya documentado y aprobado; Figma solo se necesitaría para casos puntuales no cubiertos ahí, ver sección 12)
- Escala tipográfica: **fluida (default)** — confirmado contra el repo vanilla (ej. h1 48px desktop → 32px mobile, proporción lineal, sin saltos que requieran breakpoint)

---

## 6. Naming conventions

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | `PascalCase.astro` / `.tsx` | `ServiceCard.astro` |
| Secciones | Sin sufijo `Section` | `Hero.astro`, no `HeroSection.astro` |
| Rutas y slugs | `kebab-case` | `/casos-de-exito` |
| Variables y funciones | `camelCase` | `formatDate()` |
| Constantes de config | `SCREAMING_SNAKE` | `SITE_URL` |
| Archivos no-componente | `camelCase.ts` | `sanityClient.ts` |
| Queries GROQ | `[entidad]Query` | `servicesQuery` |
| Tipos | `PascalCase`, sin prefijo `I` | `Service` |

### Reglas de archivo
- **Un componente por archivo**, nombre de archivo = nombre del componente.
- **Sin `index.astro`** dentro de carpetas de componente: hace el import legible pero el archivo abierto anónimo.
- **Props siempre tipadas**, con la interface declarada arriba del componente y llamada `Props`.
- **Nombres descriptivos por sobre cortos**: `serviceCardImage`, no `img`.

---

## 7. Hidratación de componentes

**Marco:** los `.astro` no llegan nunca al navegador, se compilan a HTML plano. Solo los `.tsx` cargan JS, y solo si llevan directiva.

### Paso 1 — ¿`.astro` o `.tsx`?
Default: `.astro`. Se usa `.tsx` únicamente si el componente cumple al menos una:
- Mantiene estado que cambia tras la carga (`useState`)
- Responde a eventos del usuario que modifican su propio render
- Consume una librería que exige React

Maquetación, contenido de Sanity, listados y condicionales de build **no** califican.

### Paso 2 — ¿lleva directiva?
Un `.tsx` sin directiva se renderiza a HTML estático y queda inerte. Es válido y deseable si el componente solo se reutiliza por conveniencia. Solo lleva directiva si su interactividad es necesaria en runtime.

### Paso 3 — ¿cuál directiva?

| Condición | Directiva |
|---|---|
| Interactivo, por debajo del fold | `client:visible` ← **default** |
| Interactivo, above the fold, interacción posible al instante | `client:load` |
| Interactivo solo en un rango de viewport | `client:media="(max-width: 48rem)"` |
| Depende de `window`/`localStorage`, no renderizable en server | `client:only="react"` |

`client:idle` **no se usa**: `client:visible` cubre su caso con mejor performance.
Todo uso de `client:load` o `client:only` **debe justificarse explícitamente al entregar el código**.

### Prohibiciones
- No envolver contenido estático en un `.tsx` para "poder animarlo".
- No usar `client:only` para evitar resolver un error de SSR; se resuelve el error.
- No hidratar un componente padre completo cuando solo un hijo necesita interactividad — se extrae el hijo y se hidrata ese.

### Animación
GSAP va en `<script>` dentro del `.astro`, nunca en una island: Astro lo bundlea y ejecuta en cliente sin cargar el runtime de React. Swiper / Embla siguen la misma regla, salvo que su estado deba sincronizarse con estado de React.
**Excepción única:** la animación depende de estado de React → `.tsx` con `client:visible` y limpieza en `useEffect`.

---

## 8. Sanity schema patterns

### Estructura de documentos
**Un `documentType` por plantilla** (`service`, `caseStudy`, `post`). Cada tipo tiene solo los campos que su plantilla usa: el editor ve un formulario limpio y no puede llenar campos que no se renderizan.

**No se usa page builder** (tipo `page` genérico con array de secciones): devuelve al cliente control sobre el layout, que es justamente lo que este workflow evita.

**Páginas que comparten estructura** → un solo tipo + `getStaticPaths()`. Nunca un tipo por página.

### Singletons
Para contenido único. Se definen como documento normal con `__experimental_actions` restringido y estructura custom en el Desk, para que el cliente no pueda crear duplicados ni borrarlos.

`siteSettings` es el singleton por defecto: teléfono, dirección, email, redes sociales — lo que cambia sin que cambie el diseño. Los links del nav normalmente **no** van acá, porque cambiarlos implica cambiar rutas.

### Referencias vs. embebidos
El criterio es de propiedad, no de tamaño:
- **`reference`** → el contenido existe por sí mismo y se reutiliza en más de un lugar (autor, servicio, categoría). Se edita una vez, se actualiza en todos lados. Costo: la query debe expandirla con `->`.
- **Objeto embebido** → solo tiene sentido dentro de su padre (ítem de FAQ, stat, slide de testimonio). Sacarlos a documentos propios llena el Desk de ruido. Costo: duplicación si el criterio fue mal aplicado.

### Nombres de campos
- `camelCase` siempre (GROQ y JS lo consumen directo)
- Significado fijo en todo el proyecto: `title`, `slug`, `seo`, `body`, `image`, `mainImage` (destacada), `publishedAt`
- Booleanos con prefijo verbal: `isFeatured`, `hasVideo`
- Cada campo con `title` legible en español y `description` cuando el uso no sea obvio — **el schema es también la UX del editor**

### Contrato de tipos
Los repos están separados: **no hay build step ni sincronización automática.**

Cuando se defina o modifique un schema en el Studio, se actualiza `src/types/sanity.ts` en el repo del sitio como **espejo manual**: mismos nombres de campo, mismos tipos, misma opcionalidad. Cambio en el schema = cambio inmediato en el archivo de tipos, dentro del mismo ciclo de trabajo. Si divergen, TypeScript miente y el error aparece en runtime.

### Reglas transversales
- Todo texto largo va como **Portable Text** (`array of block`), nunca `string`, salvo que sea literalmente una línea. Migrar de `string` a bloque después obliga a migrar contenido.
- **SEO:** frontmatter del `.astro` en páginas estáticas; objeto `seo` en el schema solo para tipos de Sanity. **Nunca ambas fuentes para la misma página.**

---

## 8.1 SEO & Metadata

**Object type reutilizable, no documento aparte.** `objects/seo.ts` se embebe como campo dentro de cada `documentType` que renderiza una página propia (`service`, `caseStudy`, `post`) — equivalente al panel "SEO Settings" por Collection Item de Webflow, no una Collection independiente.

```ts
// studio/schemas/objects/seo.ts
{
  name: 'seo', title: 'SEO', type: 'object',
  fields: [
    { name: 'title', type: 'string', title: 'Meta Title' },
    { name: 'description', type: 'text', title: 'Meta Description', rows: 3 },
    { name: 'ogImage', type: 'image', title: 'OG Image' },
    { name: 'canonicalUrl', type: 'url', title: 'Canonical URL' },
    { name: 'noIndex', type: 'boolean', title: 'No Index', initialValue: false },
  ],
}
```

**Fallback:** campo vacío → hereda de `siteSettings` (default title template + OG default). Equivalente a Site Settings → SEO global en Webflow.

**Componente único** (`components/seo/Metadata.astro`) recibe el objeto `seo` sin importar el origen (query GROQ o constante hardcodeada en página estática) — misma interfaz para ambas fuentes.

**JSON-LD** (`components/seo/JsonLd.astro`, armado en `lib/seo/generateJsonLd.ts`) según tipo de contenido:
- `Organization` → layout global
- `Article` / `BlogPosting` → posts
- `BreadcrumbList` → si hay jerarquía de navegación
- `LocalBusiness` → si aplica al cliente

**Sitemap y robots:** `@astrojs/sitemap` excluyendo rutas draft/preview de Sanity; `robots.txt.ts` bloqueando `/studio` y `/api`.

**Accesibilidad ligada al schema:** campo `alt` **obligatorio** (no opcional) en cualquier `type: 'image'` — se refuerza a nivel de schema, no queda a criterio del editor.

---

## 9. Workflow (Briefing → Código → QA)

1. **Configurar este archivo** (sección 0) — obligatorio antes de todo
2. **Briefing:** spec clara — Figma (vía Figma Dev MCP o screenshot) + contexto del cliente
3. **Preguntas antes de codear:** Claude pregunta sobre schema, estructura de datos y ambigüedades de diseño ANTES de generar código
4. **Generación de código:** con al menos dos approaches planteados donde haya decisión de implementación (ver Principio 3)
5. **Entrega + QA:** revisión, prueba, iteración o aprobación
6. **Iteración:** cambios puntuales, no "rediseñar todo" sin razón
7. **Checklist pre-entrega** (sección 10)

---

## 10. QA pre-entrega

- [ ] **Lighthouse:** Performance 90+, Accesibilidad 100, SEO 100, Buenas Prácticas 100
- [ ] **JS enviado al cliente:** revisar el HTML de build y confirmar que el JS corresponde **solo** a los componentes con directiva declarada. Cualquier bundle inesperado indica una island mal aplicada
- [ ] **Build time < 2 min.** Si se pasa, investigar antes de entregar:
  - Imágenes procesadas localmente que deberían servirse desde el CDN de Sanity (`urlFor()`, no `<Image>` de Astro sobre assets remotos)
  - Queries GROQ repetidas por página dentro de `getStaticPaths` en vez de una sola query
  - Dependencias pesadas importadas en `.astro` que se ejecutan en build

  *El umbral es de experiencia de cliente, no de comodidad propia: en Netlify free tier el build corre en cada publicación vía deploy hook, así que 3 min de build = 3 min hasta que el contenido aparece — además de contar contra el límite de minutos de build del plan.*
- [ ] **Mobile-first:** breakpoints y comportamiento en mobile real, no solo devtools
- [ ] **Accesibilidad baseline:** contraste, alt text, navegación por teclado, semántica HTML
- [ ] **Imágenes optimizadas:** WebP/AVIF, lazy loading donde aplique
- [ ] **SEO:** meta tags con fallback a `siteSettings` resuelto en todas las páginas, OG tags + Twitter Card, JSON-LD por tipo de contenido, sitemap sin drafts/preview, `robots.txt` bloqueando `/studio` y `/api`, `alt` presente en todas las imágenes
- [ ] **Links y formularios funcionando en producción**, no solo local
- [ ] **Zoom del navegador al 200%** sin pérdida de contenido (valida el uso correcto de `clamp()`)

---

## 11. Config del cliente

`[completar al iniciar proyecto]`

- **Cliente:** 27zero (agencia B2B de EdTech marketing)
- **Repo sitio:** `https://github.com/27zero/27Zero-website.git`
- **Repo studio:** `https://github.com/27zero/27zero-sanity.git` (ya existe, admin access)
- **Repo vanilla (referencia read-only):** `https://github.com/SantiagoLopez0/27zero.git`
- **Dominio producción:** `___`
- **URL staging:** `___`
- **Netlify site ID:** `___`
- **Sanity project ID / dataset:** `___`
- **URL del Studio:** `___.sanity.studio`
- **Editores del Studio:** `___` (verificar tope del plan free)
- **Figma:** `___`
- **Contactos clave:** `___`
- **Notas de briefing:** Etapa 0 cerrada — ver `PLANNING.md` para detalle. 6 documentTypes confirmados: `work`, `edtechMentor`, `resource`, `edtechMarketingPractice`, `edtechMarketingService`, `team`

---

## 12. Figma Dev MCP

- **No generar código directo del MCP sin supervisión** — usar para extraer specs exactas (spacing, colores, tipografía, auto-layout); la traducción a componentes se guía manualmente
- **Requiere archivos Figma limpios** — capas bien nombradas y Auto Layout correcto, o el output será desordenado
- **Combinar con screenshot** — el MCP da datos estructurados, el screenshot da el contexto visual (jerarquía, feel del diseño)
- **Revisar mapeo de componentes/variants** — verificar interpretación de instancias vs. componente base antes de generar código
- **Traducir a tokens, no a valores.** Los px del MCP se mapean a la escala de `@theme`; si no encaja, aplicar la regla de desvío de la sección 5

---

## 13. Pendientes del template

- [ ] Probar Figma Dev MCP en proyecto real y documentar aprendizajes
- [ ] Validar el umbral de 2 min de build con datos de proyectos reales
- [ ] Evaluar `sanity typegen` si el espejo manual de tipos se vuelve costoso

---

*Plantilla base — se completa por proyecto antes de escribir código.*
