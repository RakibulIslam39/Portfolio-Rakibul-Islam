import type { APIRoute } from 'astro';
import { streetsSvg, type MapTheme } from '../../lib/findmy';

export function getStaticPaths() {
  return [{ params: { theme: 'dark' } }, { params: { theme: 'light' } }];
}

export const GET: APIRoute = ({ params }) =>
  new Response(streetsSvg(params.theme as MapTheme), { headers: { 'content-type': 'image/svg+xml' } });
