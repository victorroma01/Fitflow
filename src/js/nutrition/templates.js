/* ═══ nutrition/templates ═══
   Plantillas de comidas y hábitos.
   Define: nutriDayKey, dayType, templateCard, habitsCard  · acciones/registros: 5
*/
import { $, dayKey, roundInt, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { addState, nutriDayOffset, S, saveState, setAddState } from '../core/state.js';
import { segmented, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { itemMacros, sumMacros } from './home.js';
import { addSheet } from './add.js';
const nutriDayKey = () => dayKey(new Date(Date.now() + nutriDayOffset * 864e5));
const dayType = k => {
  if (S.dt && (S.dt[k] == 't' || S.dt[k] == 'r'))
    return S.dt[k];
  if (S.logs.some(l => l.d == k))
    return 't';
  if (k == dayKey(new Date())) {
    const d = S.plan[S.sel];
    return d && d.ex.length ? 't' : 'r';
  }
  const wd = new Date(k + 'T00:00:00').getDay();
  let n = 0;
  S.logs.forEach(l => {
    if (l.d < k && Date.now() - new Date(l.d + 'T00:00:00') < 29 * 864e5 && new Date(l.d + 'T00:00:00').getDay() == wd)
      n++;
  });
  return n >= 2 ? 't' : 'r';
};
export const templateCard = k => {
  const t = dayType(k);
  const tp = (S.tp || {})[t];
  const nm = t == 't' ? 'entreno' : 'descanso';
  const has = tp && Object.keys(tp).some(i => Array.isArray(tp[i]) && tp[i].length);
  let kc = '';
  if (has)
    kc = roundInt(sumMacros(Object.keys(tp).flatMap(i => Array.isArray(tp[i]) ? tp[i] : []).map(itemMacros))[0]);
  return '<details class="cd"><summary>Plantillas · día de ' + nm + '</summary><label>Tipo de este día</label>' + segmented('dty', t, [['t', 'Entreno'], ['r', 'Descanso']])
    + '<div class="g2" style="margin-top:10px"><button data-a="tpa">Aplicar plantilla</button><button data-a="tps">Guardar día como plantilla</button></div>'
    + '<small class="mu" style="display:block;margin-top:8px">' + (has ? 'Plantilla de ' + nm + ' guardada · ' + kc + ' kcal. Solo se rellenan las comidas vacías.' : 'Todavía no tienes plantilla de día de ' + nm + '. Rellena el día y pulsa Guardar.') + '</small></details>';
};
A.dty = (i, b) => {
  const k = nutriDayKey();
  S.dt = S.dt || {};
  S.dt[k] = b.dataset.v == 'r' ? 'r' : 't';
  saveState();
  R();
};
A.tps = () => {
  const k = nutriDayKey();
  const t = dayType(k);
  const m = S.meals[k] || {};
  const o = {};
  let n = 0;
  for (let i = 0; i < S.nu.n; i++) {
    const l = (m[i] || []).map(x => ({ ...x }));
    if (l.length) {
      o[i] = l;
      n++;
    }
  }
  if (!n) {
    toast('Añade alimentos al día antes de guardarlo');
    return;
  }
  S.tp = S.tp || {};
  S.tp[t] = o;
  saveState();
  R();
  toast('Plantilla de ' + (t == 't' ? 'entreno' : 'descanso') + ' guardada');
};
A.tpa = () => {
  const k = nutriDayKey();
  const t = dayType(k);
  const tp = (S.tp || {})[t];
  if (!tp) {
    toast('No hay plantilla guardada para este tipo de día');
    return;
  }
  const m = (S.meals[k] = S.meals[k] || {});
  let n = 0;
  for (let i = 0; i < S.nu.n; i++) {
    if (!(m[i] || []).length && Array.isArray(tp[i]) && tp[i].length) {
      m[i] = tp[i].map(x => ({ ...x }));
      n++;
    }
  }
  if (!n) {
    toast('Todas las comidas ya tienen alimentos');
    return;
  }
  saveState();
  R();
  toast('Plantilla aplicada a ' + n + (n == 1 ? ' comida' : ' comidas'));
};
export const habitsCard = m => {
  const l = Object.keys(S.fq || {}).map(n => [n, S.fq[n]]).filter(x => x[1] && x[1].c > 0 && Array.isArray(x[1].b)).sort((a, b) => b[1].c - a[1].c || (b[1].t || 0) - (a[1].t || 0)).slice(0, 8);
  const yk = dayKey(new Date(Date.now() + (nutriDayOffset - 1) * 864e5));
  const ys = (S.meals[yk] || {})[m] || [];
  if (!l.length && !ys.length)
    return '';
  return '<div class="mu" style="font-size:12px;margin:2px 0 6px">Habituales · un toque los añade</div><div class="hab">' + (ys.length ? '<button class="chip" data-a="hay">Repetir comida de ayer</button>' : '') + l.map(x => '<button class="chip" data-a="hab" data-n="' + X(x[0]) + '">' + X(x[0]) + ' · ' + x[1].g + ' g</button>').join('') + '</div>';
};
A.hab = (i, b) => {
  const n = b.dataset.n;
  const f = (S.fq || {})[n];
  if (!f || !addState)
    return;
  const k = nutriDayKey();
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push({ n, g: f.g, b: f.b });
  f.c++;
  f.t = Date.now();
  saveState();
  sheet();
  R();
  toast('Añadido: ' + n);
};
A.hay = () => {
  if (!addState)
    return;
  const yk = dayKey(new Date(Date.now() + (nutriDayOffset - 1) * 864e5));
  const ys = (S.meals[yk] || {})[addState.m] || [];
  if (!ys.length)
    return;
  const k = nutriDayKey();
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push(...ys.map(x => ({ ...x })));
  saveState();
  sheet();
  R();
  toast('Comida de ayer añadida');
};
/* — manejadores de esta función (registros A / C / U) — */
A.sd = (i, b) => {
  setAddState({ m: i });
  sheet('<h3>Guardar plato en la librería</h3><input id="pn" value="' + X(b.dataset.n) + '"><button class="pr" data-a="sdo" style="width:100%;margin-top:10px">Guardar</button>');
};
A.sdo = () => {
  const k = dayKey(new Date(Date.now() + nutriDayOffset * 864e5));
  const it = ((S.meals[k] || {})[addState.m] || []).map(x => ({ ...x }));
  const n = $('#pn').value.trim() || 'Plato';
  if (it.length) {
    S.lib = S.lib.filter(p => p.n != n).concat({ n, it });
    saveState();
  }
  sheet();
};
A.lx = i => {
  S.lib.splice(i, 1);
  saveState();
  sheet(addSheet());
};
