/* ═══ workout/rest ═══
   Descansos por defecto y selector de descanso.
   Define: COMPOUND_RE, REST_OPTIONS, restByName, restOf, ROUND_REST, blockEnd, restAt, restSelect, HEAVY_TYPES, restDefault  · acciones/registros: 1
*/
import { fmtMinSec } from '../core/util.js';
import { C } from '../core/registry.js';
import { EXERCISES, groupOf } from '../data/library.js';
import { S, saveState } from '../core/state.js';
import { R } from '../core/render.js';
import { exAll } from '../library/model.js';
import { unitFromName } from './targets.js';
import { html, raw } from '../core/html.js';
export const COMPOUND_RE = /^(Press banca|Press militar|Sentadilla|Peso muerto|Dominadas|Remo con barra|Remo T|Remo Pendlay|Prensa|Hack|Hip thrust|Clean|Snatch|Thruster|Power|Overhead|Push press|Buenos)/;
export const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300];
function restByName(n) {
  const e = EXERCISES.concat(S.cx).find(x => x.n == n);
  const g = e ? groupOf(e) : '';
  if (COMPOUND_RE.test(n))
    return 150;
  if (g == 'Cardio' || g == 'CrossFit')
    return 60;
  if (g == 'Hyrox')
    return 90;
  if (g == 'Funcional')
    return 45;
  if (['Bíceps', 'Tríceps', 'Antebrazos', 'Gemelos', 'Abdomen'].includes(g) || /Elevaciones|Pájaros|Face pull/.test(n))
    return 60;
  return g ? 90 : S.rest;
}
export const restOf = e => e.r || restDefault(e.n);
/* superseries y triseries (F-12): 10 s fijos entre sus ejercicios y, al acabar cada ronda, el descanso del último
   ejercicio del bloque: el que diga el programa o se elija o, si no, 2:30 */
const ROUND_REST = 150;
/** ¿El ejercicio `i` del día `d` cierra un bloque (superserie o triserie)? */
export const blockEnd = (d, i) => {
  const e = d.ex[i];
  const p = d.ex[i - 1];
  const n = d.ex[i + 1];
  return e.b != null && !!p && p.b == e.b && !(n && n.b == e.b);
};
/** Descanso tras una serie del ejercicio `i` del día `d`: 10 s dentro de un bloque, el de la ronda al cerrarlo y, si no, el suyo. */
export const restAt = (d, i) => {
  const e = d.ex[i];
  const n = d.ex[i + 1];
  if (e.b != null && n && n.b == e.b)
    return 10;
  return blockEnd(d, i) ? e.r || ROUND_REST : restOf(e);
};
/** Selector del descanso de un ejercicio del día actual; `short`, sin «Descanso … por serie» en cada opción (F-09). */
export const restSelect = (e, short) => {
  const d = S.plan[S.sel];
  const i = d.ex.indexOf(e);
  const r = restAt(d, i);
  const l = blockEnd(d, i) ? 'Descanso de la ronda, ' : 'Descanso, ';
  return html`<select data-c="setRest" data-i="${i}" aria-label="${l + e.n}"${raw(short ? '' : ' style="width:auto;padding:5px 10px;font-size:13px"')}>${REST_OPTIONS.concat(REST_OPTIONS.includes(r) ? [] : [r]).sort((a, b) => a - b).map(v => html`<option value="${v}"${v == r ? ' selected' : ''}>${raw(short ? fmtMinSec(v) : 'Descanso ' + fmtMinSec(v) + ' por serie')}</option>`)}</select>`;
};
const HEAVY_TYPES = new Set(['Press plano', 'Press inclinado', 'Press declinado', 'Press vertical', 'Dominadas', 'Remo horizontal', 'Cadena posterior', 'Sentadilla', 'Prensa y hack', 'Bisagra de cadera', 'Empuje de cadera', 'Halterofilia']);
export function restDefault(n) {
  const e = exAll().find(x => x.n == n);
  const u = unitFromName(n);
  if (u)
    return u.u == 'min' ? 60 : u.u == 's' ? 45 : u.u == 'cal' ? 90 : u.rg[0] >= 400 ? 120 : 90;
  if (/Burpee|Wall ball|Thruster|Double under|Toes to bar|Box jump|Swing|Snatch|Clean/i.test(n))
    return 60;
  const bar = e && ['Barra', 'Smith', 'Barra Z'].includes(e.q);
  const hv = e && HEAVY_TYPES.has(e.t);
  if (hv && bar)
    return /Peso muerto|Sentadilla/i.test(n) && !/rumano|búlgara|goblet|frontal/i.test(n) ? 180 : 150;
  if (hv)
    return /Máquina|Polea/.test(e.q) ? 90 : 120;
  if (e && groupOf(e) == 'Abdomen')
    return 45;
  return restByName(n);
}
/* — manejadores de esta función (registros A / C / U) — */
/* el desplegable corto no enseña el valor (F-09): se repinta para que el objetivo de arriba y la columna Desc. lo digan */
C.setRest = (e, i) => {
  S.plan[S.sel].ex[i].r = +e.value;
  saveState();
  R();
};
