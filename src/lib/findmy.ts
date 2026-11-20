import map from '../data/findmy.json';

/** The visible window onto the 640 m street map, in map metres. */
export const VIEW = { x: 220, y: 204, w: 250, h: 250 };

const COLORS = {
  dark: { land: '#1c2026', park: '#1f3527', water: '#17324a', road: '#353b45', minor: '#2c3139', main: '#6b5a33', label: '#aeb4bf', mainLabel: '#e0c27a' },
  light: { land: '#f2efe9', park: '#cfe8c9', water: '#aad3f0', road: '#ffffff', minor: '#e3ded4', main: '#f7d58a', label: '#5d6470', mainLabel: '#8a6a1f' },
} as const;

export type MapTheme = keyof typeof COLORS;

const angle = (a: [number, number], b: [number, number]) => {
  const deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return deg > 90 || deg < -90 ? deg + 180 : deg;
};

/**
 * The streets as one standalone SVG file per theme. Served as an <img>, so the hundred-odd
 * street paths never touch the page's DOM or style work; only the walking pin is live.
 */
export function streetsSvg(theme: MapTheme): string {
  const c = COLORS[theme];
  const roads = (kind: string) => map.roads.filter((r) => r[0] === kind).map((r) => r[1]).join('');
  const label = (text: string, x: number, y: number, deg: number, fill: string, size: number) =>
    `<text x="0" y="0" transform="translate(${x} ${y}) rotate(${deg.toFixed(1)})" fill="${fill}" font-size="${size}" font-weight="600" text-anchor="middle" stroke="${c.land}" stroke-width="3" paint-order="stroke" font-family="-apple-system, system-ui, 'Segoe UI', sans-serif">${text}</text>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" width="${VIEW.w * 2}" height="${VIEW.h * 2}">`,
    `<rect x="-200" y="-200" width="1100" height="1100" fill="${c.land}"/>`,
    `<path fill="${c.park}" d="${map.parks.join('')}"/>`,
    `<path fill="${c.water}" d="${map.water.join('')}"/>`,
    `<path fill="none" stroke="${c.water}" stroke-width="6" stroke-linecap="round" d="${map.streams.join('')}"/>`,
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    `<path stroke="${c.minor}" stroke-width="3.5" d="${roads('s')}"/>`,
    `<path stroke="${c.minor}" stroke-width="3.5" stroke-dasharray="3 4" d="${roads('f')}"/>`,
    `<path stroke="${c.road}" stroke-width="7" d="${roads('r')}"/>`,
    `<path stroke="${c.main}" stroke-width="11" d="${roads('m')}"/>`,
    `<path stroke="#3a8bff" stroke-width="3" stroke-dasharray="2 6" opacity="0.85" d="M${map.route.map((p) => `${p[0]} ${p[1]}`).join('L')}"/>`,
    `</g>`,
    label('Rupnagar Rd', 258, 345, angle([297, 395], [268, 291]), c.mainLabel, 10),
    label('Road No. 5', 356, 330, angle([287, 359], [423, 318]), c.label, 9),
    `</svg>`,
  ].join('');
}
