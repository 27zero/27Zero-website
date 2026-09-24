/**
 * URL de video del CMS → URL de embed — 27zero.
 *
 * `work.heroVideo` es un campo `url` libre: el editor pega lo que copia de la barra del
 * navegador, así que llega en cualquiera de las formas que YouTube y Vimeo usan
 * (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`, con `&list=` y otros parámetros de
 * más, o el link privado de Vimeo con hash). Acá se reduce todo al id y se arma el
 * embed canónico de cada proveedor.
 *
 * Cualquier URL que no se reconozca devuelve `undefined`, y la página cae a la imagen:
 * un iframe apuntando a algo que no es un player rompería el hero.
 */

export interface VideoEmbed {
  provider: 'youtube' | 'vimeo';
  src: string;
}

const YOUTUBE_ID = /^[\w-]{11}$/;

export function toVideoEmbed(value: string | null | undefined): VideoEmbed | undefined {
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return undefined;
  }

  const host = url.hostname.replace(/^(www|m)\./, '');
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be'
        ? segments[0]
        : url.searchParams.get('v') ?? (['embed', 'shorts', 'live'].includes(segments[0]) ? segments[1] : undefined);

    /* `youtube-nocookie`: el mismo player, sin cookies de seguimiento hasta que se da
       play. `rel=0` limita los videos sugeridos al final al mismo canal. */
    return id && YOUTUBE_ID.test(id)
      ? { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` }
      : undefined;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    /* El id es el primer segmento numérico (`/123`, `/video/123`, `/channels/x/123`).
       Un video no listado trae además un hash privado, como segmento siguiente o como
       `?h=`, y sin él el player no carga. */
    const index = segments.findIndex((segment) => /^\d+$/.test(segment));
    if (index === -1) return undefined;

    const id = segments[index];
    const hash = url.searchParams.get('h') ?? segments[index + 1];
    const query = hash && /^[\da-f]+$/i.test(hash) ? `?h=${hash}` : '';

    return { provider: 'vimeo', src: `https://player.vimeo.com/video/${id}${query}` };
  }

  return undefined;
}
