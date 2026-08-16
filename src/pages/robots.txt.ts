import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Disallow: /studio
Disallow: /api

Sitemap: /sitemap-index.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
