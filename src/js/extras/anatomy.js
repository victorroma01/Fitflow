/* ═══ extras/anatomy ═══
   Mapa muscular dibujado en SVG.
   Define: MUSCLE_REGIONS, regionsFor, anatomySvg, GROUP_ANATOMY, groupAnatomy, regionsBox, exAnatomy, exAnatomyFull
*/
import { groupOf } from '../data/library.js';
import { AN_BB, AN_H, AN_PA, AN_R, AN_S } from '../data/anatomy.js';
import { groupIcon } from '../core/icons.js';
import { exAll } from '../library/model.js';
import { html, raw } from '../core/html.js';
document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="gB" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#a7adba"/><stop offset=".6" stop-color="#6b7080"/><stop offset="1" stop-color="#3b3f4b"/></linearGradient><linearGradient id="gR" x1=".2" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#ff5d70"/><stop offset=".55" stop-color="#d11f3a"/><stop offset="1" stop-color="#7d0d21"/></linearGradient><linearGradient id="gO" x1=".2" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#ffb26b"/><stop offset="1" stop-color="#b8501a"/></linearGradient><pattern id="fb" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(75)"><rect width="1" height="2.2" fill="#000" opacity=".3"/></pattern><filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>');
(function () {
  const pat = (id, r) => html`<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"${raw(r ? ' patternTransform="rotate(' + r + ')"' : '')}><line x1="0" y1="0" x2="0" y2="4" stroke="#000" stroke-opacity=".26" stroke-width=".55"/></pattern>`;
  const gr = (id, a, b, c) => html`<radialGradient id="${id}" cx=".38" cy=".3" r=".9"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
  let h = html`<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${raw(gr('gNe', '#5a617f', '#3b405a', '#252839'))}${raw(gr('gRd', '#ff7670', '#e0263a', '#7a0b1c'))}${raw(gr('gOr', '#ffd48f', '#f59a2c', '#a24f0a'))}${raw(pat('pa15', 80))}${raw(pat('pa35', 35))}${raw(pat('pa90', 0))}<path id="aS" d="${AN_S}"/><path id="aH" d="${AN_H}"/>`;
  ['F', 'B'].forEach(v => {
    const ks = Object.keys(AN_R[v]);
    ks.forEach(k => {
      h += html`<path id="p${v}${k}" d="${AN_R[v][k]}"/><g id="r${v}${k}"><use href="#p${v}${k}"/><use href="#p${v}${k}" fill="url(#pa${AN_PA[k] || 35})" stroke="none"/></g>`;
    });
    h += html`<g id="s${v}"><use href="#aS" fill="#2a2e42"/><use href="#aH" fill="#2a2e42"/>${ks.map(k => html`<use href="#p${v}${k}" fill="url(#gNe)" stroke="#0a0b10" stroke-width=".7" stroke-linejoin="round"/>`)}</g>`;
    h += html`<g id="b${v}"><use href="#aS" fill="#2a2e42"/><use href="#aH" fill="#2a2e42"/>${ks.map(k => html`<use href="#r${v}${k}" fill="url(#gNe)" stroke="#0a0b10" stroke-width=".7" stroke-linejoin="round"/>`)}${raw(v == 'F' ? '<path d="M64 68Q82 62 98 70M102 70Q118 62 136 68" fill="none" stroke="#9aa3c4" stroke-opacity=".45" stroke-width=".8" stroke-linecap="round"/>' : '')}</g>`;
  });
  document.body.insertAdjacentHTML('afterbegin', html`${raw(h)}</defs></svg>`);
})();
const MUSCLE_REGIONS = { ps: { F: ['PS'] }, pi: { F: ['PI'] }, pe: { F: ['PS', 'PI'] }, dA: { F: ['DA'] }, dL: { F: ['DL'] }, dP: { B: ['DP'] }, tr: { F: ['TR'], B: ['TR'] }, bi: { F: ['BI'] }, br: { F: ['BR'] }, bq: { F: ['BQ'], B: ['BQ'] }, an: { F: ['AN'], B: ['AN'] }, da: { F: ['DA2'], B: ['DA'] }, rm: { B: ['RM'] }, ro: { B: ['RO'] }, ts: { F: ['TS'], B: ['TS'] }, tm: { B: ['TM1', 'TM2'] }, er: { B: ['ER'] }, cu: { F: ['CU'] }, is: { B: ['IS'] }, gl: { B: ['GL'] }, gm: { B: ['GM'] }, ad: { F: ['AD'], B: ['AD'] }, ge: { F: ['GE'], B: ['GE'] }, so: { F: ['SO'], B: ['SO'] }, ta: { F: ['TA'] }, ab: { F: ['AB'] }, ob: { F: ['OB'] }, tv: { F: ['OB'] }, co: { F: ['AB', 'OB'], B: ['ER'] }, fc: { F: ['FC'] }, sa: { F: ['SA'] }, ag: { F: ['BQ', 'AN'], B: ['BQ', 'AN'] } };
const regionsFor = (codes, v) => {
  const o = [];
  (codes || []).forEach(c => {
    const ks = c == 'fu' ? Object.keys(AN_R[v]).filter(k => !['KN', 'NK'].includes(k)) : ((MUSCLE_REGIONS[c] || {})[v] || []);
    ks.forEach(k => {
      if (!o.includes(k))
        o.push(k);
    });
  });
  return o;
};
const anatomySvg = (v, P, S, box, w, h) => {
  const p = regionsFor(P, v);
  const s = regionsFor(S, v).filter(k => !p.includes(k));
  const sm = (w || 0) <= 80;
  const u = (k, f, st) => html`<use href="#${sm ? 'p' : 'r'}${v}${k}" fill="url(#${f})" stroke="${st}" stroke-width=".7" stroke-linejoin="round"/>`;
  return html`<svg viewBox="${box}" width="${w}" height="${h || w}" aria-hidden="true" focusable="false"><use href="#${sm ? 's' : 'b'}${v}"/>${raw(Object.keys(AN_R[v]).map(k => p.includes(k) ? u(k, 'gRd', '#2a0409') : s.includes(k) ? u(k, 'gOr', '#3a1a04') : '').join(''))}</svg>`;
};
const GROUP_ANATOMY = { Pecho: ['F', ['pe'], ['dA', 'tr', 'sa'], '24 42 152 152'], Espalda: ['B', ['da', 'tm', 'ro'], ['dP', 'tr', 'er', 'rm'], '24 38 152 152'], Hombros: ['F', ['dA', 'dL'], ['ts', 'tr'], '30 40 140 140'], 'Bíceps': ['F', ['bi'], ['br', 'bq', 'an', 'dA'], '14 70 172 172'], 'Tríceps': ['B', ['tr'], ['dP', 'an', 'bq'], '14 70 172 172'], Antebrazos: ['F', ['an', 'bq'], ['bi', 'br'], '14 110 172 172'], Abdomen: ['F', ['ab'], ['ob', 'tv', 'fc', 'sa'], '36 98 128 128'], 'Cuádriceps': ['F', ['cu'], ['fc', 'ad', 'ta'], '36 196 128 128'], 'Isquios y glúteos': ['B', ['is', 'gl'], ['gm', 'ad', 'ge', 'er'], '36 160 128 128'], Gemelos: ['B', ['ge', 'so'], ['is', 'ta'], '36 270 128 128'] };
export function groupAnatomy(g, s) {
  const a = GROUP_ANATOMY[g];
  return a ? html`<span class="anb" style="width:${s}px;height:${s}px">${anatomySvg(a[0], a[1], a[2], a[3], s)}</span>` : '';
}
const regionsBox = (v, regs) => {
  let x0 = 999;
  let y0 = 999;
  let x1 = -1;
  let y1 = -1;
  regs.forEach(k => {
    const b = (AN_BB[v] || {})[k];
    if (b) {
      x0 = Math.min(x0, b[0]);
      y0 = Math.min(y0, b[1]);
      x1 = Math.max(x1, b[2]);
      y1 = Math.max(y1, b[3]);
    }
  });
  if (x1 < 0)
    return '0 0 200 410';
  const sz = Math.max(x1 - x0, y1 - y0) + 22;
  const z = Math.max(sz, 96);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let bx = Math.max(0, Math.min(200 - z, cx - z / 2));
  let by = Math.max(0, Math.min(410 - z, cy - z / 2));
  if (z >= 200) {
    return '0 0 200 410';
  }
  return bx.toFixed(0) + ' ' + by.toFixed(0) + ' ' + z.toFixed(0) + ' ' + z.toFixed(0);
};
export const exAnatomy = (n, s) => {
  const e = exAll().find(x => x.n == n);
  const g = e ? groupOf(e) : '';
  const a = GROUP_ANATOMY[g];
  const has = e && e.p && e.p.length;
  const P = has ? e.p : (a ? a[1] : []);
  const S = has ? (e.s || []) : (a ? a[2] : []);
  if (!a && !has)
    return groupIcon(g || 'Propio', s);
  const f = regionsFor(P, 'F').length;
  const b = regionsFor(P, 'B').length;
  const v = f == b ? (a ? a[0] : 'F') : f > b ? 'F' : 'B';
  if (!regionsFor(P.concat(S), v).length)
    return groupIcon(g || 'Propio', s);
  const box = regionsBox(v, regionsFor(P, v).concat(regionsFor(S, v)));
  if (box == '0 0 200 410')
    return anatomySvg(v, P, S, box, Math.round(s * 200 / 410), s);
  return anatomySvg(v, P, S, box, s);
};
export const exAnatomyFull = e => {
  const has = e && e.p && e.p.length;
  const g = e ? groupOf(e) : '';
  const a = GROUP_ANATOMY[g];
  const P = has ? e.p : (a ? a[1] : []);
  const S = has ? (e.s || []) : (a ? a[2] : []);
  if (!P.length && !S.length)
    return '';
  return html`<div class="anf"><div>${anatomySvg('F', P, S, '0 0 200 410', 132, 271)}<small>Frontal</small></div><div>${anatomySvg('B', P, S, '0 0 200 410', 132, 271)}<small>Posterior</small></div><div class="anl"><span><i style="background:linear-gradient(135deg,#ff7670,#b0152b)"></i>Principal</span><span><i style="background:linear-gradient(135deg,#ffd48f,#e08419)"></i>Secundario</span></div></div>`;
};
