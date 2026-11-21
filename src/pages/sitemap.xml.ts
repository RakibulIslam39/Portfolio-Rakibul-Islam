import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const STATIC_PAGES = ['/', '/about/', '/projects/', '/writing/', '/certificates/', '/cv/', '/qa/', '/activity/', '/gallery/'];

export const GET: APIRoute = async ({ site }) => {
  const projects = await getCollection('projects');
  const posts = await getCollection('writing');
  const urls: Array<{ path: string; lastmod?: Date }> = [
    ...STATIC_PAGES.map((path) => ({ path })),
    ...projects.map((p) => ({ path: `/projects/${p.id}/` })),
    // Lorem-ipsum drafts stay out of search engines until `placeholder: false`.
    ...posts.filter((p) => !p.data.placeholder && !p.data.url).map((p) => ({ path: `/writing/${p.id}/`, lastmod: p.data.date })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${new URL(u.path, site).href}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
