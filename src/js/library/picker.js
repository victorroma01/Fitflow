/* ═══ library/picker ═══
   Selector para añadir ejercicios al día.
   Define: addToDay, pickState, pickBody, pickSheet  · acciones/registros: 5
*/
import { $ } from '../core/util.js';
import { A, U } from '../core/registry.js';
import { EXERCISES } from '../data/library.js';
import { addState, S, saveState, setAddState, W } from '../core/state.js';
import { sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { categoryOf, exAll, exCellHtml, exCompare, exSearchText } from './model.js';
import { equipDropdown, equipIn, equipMatch, filterOpen, filterRow, groupChips, groupDropdown, groupMatch } from './filters.js';
import { saveSession } from '../workout/resume.js';
import { newPlanEx } from '../workout/targets.js';
import { prefillSets } from '../workout/progression.js';
import { html, raw } from '../core/html.js';
/** Añade un ejercicio al día seleccionado. Si hay un entreno en curso, añade también sus series (si no, la sesión no podría pintarlo). */
const addToDay = n => {
  const d = S.plan[S.sel];
  const ex = newPlanEx(n);
  d.ex.push(ex);
  if (d.n == 'Descanso')
    d.n = 'Entreno';
  if (W) {
    const sets = Array.from({ length: ex.s }, () => ({ r: 10, w: S.last[n] || '', ok: 0 }));
    prefillSets(ex, sets);
    W.x.push(sets);
    saveSession();
  }
  saveState();
};
A.lad = (i, b) => {
  addToDay(EXERCISES.concat(S.cx)[i].n);
  R();
  b.textContent = '✓ Añadido';
};
export let pickState = { g: '', gs: [], q: '', eq: [] };
export const pickBody = () => {
  const al = exAll().map((e, i) => ({ e, i }));
  const q = pickState.q.toLowerCase().trim();
  const bq = al.filter(o => !q || exSearchText(o.e).includes(q));
  const base = bq.filter(o => groupMatch(pickState.gs, o.e));
  const l = base.filter(o => equipMatch(pickState.eq, o.e)).sort((a, b) => exCompare(a.e, b.e));
  const lim = 120;
  return filterRow(groupDropdown('pkg', pickState.gs, bq.map(o => o.e)), equipDropdown('pk', pickState.eq, equipIn(base.map(o => o.e)), base.map(o => o.e), 1)) + l.slice(0, lim).map(o => html`<div class="it exr" data-a="px" data-i="${o.i}" style="cursor:pointer"><span class="exc">${exCellHtml(o.e)}</span><small class="mu">Añadir +</small></div>`).join('') + (l.length > lim ? html`<p class="mu" style="text-align:center">Mostrando ${lim} de ${l.length}. Usa la búsqueda o un grupo.</p>` : '') || '<p class="mu">Sin resultados.</p>';
};
function pickSheet() {
  return html`<h3>Añadir ejercicio</h3><input placeholder="Buscar por nombre, músculo o equipo" data-u="pks" value="${pickState.q}"><div id="pkr">${raw(pickBody())}</div><label>Crear ejercicio nuevo</label><div class="g2" style="grid-template-columns:1fr auto"><input id="xn" placeholder="Nombre"><button class="pr" data-a="nx">Crear</button></div>`;
}
A.pick = () => {
  pickState = { g: '', gs: [], q: '', eq: [] };
  filterOpen.pk = 0;
  filterOpen.pkg = 0;
  setAddState({ cat: 'Culturismo' });
  sheet(pickSheet());
};
A.pkg = (i, b) => {
  pickState.g = b.dataset.v;
  pickState.eq = [];
  $('#pkgc').innerHTML = groupChips(pickState.g, 'pkg');
  $('#pkr').innerHTML = pickBody();
};
A.pkeq = (i, b) => {
  pickState.eq = b.dataset.v;
  $('#pkr').innerHTML = pickBody();
};
U.pks = v => {
  pickState.q = v;
  $('#pkr').innerHTML = pickBody();
};
/* — manejadores de esta función (registros A / C / U) — */
A.pc = (i, b) => {
  addState.cat = b.dataset.v;
  sheet(pickSheet());
};
A.px = i => {
  addToDay(EXERCISES.concat(S.cx)[i].n);
  sheet();
  R();
};
A.nx = () => {
  const n = $('#xn').value.trim();
  if (!n)
    return;
  S.cx.push({ n, c: categoryOf(pickState.g), g: 'Propio', t: 'Personalizado', p: [], s: [], q: 'Otro' });
  addToDay(n);
  sheet();
  R();
};
