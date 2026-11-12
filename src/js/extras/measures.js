/* ═══ extras/measures ═══
   Medidas corporales (cintura, brazo, pecho…), con su gráfica y su historial. Las fotos de progreso se quitaron en la
   V1.0.0 (sin datos personales: F-35).
   Define: MEASURES, measureState, measureList, measureDelta, measureChart, measuresTab, measuresPage  · acciones/registros: 7
*/
import { dayKey, fmtDateShort, round1 } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { S, saveState } from '../core/state.js';
import { confirmDialog, fullPage, pgHead, sheet } from '../core/ui.js';
import { checkAchievements } from './achievements.js';
import { html, raw } from '../core/html.js';
export const MEASURES = [['cu', 'Cuello'], ['ho', 'Hombros'], ['pe', 'Pecho'], ['br', 'Brazo'], ['ci', 'Cintura'], ['ca', 'Cadera'], ['mu', 'Muslo'], ['ge', 'Gemelo']];
let measureState = { k: 'ci', di: -1 };
export function measureList() {
  return (Array.isArray(S.measures) ? S.measures : []).filter(m => m && typeof m.d == 'string' && m.v && typeof m.v == 'object');
}
function measureDelta(k) {
  const L = measureList().filter(m => +m.v[k] > 0);
  if (!L.length)
    return null;
  const a = L[L.length - 1];
  const b = L[L.length - 2];
  return { v: +a.v[k], d: a.d, p: b ? +b.v[k] : null, pd: b ? b.d : null };
}
function measureChart(k) {
  const nm = (MEASURES.find(x => x[0] == k) || [0, ''])[1];
  const pts = measureList().filter(m => +m.v[k] > 0).map(m => ({ d: m.d, y: +m.v[k] }));
  if (pts.length < 2)
    return html`<p class="mu fs-13 m-8-2">Con dos mediciones de «${raw(nm)}» verás aquí su evolución.</p>`;
  const w = 300;
  const h = 120;
  const px = 14;
  const py = 18;
  const ys = pts.map(p => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const sp = Math.max(1, hi - lo);
  const xx = i => px + i * (w - 2 * px) / (pts.length - 1);
  const yy = y => h - py - (y - lo) / sp * (h - 2 * py);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + xx(i).toFixed(1) + ' ' + yy(p.y).toFixed(1)).join(' ');
  return html`<svg viewBox="0 0 ${w} ${h}" class="f2ch" role="img" aria-label="Evolución de ${nm}"><path d="${d}" fill="none" stroke="var(--a1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p, i) => html`<circle cx="${xx(i).toFixed(1)}" cy="${yy(p.y).toFixed(1)}" r="${i == pts.length - 1 ? 4.5 : 3}" fill="${i == pts.length - 1 ? 'var(--a1)' : 'var(--bg)'}" stroke="var(--a1)" stroke-width="2"/>`)}<text x="${px}" y="${h - 2}" font-size="10" fill="var(--mu)">${raw(fmtDateShort(pts[0].d, { day: 'numeric', month: 'short' }))}</text><text x="${w - px}" y="${h - 2}" font-size="10" text-anchor="end" fill="var(--mu)">${raw(fmtDateShort(pts[pts.length - 1].d, { day: 'numeric', month: 'short' }))}</text><text x="${w - px}" y="11" font-size="11" font-weight="700" text-anchor="end" fill="var(--tx)">${round1(pts[pts.length - 1].y)} cm</text></svg>`;
}
function measuresTab() {
  const L = measureList();
  const has = MEASURES.filter(x => measureDelta(x[0]));
  let h = '<button class="pr w-full mt-12" data-a="measureNew">Nueva medición</button>';
  if (!L.length)
    return html`${raw(h)}<p class="mu m-14-2 fs-14">Mide con una cinta métrica, siempre en el mismo punto y a la misma hora. Cada pocas semanas basta para ver cómo cambia tu cuerpo, aunque el peso no se mueva.</p>`;
  if (!has.some(x => x[0] == measureState.k))
    measureState.k = has[0][0];
  h += html`<div class="mt-10">${has.map(x => html`<button class="chip ${measureState.k == x[0] ? 'on' : ''}" data-a="measureChoose" data-v="${x[0]}">${raw(x[1])}</button>`)}</div><div class="cd mt-8">${measureChart(measureState.k)}</div>`;
  h += html`<div class="cd"><div class="row"><b>Última medición</b><small>${raw(fmtDateShort(L[L.length - 1].d, { day: 'numeric', month: 'long' }))}</small></div>${has.map(x => {
    const t = measureDelta(x[0]);
    const df = t.p != null ? Math.round((t.v - t.p) * 10) / 10 : null;
    return html`<div class="it cols-1fr-auto-auto gap-12"><span>${raw(x[1])}</span><b>${round1(t.v)} cm</b><small class="minw-52 ta-r">${raw(df == null ? '' : df == 0 ? 'igual' : (df > 0 ? '+' : '−') + Math.abs(df))}</small></div>`;
  })}</div>`;
  h += html`<details class="cd"><summary>Historial (${L.length})</summary>${L.slice().reverse().map((m, i) => html`<div class="it exr cur-pointer" data-a="measureDeleteAsk" data-i="${L.length - 1 - i}" role="button" tabindex="0"><span><b>${raw(fmtDateShort(m.d, { day: 'numeric', month: 'long', year: 'numeric' }))}</b><br><small>${raw(MEASURES.filter(x => +m.v[x[0]] > 0).map(x => x[1] + ' ' + round1(+m.v[x[0]])).join(' · '))}</small></span></div>`)}<p class="mu fs-12 m-8-0-0">Toca una medición para borrarla.</p></details>`;
  return h;
}
function measuresPage() {
  return html`<div id="f2ms">${pgHead('Medidas')}${raw(measuresTab())}<div class="h-30"></div></div>`;
}
A.openMeasures = () => {
  fullPage(measuresPage());
};
A.measureChoose = (i, b) => {
  measureState.k = b.dataset.v;
  sheet(measuresPage());
};
A.measuresBack = () => {
  sheet(measuresPage());
};
A.measureNew = () => {
  const td = dayKey(new Date);
  const last = {};
  MEASURES.forEach(x => {
    const t = measureDelta(x[0]);
    if (t)
      last[x[0]] = t.v;
  });
  sheet(html`<div id="f2ms">${pgHead('Nueva medición', 'measuresBack')}<label for="f2md">Fecha</label><input id="f2md" type="date" value="${td}" max="${td}"><p class="mu fs-13 m-10-2-0">Rellena solo lo que midas. Valores en centímetros.</p><div class="g2">${MEASURES.map(x => html`<div><label for="f2m_${x[0]}">${raw(x[1])} (cm)</label><input id="f2m_${x[0]}" type="number" inputmode="decimal" step="0.1" min="10" max="300" placeholder="${last[x[0]] ? round1(last[x[0]]) : ''}"></div>`)}</div><div class="h-90"></div><div class="sb"><button class="pr w-full p-14" data-a="measureSave">Guardar medición</button></div></div>`);
};
A.measureSave = () => {
  const g = id => document.getElementById(id);
  const d0 = (g('f2md') || {}).value;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(d0 || '') && d0 <= dayKey(new Date) ? d0 : dayKey(new Date);
  const v = {};
  MEASURES.forEach(x => {
    const e = g('f2m_' + x[0]);
    const n = e ? parseFloat(String(e.value).replace(',', '.')) : NaN;
    if (n >= 10 && n <= 300)
      v[x[0]] = Math.round(n * 10) / 10;
  });
  if (!Object.keys(v).length) {
    toast('Indica al menos una medida');
    return;
  }
  const L = measureList().filter(m => m.d != d);
  const old = measureList().find(m => m.d == d);
  S.measures = L.concat({ d, v: Object.assign({}, old ? old.v : {}, v) }).sort((a, b) => a.d < b.d ? -1 : 1);
  saveState();
  checkAchievements();
  toast('Medición guardada');
  sheet(measuresPage());
};
A.measureDeleteAsk = i => {
  const m = measureList()[i];
  if (!m)
    return;
  measureState.di = i;
  confirmDialog('¿Borrar esta medición?', fmtDateShort(m.d, { day: 'numeric', month: 'long', year: 'numeric' }), 'measureDelete', 'Borrar');
};
A.measureDelete = () => {
  const m = measureList()[measureState.di];
  if (m) {
    S.measures = measureList().filter(x => x !== m);
    saveState();
  }
  measureState.di = -1;
  sheet(measuresPage());
};
