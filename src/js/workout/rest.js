/* ═══ workout/rest ═══
   Descansos por defecto y selector de descanso.
   Define: COMPOUND_RE, REST_OPTIONS, restByName, restOf, restSelect, HEAVY_TYPES, restDefault
*/
const COMPOUND_RE = /^(Press banca|Press militar|Sentadilla|Peso muerto|Dominadas|Remo con barra|Remo T|Remo Pendlay|Prensa|Hack|Hip thrust|Clean|Snatch|Thruster|Power|Overhead|Push press|Buenos)/;
const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300];
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
const restOf = e => e.r || restDefault(e.n);
const restSelect = e => {
  const r = restOf(e);
  return '<select data-c="rx" data-i="' + S.plan[S.sel].ex.indexOf(e) + '" style="width:auto;padding:5px 10px;font-size:13px">' + REST_OPTIONS.concat(REST_OPTIONS.includes(r) ? [] : [r]).sort((a, b) => a - b).map(v => '<option value="' + v + '"' + (v == r ? ' selected' : '') + '>Descanso ' + fmtMinSec(v) + ' por serie</option>').join('') + '</select>';
};
const HEAVY_TYPES = new Set(['Press plano', 'Press inclinado', 'Press declinado', 'Press vertical', 'Dominadas', 'Remo horizontal', 'Cadena posterior', 'Sentadilla', 'Prensa y hack', 'Bisagra de cadera', 'Empuje de cadera', 'Halterofilia']);
function restDefault(n) {
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
C.rx = (e, i) => {
  S.plan[S.sel].ex[i].r = +e.value;
  saveState();
  if (!W)
    R();
};
C.rs = e => {
  S.rest = +e.value || 120;
  saveState();
};
