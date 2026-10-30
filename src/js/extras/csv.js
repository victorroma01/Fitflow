/* ═══ extras/csv ═══
   Exportación a CSV.
   Define: csvCell, csvBody, mealName, CSV_EXPORTS, downloadAs  · acciones/registros: 2
*/
import { dayKey, round1 } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { MEAL_NAMES } from '../data/foods.js';
import { S } from '../core/state.js';
import { icon } from '../core/icons.js';
import { fullPage, pgHead } from '../core/ui.js';
import { itemMacros } from '../nutrition/home.js';
import { isStandalone } from '../system/files.js';
import { cardioLabel, cardioLogs, cardioPace } from './cardio.js';
import { measureList, MEASURES } from './measures.js';
import { html, raw } from '../core/html.js';
const csvCell = v => {
  if (v == null)
    return '';
  let s = typeof v == 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : String(v);
  if (typeof v != 'number' && /^[=+\-@\t\r]/.test(s))
    s = "'" + s;
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csvBody = rows => '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
const mealName = i => {
  const n = (S.nu && S.nu.n) || 3;
  return n <= 5 ? MEAL_NAMES[[0, 1, 2, 3, 4].filter(x => n == 3 ? [0, 2, 4].includes(x) : n == 4 ? [0, 2, 3, 4].includes(x) : n == 2 ? [0, 4].includes(x) : 1)[i]] || ('Comida ' + (i + 1)) : MEAL_NAMES[i] || ('Comida ' + (i + 1));
};
const CSV_EXPORTS = {
  ent: { t: 'Entrenos', s: 'Fecha, tipo, series, volumen, minutos y esfuerzo', f: 'entrenos', n: () => (S.logs || []).length, b: () => [['Fecha', 'Tipo', 'Entreno', 'Series', 'Volumen (kg)', 'Minutos', 'RPE medio', 'Detalle']].concat((S.logs || []).filter(l => l && typeof l.d == 'string').slice().sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0).map(l => [l.d, l.k == 'c' ? 'Cardio' : l.k == 'w' ? 'WOD' : 'Fuerza', l.n, +l.s || 0, +l.v || 0, +l.m || 0, +l.q || '', (l.x || '') + (l.nt ? ' · ' + l.nt : '')])) },
  ser: { t: 'Series por ejercicio', s: 'Cada serie: repeticiones, peso y esfuerzo', f: 'series', n: () => Object.keys(S.hist || {}).length, b: () => {
      const r = [['Fecha', 'Ejercicio', 'Serie', 'Repeticiones', 'Peso (kg)', 'RPE']];
      Object.keys(S.hist || {}).sort().forEach(n => {
        (Array.isArray(S.hist[n]) ? S.hist[n] : []).slice().reverse().forEach(x => {
          (x && Array.isArray(x.s) ? x.s : []).forEach((q, i) => r.push([x.d, n, i + 1, +q[0] || 0, +q[1] || 0, +q[2] || '']));
        });
      });
      return r;
    } },
  peso: { t: 'Peso corporal', s: 'Registro de peso con fecha', f: 'peso-corporal', n: () => (S.wl || []).length, b: () => [['Fecha', 'Peso (kg)']].concat((S.wl || []).filter(p => p && p.d).slice().sort((a, b) => a.d < b.d ? -1 : 1).map(p => [p.d, +p.w || 0])) },
  med: { t: 'Medidas', s: 'Cuello, hombros, pecho, brazo, cintura…', f: 'medidas', n: () => measureList().length, b: () => [['Fecha'].concat(MEASURES.map(x => x[1] + ' (cm)'))].concat(measureList().map(m => [m.d].concat(MEASURES.map(x => +m.v[x[0]] > 0 ? +m.v[x[0]] : '')))) },
  com: { t: 'Comidas', s: 'Alimentos, gramos y macros por día', f: 'comidas', n: () => Object.keys(S.meals || {}).length, b: () => {
      const r = [['Fecha', 'Comida', 'Alimento', 'Gramos', 'Kcal', 'Hidratos (g)', 'Proteínas (g)', 'Grasas (g)', 'Fibra (g)', 'Sal (g)']];
      Object.keys(S.meals || {}).sort().forEach(d => {
        const m = S.meals[d];
        if (!m || typeof m != 'object')
          return;
        Object.keys(m).sort((a, b) => a - b).forEach(i => {
          (Array.isArray(m[i]) ? m[i] : []).forEach(it => {
            if (!it || !Array.isArray(it.b))
              return;
            const v = itemMacros(it);
            r.push([d, mealName(+i), it.n, +it.g || 0, Math.round(v[0]), round1(v[1]), round1(v[2]), round1(v[3]), round1(v[4] || 0), Math.round((v[5] || 0) * 100) / 100]);
          });
        });
      });
      return r;
    } },
  car: { t: 'Cardio', s: 'Sesiones con distancia, tiempo y ritmo', f: 'cardio', n: () => cardioLogs().length, b: () => [['Fecha', 'Tipo', 'Distancia (km)', 'Tiempo (min)', 'Ritmo o velocidad']].concat(cardioLogs().map(l => [l.d, cardioLabel(l.c.t), +l.c.km || '', round1((+l.c.sec || 0) / 60), cardioPace(l.c.t, +l.c.km, +l.c.sec)])) }
};
const downloadAs = async (name, data, mime) => {
  let d = null;
  try {
    d = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
  }
  catch (e) {
    d = null;
  }
  if (d) {
    try {
      const r = await d.save({ filename: name, data });
      return r && r.status ? r.status : 'saved';
    }
    catch (e) {
      return e && e.code == 'declined' ? 'declined' : 'fail';
    }
  }
  if (isStandalone() && navigator.canShare && typeof File != 'undefined') {
    try {
      const f = new File([data], name, { type: mime });
      if (navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f] });
        return 'saved';
      }
    }
    catch (e) {
      if (e && e.name == 'AbortError')
        return 'declined';
    }
  }
  try {
    const b = new Blob([data], { type: mime });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    return 'saved';
  }
  catch (e) {
    return 'fail';
  }
};
A.f2ex = () => fullPage(html`${pgHead('Exportar datos')}<p class="mu" style="margin:-6px 2px 10px;font-size:14px">Archivos CSV para abrir en Excel, Numbers o Google Sheets. Los pesos van en kg. Separador «;» y decimales con coma, listos para Excel en español.</p>${Object.keys(CSV_EXPORTS).map(k => {
  const c = CSV_EXPORTS[k];
  const n = c.n();
  return html`<div class="cd" style="display:flex;gap:12px;align-items:center;justify-content:space-between"><span style="min-width:0"><b>${raw(c.t)}</b><br><small>${raw(c.s)}</small></span><button data-a="f2exd" data-v="${k}" style="flex:none;white-space:nowrap${n ? '' : ';opacity:.45'}"${n ? '' : ' disabled'}>${icon('dwn', 16)} ${n ? 'CSV' : 'Vacío'}</button></div>`;
})}<p class="mu" style="font-size:12px;margin:12px 2px">Para guardar todo y poder restaurarlo en StrataFit usa la copia de seguridad, no el CSV.</p><button data-a="zbk" style="width:100%">Copia de seguridad</button><div style="height:30px"></div>`);
A.f2exd = async (i, b) => {
  const c = CSV_EXPORTS[b.dataset.v];
  if (!c)
    return;
  let txt;
  try {
    txt = csvBody(c.b());
  }
  catch (e) {
    toast('No se pudo preparar el archivo');
    return;
  }
  const r = await downloadAs('stratafit-' + c.f + '-' + dayKey(new Date) + '.csv', txt, 'text/csv;charset=utf-8');
  toast(r == 'saved' || r == 'delivered' ? 'Archivo listo' : r == 'declined' ? 'No se guardó el archivo' : 'No se pudo guardar el archivo');
};
