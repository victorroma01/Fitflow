/* ═══ extras/medals ═══
   Medallas de Logros, dibujadas en SVG: una distinta para cada logro. La forma y el color dicen la familia (entrenos,
   toneladas, rachas, récords, cardio, WOD, comidas, medidas, fotos, peso y copias), el metal del borde el nivel (bronce,
   plata, oro, platino y, para el último de entrenos, amatista) y el dibujo y la cifra del centro, el logro.
   Define: METALS, FAMILIES, SHAPES, MOTIFS, MEDALS, medalSvg
*/
import { html, raw } from '../core/html.js';
/* metal del borde: [claro, medio, oscuro] */
const METALS = { b: ['#ffd3a1', '#c47a3c', '#6e3b17'], s: ['#ffffff', '#c3cad6', '#6b7484'], g: ['#fff3b0', '#f2b81c', '#8f5a00'], p: ['#f2fcff', '#9fd6f0', '#3f7397'], l: ['#ffe0ff', '#c46bff', '#4b168f'] };
/* familia: [color claro y oscuro del centro, forma] */
const FAMILIES = { e: ['#a78bfa', '#3b1a8f', 'medal'], v: ['#fb7185', '#7f1230', 'hex'], s: ['#fdba74', '#9a3412', 'shield'], p: ['#4ade80', '#065f46', 'star'], c: ['#38bdf8', '#0c4a6e', 'medal'], w: ['#fcd34d', '#92400e', 'oct'], n: ['#a3e635', '#365314', 'leaf'], m: ['#f9a8d4', '#9d174d', 'medal'], f: ['#5eead4', '#115e59', 'medal'], b: ['#a5b4fc', '#312e81', 'medal'], k: ['#93c5fd', '#1e3a8a', 'shield'] };
/* forma: [borde, centro] (trazados en una caja de 64 × 64) */
const ring = (r, cy) => 'M32 ' + (cy - r) + 'a' + r + ' ' + r + ' 0 1 1 0 ' + 2 * r + 'a' + r + ' ' + r + ' 0 1 1 0-' + 2 * r + 'z';
const poly = (n, r, rot, cy) => 'M' + Array.from({ length: n }, (_, i) => {
  const a = rot + i * 2 * Math.PI / n;
  return (32 + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2);
}).join('L') + 'z';
const burst = (n, r1, r2, cy) => 'M' + Array.from({ length: 2 * n }, (_, i) => {
  const a = -Math.PI / 2 + i * Math.PI / n;
  const r = i % 2 ? r2 : r1;
  return (32 + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2);
}).join('L') + 'z';
const SHAPES = {
  medal: [ring(23, 28), ring(18, 28), 28],
  hex: [poly(6, 29, -Math.PI / 2, 32), poly(6, 23, -Math.PI / 2, 32), 32],
  oct: [poly(8, 28, Math.PI / 8, 32), poly(8, 22.5, Math.PI / 8, 32), 32],
  star: [burst(12, 29, 24.5, 32), ring(20, 32), 32],
  shield: ['M32 3l24 8v17c0 15.5-10 26.5-24 33C18 54.5 8 43.5 8 28V11z', 'M32 9l18.5 6.2v12.9c0 12.3-7.7 21-18.5 26.6-10.8-5.6-18.5-14.3-18.5-26.6V15.2z', 30],
  leaf: ['M32 3c16 6 27 17 27 31 0 14-12 26-27 27C17 60 5 48 5 34 5 20 16 9 32 3z', 'M32 9.5c12.6 5 21.5 14 21.5 25 0 11.3-9.6 20.6-21.5 21.5-11.9-.9-21.5-10.2-21.5-21.5 0-11 8.9-20 21.5-25z', 33]
};
/* dibujos del centro (blancos; «var(--md-f)» es el color oscuro de la familia), hechos para un centro en (32, 28): se desplazan a cada forma */
const MOTIFS = {
  dumbbell: '<path d="M16 25.5h3.6v7H16zM20.4 22h4.2v14h-4.2zM39.4 22h4.2v14h-4.2zM44.4 25.5H48v7h-3.6zM24.6 27.4h14.8v3.2H24.6z"/>',
  kettle: '<path d="M26 21.6a6 6 0 0 1 12 0v2.6h-3.2v-2.6a2.8 2.8 0 0 0-5.6 0v2.6H26z"/><path d="M21.6 31.6a10.4 10.4 0 1 1 20.8 0c0 3.3-1.5 6.1-3.8 8H25.4c-2.3-1.9-3.8-4.7-3.8-8z"/><path d="M27.5 28.5a5 5 0 0 1 3.2-3.4" stroke="var(--md-f)" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
  flame: '<path d="M32 14c1.2 5.2 7.8 8.4 7.8 15.8A7.8 7.8 0 0 1 32 37.6a7.8 7.8 0 0 1-7.8-7.8c0-4.4 2.5-6.6 3.6-9.8.9 2.4 2.2 3.5 3.5 3.8-.9-3.7.1-7.3.7-9.8z"/><path d="M32 26.5c.6 2.6 3.4 3.9 3.4 7.2a3.4 3.4 0 0 1-6.8 0c0-1.9 1.1-2.9 1.6-4.3.4 1 1 1.6 1.5 1.7-.4-1.6.1-3.2.3-4.6z" fill="var(--md-f)"/>',
  record: '<path d="M32 13l8.6 9.6h-5.4v13h-6.4v-13h-5.4z"/><path d="M15.5 38.5h12M36.5 38.5h12" stroke="#fff" stroke-width="3.2" stroke-linecap="round" fill="none"/><path d="M29 36.2l-2.4 4.6M35 36.2l2.4 4.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
  shoe: '<path d="M14.5 33.5c0-2.3 1.4-4 3.6-4.4l6.9-1.2 3.7-6.6 3.9 1.3-1 4.1c2.5 2.3 6.5 3.4 10.5 3.4 3.1 0 5.4 1.9 5.4 4.4v1.4H14.5z"/><path d="M14.5 38h33.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M31.6 27.9l2.7 1.2M29.9 30.8l2.8 1.2" stroke="var(--md-f)" stroke-width="1.4" stroke-linecap="round"/>',
  pulse: '<path d="M15 29h7l3.2-7.5 5.6 15 4-10.5 2.4 3h11.8" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  watch: '<circle cx="32" cy="30" r="10.5" fill="none" stroke="#fff" stroke-width="3.2"/><path d="M29 15.5h6M32 15.5v4M41.5 20.5l1.8-1.8" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M32 30v-6.2M32 30l4.2 2.6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>',
  apple: '<path d="M32 21.5c-2.4-2.6-11.5-3-11.5 6.5 0 7.6 5.3 13.5 8.4 13.5 1.8 0 2.1-1 3.1-1s1.3 1 3.1 1c3.1 0 8.4-5.9 8.4-13.5 0-9.5-9.1-9.1-11.5-6.5z"/><path d="M32 21c.2-3.5 2.2-5.8 5.6-6.6-.2 3.6-2.3 5.8-5.6 6.6z"/>',
  ruler: '<g transform="rotate(-38 32 28)"><rect x="14.5" y="22" width="35" height="12.5" rx="2.4"/><path d="M20 22v5.6M25 22v3.6M30 22v5.6M35 22v3.6M40 22v5.6M45 22v3.6" stroke="var(--md-f)" stroke-width="1.7"/></g>',
  camera: '<path d="M18 22.5h6l2.6-4h10.8l2.6 4h6a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5H18a2.5 2.5 0 0 1-2.5-2.5V25a2.5 2.5 0 0 1 2.5-2.5z"/><circle cx="32" cy="31" r="6.6" fill="var(--md-f)"/><circle cx="32" cy="31" r="3.6"/>',
  frames: '<rect x="14.5" y="18.5" width="15" height="20" rx="2.5"/><rect x="34.5" y="18.5" width="15" height="20" rx="2.5"/><circle cx="22" cy="25.5" r="2.6" fill="var(--md-f)"/><path d="M17.5 36.5c.6-3.3 2.4-5 4.5-5s3.9 1.7 4.5 5z" fill="var(--md-f)"/><circle cx="42" cy="25.5" r="2.6" fill="var(--md-f)"/><path d="M36.5 36.5c.5-4 2.8-6 5.5-6s5 2 5.5 6z" fill="var(--md-f)"/>',
  scale: '<rect x="17" y="16.5" width="30" height="25" rx="6"/><path d="M24.5 26.5a7.5 7.5 0 0 1 15 0z" fill="var(--md-f)"/><path d="M32 26.3l2.6-4.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  check: '<path d="M22.5 29.5l6.5 6.5 12.5-13" stroke="#fff" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
};
/* logro → [familia, metal, dibujo, cifra] */
const MEDALS = { e1: ['e', 'b', 'dumbbell', '1'], e2: ['e', 's', 'dumbbell', '10'], e3: ['e', 'g', 'dumbbell', '50'], e4: ['e', 'p', 'dumbbell', '100'], e5: ['e', 'l', 'dumbbell', '250'], v1: ['v', 'b', 'kettle', '10 t'], v2: ['v', 's', 'kettle', '100 t'], v3: ['v', 'g', 'kettle', '500 t'], v4: ['v', 'p', 'kettle', '1000 t'], s1: ['s', 'b', 'flame', '4'], s2: ['s', 's', 'flame', '12'], s3: ['s', 'g', 'flame', '26'], p1: ['p', 'b', 'record', '1'], p2: ['p', 's', 'record', '10'], p3: ['p', 'g', 'record', '25'], c1: ['c', 'b', 'pulse', ''], c2: ['c', 's', 'shoe', '50 km'], c3: ['c', 'g', 'shoe', '200 km'], w1: ['w', 'b', 'watch', '1'], w2: ['w', 'g', 'watch', '10'], n1: ['n', 's', 'apple', '7'], n2: ['n', 'g', 'apple', '30'], m1: ['m', 's', 'ruler', ''], f1: ['f', 's', 'camera', ''], f2: ['f', 'g', 'frames', ''], b1: ['b', 's', 'scale', ''], k1: ['k', 'g', 'check', ''] };
let medalN = 0;
/** Medalla del logro `id` (SVG de `size` px). Sin conseguir, la misma en gris (css/99-profile, .md.off). */
export const medalSvg = (id, size, on) => {
  const m = MEDALS[id] || ['e', 's', 'dumbbell', ''];
  const fam = FAMILIES[m[0]];
  const met = METALS[m[1]];
  const sh = SHAPES[fam[2]];
  const u = 'md' + ++medalN;
  const lab = m[3];
  /* con cifra, el dibujo sube y se encoge un poco, y la cifra va en una cinta sobre la parte baja */
  const cy = sh[2];
  const dy = cy - 28 - (lab ? 5.5 : 0);
  const sc = lab ? .82 : 1;
  const by = cy + 9;
  const ribbon = fam[2] == 'medal' ? html`<path d="M21.5 44L15 61l6.4-2.6L25.5 63l4-15.5z" fill="${raw(fam[1])}"/><path d="M42.5 44L49 61l-6.4-2.6L38.5 63l-4-15.5z" fill="${raw(fam[1])}"/><path d="M21.5 44l-2.2 5.6 8.9 2.7 1.3-4.8zM42.5 44l2.2 5.6-8.9 2.7-1.3-4.8z" fill="#0003"/>` : '';
  return html`<svg class="md${on ? '' : ' off'}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${u}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${raw(met[0])}"/><stop offset=".55" stop-color="${raw(met[1])}"/><stop offset="1" stop-color="${raw(met[2])}"/></linearGradient><radialGradient id="${u}f" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${raw(fam[0])}"/><stop offset="1" stop-color="${raw(fam[1])}"/></radialGradient><linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>${ribbon}<path d="${raw(sh[0])}" fill="url(#${raw(u)}r)"/><path d="${raw(sh[0])}" fill="none" stroke="#0004" stroke-width="1"/><path d="${raw(sh[1])}" fill="url(#${raw(u)}f)"/><path d="${raw(sh[1])}" fill="none" stroke="${raw(met[2])}" stroke-opacity=".7" stroke-width="1.2"/><g fill="#fff" transform="translate(32 ${(28 + dy).toFixed(2)}) scale(${sc}) translate(-32 -28)" style="filter:drop-shadow(0 1px 1px #0006)">${raw(MOTIFS[m[2]].split('var(--md-f)').join(fam[1]))}</g>${lab ? html`<path d="M11 ${by}h42l-3.2 5.2L53 ${by + 10.4}H11l3.2-5.2z" fill="url(#${raw(u)}r)"/><path d="M14.5 ${by + 1.6}h35v7.2h-35z" fill="${raw(fam[1])}"/><text x="32" y="${by + 7.6}" text-anchor="middle" font-size="${lab.length > 4 ? 6.4 : 7.4}" font-weight="800" fill="#fff" style="font-family:inherit;letter-spacing:.04em">${lab}</text>` : ''}<path d="M17 20c4-8 13-12 22-10-9 0-16 4-20 13z" fill="url(#${raw(u)}s)" opacity=".8"/></svg>`;
};
