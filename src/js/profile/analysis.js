/* ═══ profile/analysis ═══
   Perfil → «Ver análisis mensual» (F-26, T-15), a partir del primer mes de uso: una pantalla propia con un mes (se cambia con
   ‹ ›) y su descarga en PDF (system/pdf, que se carga al pedirlo).
   - Entrenamientos: cuántos, tiempo, volumen, series y esfuerzo; por semanas frente a lo que marca el plan; récords (mejor 1RM
     estimado que antes de ese mes) y ejercicios con más volumen; cardio y WOD. Todo comparado con el mes anterior.
   - Peso corporal: gráfica del mes, si sube, baja o se mantiene y si va con el objetivo (Definir, Volumen…).
   - Alimentación: días registrados, media de kcal y de proteína frente al objetivo y días dentro de él (±10 %): cumplido, a
     medias o no cumplido; gráfica de las kcal de cada día.
   - Otros datos: medidas que cambian, logros conseguidos y agua. Y una conclusión en frases cortas.
   Se carga al usarlo (core/lazy).
   Define: MONTHS, KIND_OK, anaYm, monthName, cap, fmtN, monthRange, shiftYm, monthList, logsIn, trainStats, weekRows, bestE1, exerciseStats, weightStats, dayKcal, nutritionStats, otherStats, monthStats, conclusions, svgBars, svgLine, svgKcal, kpi, delta, analysisPage, analysisPdf  · acciones/registros: 3
*/
import { APPV, dayKey, est1RM, fmtDateShort } from '../core/util.js';
import { toast } from '../core/toast.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { fullPage, pgHead, sheet } from '../core/ui.js';
import { acctName } from '../cloud/session.js';
import { itemMacros, sumMacros } from '../nutrition/home.js';
import { GOAL_LABELS } from '../nutrition/diet.js';
import { sessionsPerWeek } from '../workout/week.js';
import { MEASURES } from '../extras/measures.js';
import { ACHIEVEMENTS } from '../extras/achievements.js';
import { accentNow } from './appearance.js';
import { analysisFrom } from './home.js';
import { downloadFile } from '../system/files.js';
import { loadPdf } from '../core/lazy.js';
import { html, raw } from '../core/html.js';
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/* hacia dónde debería ir el peso con cada objetivo (GOAL_LABELS: Definir, Mantenimiento, Volumen, Recomposición) */
const KIND_OK = ['baja', 'estable', 'sube', 'estable'];
/* mes que se ve (AAAA-MM) */
let anaYm = '';
const monthName = ym => MONTHS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
/** Número en español: coma decimal y `d` decimales como mucho. */
const fmtN = (v, d = 0) => (+v || 0).toLocaleString('es', { maximumFractionDigits: d, minimumFractionDigits: 0 });
/** [primer día, último día (hoy si es el mes en curso), si está en curso, días que lleva]. */
const monthRange = ym => {
  const [y, m] = ym.split('-').map(Number);
  const a = ym + '-01';
  const end = dayKey(new Date(y, m, 0));
  const today = dayKey(new Date());
  const b = end > today ? today : end;
  return [a, b, end > today, +b.slice(8, 10)];
};
const shiftYm = (ym, k) => {
  const [y, m] = ym.split('-').map(Number);
  return dayKey(new Date(y, m - 1 + k, 1)).slice(0, 7);
};
/** Meses con análisis: desde el del primer día con datos hasta el actual. */
const monthList = () => {
  const f = analysisFrom()[0];
  const now = dayKey(new Date()).slice(0, 7);
  const out = [];
  for (let ym = f ? f.slice(0, 7) : now; ym <= now && out.length < 240; ym = shiftYm(ym, 1))
    out.push(ym);
  return out;
};
const logsIn = (a, b) => (S.logs || []).filter(l => l && typeof l.d == 'string' && l.d >= a && l.d <= b);
const trainStats = (a, b) => {
  const L = logsIn(a, b);
  const str = L.filter(l => !l.k);
  const sum = (arr, k) => arr.reduce((t, l) => t + (+l[k] || 0), 0);
  const q = L.filter(l => +l.q > 0);
  return { n: L.length, ns: str.length, nc: L.filter(l => l.k == 'c').length, nw: L.filter(l => l.k == 'w').length, days: new Set(L.map(l => l.d)).size, min: sum(L, 'm'), vol: sum(str, 'v'), sets: sum(str, 's'), rpe: q.length ? sum(q, 'q') / q.length : 0, km: L.reduce((t, l) => t + (l.k == 'c' && l.c ? +l.c.km || 0 : 0), 0) };
};
/** Semanas (de lunes a domingo) que tocan el mes: [etiqueta, entrenos, días del mes que tiene]. */
const weekRows = (a, b) => {
  const out = [];
  const t = new Date(a + 'T12:00:00');
  t.setDate(t.getDate() - (t.getDay() + 6) % 7);
  while (dayKey(t) <= b && out.length < 6) {
    const mon = dayKey(t);
    const e = new Date(t);
    e.setDate(e.getDate() + 6);
    const lo = mon < a ? a : mon;
    const hi = dayKey(e) > b ? b : dayKey(e);
    out.push([+lo.slice(8, 10) + '-' + +hi.slice(8, 10), logsIn(lo, hi).length, +hi.slice(8, 10) - +lo.slice(8, 10) + 1]);
    t.setDate(t.getDate() + 7);
  }
  return out;
};
/** Mejor 1RM estimado de unas entradas del historial (sin las filas extra: drop set y rest-pause). */
const bestE1 = E => {
  let m = 0;
  for (const e of E)
    for (const s of Array.isArray(e.s) ? e.s : [])
      if (Array.isArray(s) && !s[3] && +s[1] > 0 && +s[0] >= 1 && +s[0] <= 30)
        m = Math.max(m, est1RM(+s[1], +s[0]));
  return m;
};
/** Ejercicios del mes: récords (mejor 1RM estimado que antes del mes) y los de más volumen. */
const exerciseStats = (a, b) => {
  const rec = [];
  const vol = [];
  for (const [n, h] of Object.entries(S.hist || {})) {
    if (!Array.isArray(h))
      continue;
    const inM = h.filter(e => e && typeof e.d == 'string' && e.d >= a && e.d <= b);
    if (!inM.length)
      continue;
    const m = bestE1(inM);
    const p = bestE1(h.filter(e => e && typeof e.d == 'string' && e.d < a));
    if (m > 0 && p > 0 && m > p * 1.005)
      rec.push({ n, p, m, g: (m - p) / p });
    const v = inM.reduce((t, e) => t + (Array.isArray(e.s) ? e.s : []).reduce((u, s) => u + (Array.isArray(s) ? (+s[0] || 0) * (+s[1] || 0) : 0), 0), 0);
    if (v > 0)
      vol.push({ n, v });
  }
  return { rec: rec.sort((x, y) => y.g - x.g), vol: vol.sort((x, y) => y.v - x.v).slice(0, 3) };
};
const weightStats = (a, b) => {
  const W = (S.wl || []).filter(p => p && typeof p.d == 'string' && +p.w > 0).sort((x, y) => x.d < y.d ? -1 : 1);
  const inM = W.filter(p => p.d >= a && p.d <= b);
  const before = W.filter(p => p.d < a).pop() || null;
  if (!inM.length)
    return { pts: [], before, d: null, tr: '' };
  const ref = before || inM[0];
  const d = inM[inM.length - 1].w - ref.w;
  const g = +S.bio.goal;
  const goal = g >= 0 && g < GOAL_LABELS.length ? g : -1;
  const tr = Math.abs(d) < .3 ? 'estable' : d > 0 ? 'sube' : 'baja';
  return { pts: inM, before, d, tr, goal, ok: goal >= 0 ? KIND_OK[goal] == tr : null, last: inM[inM.length - 1].w };
};
/** kcal y proteína del día `k`. */
const dayKcal = k => {
  const v = sumMacros((S.meals[k] && typeof S.meals[k] == 'object' ? Object.values(S.meals[k]).flat() : []).map(itemMacros));
  return [v[0], v[2]];
};
const nutritionStats = (a, b) => {
  const tk = +S.nu.k || 0;
  const tp = tk * (+S.nu.p || 0) / 400;
  const days = [];
  let ok = 0;
  let sk = 0;
  let sp = 0;
  let logged = 0;
  let wat = 0;
  let wd = 0;
  for (let t = new Date(a + 'T12:00:00'); dayKey(t) <= b; t.setDate(t.getDate() + 1)) {
    const k = dayKey(t);
    const [kc, pr] = dayKcal(k);
    const on = kc > 50;
    if (on) {
      logged++;
      sk += kc;
      sp += pr;
      if (tk && Math.abs(kc - tk) <= tk * .1)
        ok++;
    }
    days.push(on ? kc : 0);
    const w = S.wt && +S.wt[k];
    if (w > 0) {
      wat += w;
      wd++;
    }
  }
  const ak = logged ? sk / logged : 0;
  const ap = logged ? sp / logged : 0;
  const adh = logged ? ok / logged : 0;
  const verdict = logged < 3 ? '' : adh >= .7 ? 'Cumplido' : adh >= .4 ? 'A medias' : 'No cumplido';
  return { tk, tp, days, logged, ok, ak, ap, adh, verdict, side: !logged || !tk ? '' : ak > tk * 1.1 ? 'te pasas' : ak < tk * .9 ? 'te quedas corto' : '', water: wd ? wat / wd : 0 };
};
const otherStats = (a, b) => {
  const L = (Array.isArray(S.ms) ? S.ms : []).filter(m => m && typeof m.d == 'string' && m.v && typeof m.v == 'object').sort((x, y) => x.d < y.d ? -1 : 1);
  const ms = [];
  for (const [k, name] of MEASURES) {
    const inM = L.filter(m => m.d >= a && m.d <= b && +m.v[k] > 0);
    if (!inM.length)
      continue;
    const before = L.filter(m => m.d < a && +m.v[k] > 0).pop() || inM[0];
    const d = +inM[inM.length - 1].v[k] - +before.v[k];
    if (Math.abs(d) >= .2)
      ms.push([name, d]);
  }
  const ach = Object.entries(S.ach || {}).filter(([, d]) => typeof d == 'string' && d >= a && d <= b).map(([id]) => (ACHIEVEMENTS.find(x => x[0] == id) || [])[1]).filter(Boolean);
  return { ms, ach };
};
/** Todo lo del mes `ym`, con el anterior para comparar. */
const monthStats = ym => {
  const [a, b, open, nd] = monthRange(ym);
  const [pa, pb] = monthRange(shiftYm(ym, -1));
  const pw = sessionsPerWeek(S.plan || []);
  const plan = (pw[0] + pw[1]) / 2 * nd / 7;
  const t = trainStats(a, b);
  return { ym, a, b, open, nd, t, pt: trainStats(pa, pb), plan, weeks: weekRows(a, b), pwk: (pw[0] + pw[1]) / 2, ex: exerciseStats(a, b), w: weightStats(a, b), nu: nutritionStats(a, b), o: otherStats(a, b) };
};
/** La conclusión del mes, en frases cortas (para la pantalla y el PDF). */
const conclusions = m => {
  const out = [];
  const t = m.t;
  const prevName = MONTHS[+shiftYm(m.ym, -1).slice(5, 7) - 1];
  const done = t.ns + t.nw;
  if (!t.n)
    out.push('Este mes no hay entrenos registrados: marca cada sesión al terminarla para seguir tu evolución.');
  else {
    const dif = t.n - m.pt.n;
    const pct = m.plan > 0 ? Math.round(done / m.plan * 100) : 0;
    out.push('Has entrenado ' + t.n + (t.n == 1 ? ' vez' : ' veces') + (m.pt.n ? ' (' + (dif == 0 ? 'igual que' : Math.abs(dif) + (dif > 0 ? ' más que' : ' menos que')) + ' en ' + prevName + ')' : '') + (pct ? ', el ' + pct + ' % de lo que marca tu plan' : '') + '.' + (pct && pct < 60 && !m.open ? ' Intenta no saltarte sesiones: la constancia es lo que más cuenta.' : ''));
  }
  if (m.ex.rec.length)
    out.push('Has mejorado tu marca en ' + m.ex.rec.length + (m.ex.rec.length == 1 ? ' ejercicio' : ' ejercicios') + '; el que más, ' + m.ex.rec[0].n + ' (+' + fmtN(m.ex.rec[0].g * 100) + ' %).');
  const w = m.w;
  if (w.d != null)
    out.push(w.tr == 'estable' ? 'Tu peso se mantiene estable' + (w.goal >= 0 ? (w.ok ? ', como buscas con tu objetivo (' + GOAL_LABELS[w.goal] + ').' : '; con tu objetivo (' + GOAL_LABELS[w.goal] + ') debería ' + (KIND_OK[w.goal] == 'baja' ? 'bajar' : 'subir') + ' poco a poco.') : '.') : 'Tu peso ' + w.tr + ' ' + fmtN(Math.abs(w.d), 1) + ' kg' + (w.goal >= 0 ? (w.ok ? ', como buscas con tu objetivo (' + GOAL_LABELS[w.goal] + ').' : '; con tu objetivo (' + GOAL_LABELS[w.goal] + ') ' + (KIND_OK[w.goal] == 'estable' ? 'debería mantenerse' : 'debería ' + (KIND_OK[w.goal] == 'baja' ? 'bajar' : 'subir')) + ': revisa las calorías.') : '.'));
  else
    out.push('No has registrado tu peso este mes: pésate cada 2-4 semanas para ver cómo cambia.');
  const n = m.nu;
  if (n.logged >= 3)
    out.push('Comiste dentro de tu objetivo ' + n.ok + ' de los ' + n.logged + ' días que registraste (' + Math.round(n.adh * 100) + ' %)' + (n.side ? ', y de media ' + n.side + ' de kcal' : '') + '.');
  else
    out.push(n.logged ? 'Solo registraste comidas ' + n.logged + (n.logged == 1 ? ' día' : ' días') + ': anótalas para saber si cumples tu objetivo.' : 'Este mes no has registrado comidas: anótalas para saber si cumples tu objetivo.');
  for (const [name, d] of m.o.ms.slice(0, 2))
    out.push(name + ': ' + (d > 0 ? '+' : '−') + fmtN(Math.abs(d), 1) + ' cm.');
  return out;
};
/* ── gráficas de la pantalla (SVG) ─────────────────────────────────────────────────────────────────────────────────── */
/** Barras de entrenos por semana, con la línea de lo que marca el plan. */
const svgBars = m => {
  const R = m.weeks;
  const mx = Math.max(1, m.pwk, ...R.map(r => r[1]));
  const bw = 280 / R.length;
  const y = v => 96 - v / mx * 80;
  return html`<svg viewBox="0 0 320 124" class="anc" role="img" aria-label="Entrenos por semana">${R.map((r, i) => html`<rect x="${(24 + i * bw + bw * .18).toFixed(1)}" y="${y(r[1]).toFixed(1)}" width="${(bw * .64).toFixed(1)}" height="${(96 - y(r[1])).toFixed(1)}" rx="5" fill="var(--a2)"/><text x="${(24 + i * bw + bw / 2).toFixed(1)}" y="${(y(r[1]) - 5).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">${r[1]}</text><text x="${(24 + i * bw + bw / 2).toFixed(1)}" y="114" text-anchor="middle" font-size="9.5" fill="var(--mu)">${r[0]}</text>`)}${raw(m.pwk > 0 ? html`<line x1="24" x2="304" y1="${y(m.pwk).toFixed(1)}" y2="${y(m.pwk).toFixed(1)}" stroke="var(--mu)" stroke-dasharray="4 4" stroke-width="1"/><text x="304" y="${(y(m.pwk) - 4).toFixed(1)}" font-size="9" text-anchor="end" fill="var(--mu)">plan</text>` : '')}<line x1="20" x2="308" y1="96" y2="96" stroke="var(--ln)"/></svg>`;
};
/** Línea del peso del mes (desde el último pesaje anterior, si lo hay). */
const svgLine = m => {
  const P = (m.w.before ? [{ d: m.a, w: m.w.before.w, pre: 1 }] : []).concat(m.w.pts);
  const v = P.map(p => p.w);
  const lo = Math.min(...v) - .5;
  const hi = Math.max(...v) + .5;
  const end = +monthRange(m.ym)[1].slice(8, 10);
  const days = Math.max(end, 2);
  const x = d => 24 + (+d.slice(8, 10) - 1) / (days - 1) * 272;
  const y = w => 104 - (w - lo) / (hi - lo) * 88;
  const pts = P.map(p => [x(p.d), y(p.w)]);
  return html`<svg viewBox="0 0 320 128" class="anc" role="img" aria-label="Peso del mes"><line x1="20" x2="300" y1="104" y2="104" stroke="var(--ln)"/><polyline fill="none" stroke="var(--a2)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}"/>${P.map((p, i) => html`<circle cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="${p.pre ? 2.5 : 3.5}" fill="${p.pre ? 'var(--mu)' : 'var(--a1)'}"/>`)}${raw(P.length > 1 ? html`<text x="${pts[0][0].toFixed(1)}" y="${(pts[0][1] - 8).toFixed(1)}" font-size="10" text-anchor="start" fill="var(--mu)">${fmtN(P[0].w, 1)}</text>` : '')}<text x="${pts[pts.length - 1][0].toFixed(1)}" y="${(pts[pts.length - 1][1] - 8).toFixed(1)}" font-size="11" font-weight="700" text-anchor="end" fill="currentColor">${fmtN(P[P.length - 1].w, 1)} kg</text><text x="20" y="121" font-size="9.5" fill="var(--mu)">1</text><text x="300" y="121" font-size="9.5" text-anchor="end" fill="var(--mu)">${end}</text></svg>`;
};
/** kcal de cada día, en verde si está dentro del objetivo (±10 %), en ámbar si se pasa y en azul si se queda corto. */
const svgKcal = m => {
  const n = m.nu;
  const D = n.days;
  const mx = Math.max(n.tk * 1.3, ...D) || 1;
  const bw = 288 / Math.max(D.length, 28);
  const y = v => 92 - v / mx * 80;
  return html`<svg viewBox="0 0 320 112" class="anc" role="img" aria-label="Kcal de cada día">${raw(n.tk ? html`<rect x="16" y="${y(n.tk * 1.1).toFixed(1)}" width="292" height="${(y(n.tk * .9) - y(n.tk * 1.1)).toFixed(1)}" fill="var(--ln)" opacity=".55"/><line x1="16" x2="308" y1="${y(n.tk).toFixed(1)}" y2="${y(n.tk).toFixed(1)}" stroke="var(--mu)" stroke-dasharray="4 4"/>` : '')}${D.map((v, i) => v > 0 ? html`<rect x="${(18 + i * bw).toFixed(1)}" y="${y(v).toFixed(1)}" width="${Math.max(2, bw - 2).toFixed(1)}" height="${(92 - y(v)).toFixed(1)}" rx="1.5" fill="${!n.tk || Math.abs(v - n.tk) <= n.tk * .1 ? '#2ecc71' : v > n.tk ? '#f59e0b' : '#4da3ff'}"/>` : '')}<line x1="16" x2="308" y1="92" y2="92" stroke="var(--ln)"/><text x="18" y="106" font-size="9.5" fill="var(--mu)">1</text><text x="308" y="106" font-size="9.5" text-anchor="end" fill="var(--mu)">${D.length}</text></svg>`;
};
/** Cifra de la cabecera: [texto, valor, comparación, clase de color]. */
const kpi = (l, v, s, c) => html`<div class="ank"><small>${l}</small><b>${v}</b>${s ? html`<small class="${c || ''}">${s}</small>` : ''}</div>`;
const delta = (v, p, u, d = 0) => !p && !v ? '' : (v - p > 0 ? '+' : v - p < 0 ? '−' : '±') + fmtN(Math.abs(v - p), d) + (u || '') + ' vs. mes anterior';
const analysisPage = () => {
  const [f, from] = analysisFrom();
  const today = dayKey(new Date());
  if (!from || from > today)
    return html`<div id="anp">${pgHead('Análisis mensual')}<div class="cd"><b>Aún no hay análisis</b><p class="mu">${from ? 'Estará disponible a partir del ' + fmtDateShort(from, { day: 'numeric', month: 'long' }) + ', cuando tengas un mes de datos.' : 'Estará disponible cuando lleves un mes registrando entrenos, comidas o tu peso.'}</p></div></div>`;
  const L = monthList();
  if (!L.includes(anaYm))
    anaYm = new Date().getDate() <= 7 && L.length > 1 ? L[L.length - 2] : L[L.length - 1];
  const m = monthStats(anaYm);
  const t = m.t;
  const i = L.indexOf(anaYm);
  const hm = Math.floor(t.min / 60) + ' h ' + String(Math.round(t.min % 60)).padStart(2, '0');
  const w = m.w;
  const n = m.nu;
  const ex = m.ex;
  const vc = n.verdict == 'Cumplido' ? 'ok' : n.verdict == 'A medias' ? 'seen' : n.verdict ? 'bad' : 'off';
  return html`<div id="anp">${pgHead('Análisis mensual')}<div class="anm"><button data-a="analysisMonth" data-i="-1" aria-label="Mes anterior"${i > 0 ? '' : ' disabled'}>‹</button><div><b>${cap(monthName(anaYm))}</b><small class="mu">${m.open ? 'del 1 al ' + m.nd + ' (en curso)' : 'del 1 al ' + m.nd}${f && f > m.a ? ' · desde el ' + +f.slice(8, 10) : ''}</small></div><button data-a="analysisMonth" data-i="1" aria-label="Mes siguiente"${i < L.length - 1 ? '' : ' disabled'}>›</button></div>
<div class="ankg">${kpi('Entrenos', String(t.n), delta(t.n, m.pt.n), t.n >= m.pt.n ? 'up' : 'dn')}${kpi('Tiempo', hm, '')}${kpi('Volumen', fmtN(t.vol / 1000, 1) + ' t', delta(t.vol / 1000, m.pt.vol / 1000, ' t', 1), t.vol >= m.pt.vol ? 'up' : 'dn')}${kpi('Récords', String(ex.rec.length), ex.rec.length ? 'mejor 1RM estimado' : '')}${kpi('Peso', w.d == null ? '—' : (w.d > 0 ? '+' : w.d < 0 ? '−' : '') + fmtN(Math.abs(w.d), 1) + ' kg', w.d == null ? 'sin pesajes' : w.tr, w.ok == null ? '' : w.ok ? 'up' : 'dn')}${kpi('Alimentación', n.logged >= 3 ? Math.round(n.adh * 100) + ' %' : '—', n.logged >= 3 ? 'días en objetivo' : 'pocos días', '')}</div>
<div class="cd ans"><b class="anh">Entrenamientos</b><p>${t.n ? (t.ns + (t.ns == 1 ? ' entreno de fuerza' : ' entrenos de fuerza')) + (t.nw ? ', ' + t.nw + ' WOD' : '') + (t.nc ? ', ' + t.nc + (t.nc == 1 ? ' sesión' : ' sesiones') + ' de cardio' + (t.km ? ' (' + fmtN(t.km, 1) + ' km)' : '') : '') + ' en ' + t.days + (t.days == 1 ? ' día' : ' días') + '. ' + fmtN(t.sets) + ' series' + (t.rpe ? ' · esfuerzo medio ' + fmtN(t.rpe, 1) : '') + '.' : 'Sin entrenos registrados este mes.'}</p>${raw(svgBars(m))}${m.plan > 0 ? html`<p class="mu">Tu plan marca unos ${fmtN(m.pwk, 1)} entrenos por semana: has hecho el ${Math.round((t.ns + t.nw) / m.plan * 100)} % de lo previsto${m.open ? ' hasta hoy' : ''}.</p>` : ''}${ex.rec.length ? html`<div class="anr"><small>Récords del mes (1RM estimado)</small>${ex.rec.slice(0, 4).map(r => html`<div class="row"><span>${r.n}</span><b>${fmtN(r.p)} → ${fmtN(r.m)} kg <span class="up">+${fmtN(r.g * 100)} %</span></b></div>`)}</div>` : ''}${ex.vol.length ? html`<div class="anr"><small>Más volumen</small>${ex.vol.map(r => html`<div class="row"><span>${r.n}</span><b>${fmtN(r.v / 1000, 1)} t</b></div>`)}</div>` : ''}</div>
<div class="cd ans"><b class="anh">Peso corporal</b>${w.d == null ? html`<p class="mu">No hay pesajes este mes. En Dashboard → Evolución del peso puedes registrarlo y activar un recordatorio.</p>` : html`<p><b class="an${w.tr == 'estable' ? 'e' : w.ok ? 'o' : 'x'}">${cap(w.tr)}${w.tr == 'estable' ? '' : ' ' + fmtN(Math.abs(w.d), 1) + ' kg'}</b>${w.goal >= 0 ? ' · objetivo ' + GOAL_LABELS[w.goal] + (w.ok ? ': va bien' : ': ' + (KIND_OK[w.goal] == 'estable' ? 'debería mantenerse' : 'debería ' + (KIND_OK[w.goal] == 'baja' ? 'bajar' : 'subir'))) : ''}</p>${raw(svgLine(m))}`}</div>
<div class="cd ans"><b class="anh">Alimentación</b><p><span class="rps ${vc}">${n.verdict || 'Sin datos suficientes'}</span></p>${n.logged ? html`<div class="g2 ann"><div><small>kcal de media</small><b>${fmtN(n.ak)}</b><small class="mu">objetivo ${fmtN(n.tk)}</small></div><div><small>Proteína de media</small><b>${fmtN(n.ap)} g</b><small class="mu">objetivo ${fmtN(n.tp)} g</small></div></div><p class="mu">${n.logged} de ${m.nd} días con comidas registradas · ${n.ok} dentro del objetivo (±10 %)${n.side ? ' · de media ' + n.side : ''}.${n.water ? ' Agua: ' + fmtN(n.water / 1000, 1) + ' l al día.' : ''}</p>${raw(svgKcal(m))}<div class="anlg"><span><i style="background:#2ecc71"></i>en objetivo</span><span><i style="background:#f59e0b"></i>por encima</span><span><i style="background:#4da3ff"></i>por debajo</span></div>` : html`<p class="mu">No hay comidas registradas este mes.</p>`}</div>
${m.o.ms.length || m.o.ach.length ? html`<div class="cd ans"><b class="anh">Otros datos</b>${m.o.ms.length ? html`<div class="anr"><small>Medidas</small>${m.o.ms.map(([k, d]) => html`<div class="row"><span>${k}</span><b>${d > 0 ? '+' : '−'}${fmtN(Math.abs(d), 1)} cm</b></div>`)}</div>` : ''}${m.o.ach.length ? html`<div class="anr"><small>Logros conseguidos</small><p>${m.o.ach.join(' · ')}</p></div>` : ''}</div>` : ''}
<div class="cd ans"><b class="anh">Conclusión</b><ul class="anu">${conclusions(m).map(c => html`<li>${c}</li>`)}</ul></div><div style="height:96px"></div><div class="sb"><button class="pr" data-a="analysisDownloadPdf" style="width:100%;padding:15px;border-radius:16px;font-size:16px">Descargar PDF</button></div></div>`;
};
/* ── el PDF (T-15) ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const analysisPdf = async (ym) => {
  const makePdf = await loadPdf();
  const m = monthStats(ym);
  const t = m.t;
  const w = m.w;
  const n = m.nu;
  const ac = accentNow()[2];
  const INK = [24, 24, 28];
  const MU = [118, 118, 128];
  const LN = [226, 226, 232];
  const title = 'Análisis mensual de ' + monthName(ym);
  const d = makePdf('StrataFit · ' + title);
  const X0 = 42;
  const WD = d.W - 84;
  let y = 0;
  const need = h => {
    if (y + h > d.H - 56) {
      d.page();
      y = 48;
    }
  };
  const para = (s, o = {}) => {
    const size = o.size || 10;
    for (const l of d.wrap(s, o.w || WD, size, o.bold)) {
      need(size * 1.5);
      d.text(o.x || X0, y + size, l, { size, bold: o.bold, color: o.color || INK });
      y += size * 1.45;
    }
  };
  const section = s => {
    need(60);
    y += 14;
    d.text(X0, y + 13, s, { size: 13, bold: true, color: INK });
    d.line(X0, y + 19, X0 + WD, y + 19, { color: LN });
    y += 28;
  };
  /* cabecera */
  d.page();
  d.rect(X0, 36, WD, 74, { fill: [27, 24, 40], r: 14 });
  d.rect(X0, 36, 6, 74, { fill: ac });
  d.text(X0 + 22, 68, cap(title), { size: 19, bold: true, color: [255, 255, 255] });
  d.text(X0 + 22, 90, (acctName() || 'StrataFit') + ' · del 1 al ' + m.nd + (m.open ? ' (mes en curso)' : ''), { size: 10, color: [196, 196, 210] });
  d.text(X0 + WD - 18, 68, 'STRATAFIT', { size: 11, bold: true, color: [255, 255, 255], align: 'right' });
  y = 128;
  /* cifras */
  const tiles = [['Entrenos', String(t.n), delta(t.n, m.pt.n)], ['Tiempo', Math.floor(t.min / 60) + ' h ' + String(Math.round(t.min % 60)).padStart(2, '0') + ' min', ''], ['Volumen', fmtN(t.vol / 1000, 1) + ' t', delta(t.vol / 1000, m.pt.vol / 1000, ' t', 1)], ['Récords', String(m.ex.rec.length), m.ex.rec.length ? 'mejor 1RM estimado' : ''], ['Peso', w.d == null ? '—' : (w.d > 0 ? '+' : w.d < 0 ? '−' : '') + fmtN(Math.abs(w.d), 1) + ' kg', w.d == null ? 'sin pesajes' : w.tr], ['Alimentación', n.logged >= 3 ? Math.round(n.adh * 100) + ' %' : '—', n.logged >= 3 ? 'días en objetivo' : 'pocos días registrados']];
  const tw = (WD - 20) / 3;
  tiles.forEach((x, i) => {
    const tx = X0 + i % 3 * (tw + 10);
    const ty = y + Math.floor(i / 3) * 66;
    d.rect(tx, ty, tw, 56, { fill: [246, 246, 250], r: 10 });
    d.text(tx + 12, ty + 17, x[0], { size: 8.5, color: MU });
    d.text(tx + 12, ty + 37, x[1], { size: 16, bold: true, color: INK });
    if (x[2])
      d.text(tx + 12, ty + 50, x[2], { size: 7.5, color: MU });
  });
  y += 136;
  /* entrenamientos */
  section('Entrenamientos');
  para(t.n ? t.ns + (t.ns == 1 ? ' entreno de fuerza' : ' entrenos de fuerza') + (t.nw ? ', ' + t.nw + ' WOD' : '') + (t.nc ? ', ' + t.nc + (t.nc == 1 ? ' sesión' : ' sesiones') + ' de cardio' + (t.km ? ' (' + fmtN(t.km, 1) + ' km)' : '') : '') + ' en ' + t.days + (t.days == 1 ? ' día' : ' días') + ' · ' + fmtN(t.sets) + ' series' + (t.rpe ? ' · esfuerzo medio ' + fmtN(t.rpe, 1) : '') + '.' : 'Sin entrenos registrados este mes.');
  need(130);
  {
    const R = m.weeks;
    const mx = Math.max(1, m.pwk, ...R.map(r => r[1]));
    const ch = 92;
    const top = y + 14;
    const bw = (WD - 40) / R.length;
    const yy = v => top + ch - v / mx * (ch - 14);
    d.line(X0, top + ch, X0 + WD, top + ch, { color: LN });
    R.forEach((r, i) => {
      const bx = X0 + 20 + i * bw + bw * .2;
      if (r[1])
        d.rect(bx, yy(r[1]), bw * .6, top + ch - yy(r[1]), { fill: ac, r: 3 });
      d.text(bx + bw * .3, yy(r[1]) - 4, String(r[1]), { size: 9, bold: true, align: 'center', color: INK });
      d.text(bx + bw * .3, top + ch + 13, 'días ' + r[0], { size: 8, align: 'center', color: MU });
    });
    if (m.pwk > 0) {
      d.line(X0 + 10, yy(m.pwk), X0 + WD - 10, yy(m.pwk), { color: MU, dash: [3, 3], lw: .8 });
      d.text(X0 + WD, yy(m.pwk) + 3, 'plan', { size: 7.5, color: MU, align: 'right' });
    }
    y = top + ch + 24;
  }
  if (m.plan > 0)
    para('Tu plan marca unos ' + fmtN(m.pwk, 1) + ' entrenos por semana: has hecho el ' + Math.round((t.ns + t.nw) / m.plan * 100) + ' % de lo previsto' + (m.open ? ' hasta hoy' : '') + '.', { color: MU, size: 9.5 });
  const rows = (head, list) => {
    if (!list.length)
      return;
    need(30);
    y += 6;
    d.text(X0, y + 9, head, { size: 8.5, bold: true, color: MU });
    y += 16;
    for (const [l, r] of list) {
      need(16);
      d.text(X0, y + 9, l, { size: 9.5, color: INK });
      d.text(X0 + WD, y + 9, r, { size: 9.5, bold: true, color: INK, align: 'right' });
      d.line(X0, y + 14, X0 + WD, y + 14, { color: [238, 238, 242], lw: .6 });
      y += 18;
    }
  };
  rows('Récords del mes (1RM estimado)', m.ex.rec.slice(0, 6).map(r => [r.n, 'de ' + fmtN(r.p) + ' a ' + fmtN(r.m) + ' kg (+' + fmtN(r.g * 100) + ' %)']));
  rows('Más volumen', m.ex.vol.map(r => [r.n, fmtN(r.v / 1000, 1) + ' t']));
  /* peso */
  section('Peso corporal');
  if (w.d == null)
    para('No hay pesajes este mes.', { color: MU });
  else {
    para(cap(w.tr) + (w.tr == 'estable' ? '' : ' ' + fmtN(Math.abs(w.d), 1) + ' kg') + (w.goal >= 0 ? ' · objetivo ' + GOAL_LABELS[w.goal] + (w.ok ? ': va bien' : ': ' + (KIND_OK[w.goal] == 'estable' ? 'debería mantenerse' : 'debería ' + (KIND_OK[w.goal] == 'baja' ? 'bajar' : 'subir'))) : '') + ' · último: ' + fmtN(w.last, 1) + ' kg.', { bold: true });
    need(120);
    const P = (w.before ? [{ d: m.a, w: w.before.w, pre: 1 }] : []).concat(w.pts);
    const v = P.map(p => p.w);
    const lo = Math.min(...v) - .5;
    const hi = Math.max(...v) + .5;
    const days = Math.max(+monthRange(ym)[1].slice(8, 10), 2);
    const top = y + 10;
    const ch = 90;
    const px = p => X0 + 20 + (+p.d.slice(8, 10) - 1) / (days - 1) * (WD - 40);
    const py = p => top + ch - (p.w - lo) / (hi - lo) * ch;
    d.line(X0, top + ch, X0 + WD, top + ch, { color: LN });
    [lo + .5, hi - .5].forEach(g => {
      const gy = top + ch - (g - lo) / (hi - lo) * ch;
      d.line(X0, gy, X0 + WD, gy, { color: [240, 240, 244], lw: .6 });
      d.text(X0 - 4, gy + 3, fmtN(g, 1), { size: 7.5, color: MU, align: 'right' });
    });
    d.poly(P.map(p => [px(p), py(p)]), { color: ac, lw: 2 });
    P.forEach(p => d.circle(px(p), py(p), p.pre ? 2 : 3, { fill: p.pre ? MU : ac }));
    d.text(X0 + 20, top + ch + 13, '1', { size: 8, color: MU, align: 'center' });
    d.text(X0 + WD - 20, top + ch + 13, String(days), { size: 8, color: MU, align: 'center' });
    y = top + ch + 24;
  }
  /* alimentación */
  section('Alimentación');
  if (!n.logged)
    para('No hay comidas registradas este mes.', { color: MU });
  else {
    para((n.verdict || 'Sin datos suficientes') + ' · ' + n.logged + ' de ' + m.nd + ' días con comidas registradas, ' + n.ok + ' dentro del objetivo (±10 %).', { bold: true });
    para('De media, ' + fmtN(n.ak) + ' kcal (objetivo ' + fmtN(n.tk) + ') y ' + fmtN(n.ap) + ' g de proteína (objetivo ' + fmtN(n.tp) + ' g)' + (n.side ? ': ' + n.side : '') + '.' + (n.water ? ' Agua: ' + fmtN(n.water / 1000, 1) + ' l al día.' : ''), { color: MU, size: 9.5 });
    need(120);
    const D = n.days;
    const mx = Math.max(n.tk * 1.3, ...D) || 1;
    const top = y + 10;
    const ch = 84;
    const bw = (WD - 20) / Math.max(D.length, 28);
    const yy = v => top + ch - v / mx * ch;
    if (n.tk) {
      d.rect(X0, yy(n.tk * 1.1), WD, yy(n.tk * .9) - yy(n.tk * 1.1), { fill: [238, 246, 240] });
      d.line(X0, yy(n.tk), X0 + WD, yy(n.tk), { color: MU, dash: [3, 3], lw: .8 });
    }
    D.forEach((v, i) => {
      if (v > 0)
        d.rect(X0 + 10 + i * bw, yy(v), Math.max(1.5, bw - 2), top + ch - yy(v), { fill: !n.tk || Math.abs(v - n.tk) <= n.tk * .1 ? [46, 204, 113] : v > n.tk ? [245, 158, 11] : [77, 163, 255] });
    });
    d.line(X0, top + ch, X0 + WD, top + ch, { color: LN });
    d.text(X0 + 10, top + ch + 13, '1', { size: 8, color: MU });
    d.text(X0 + WD - 10, top + ch + 13, String(D.length), { size: 8, color: MU, align: 'right' });
    y = top + ch + 26;
    const lg = [['en objetivo', [46, 204, 113]], ['por encima', [245, 158, 11]], ['por debajo', [77, 163, 255]]];
    let lx = X0;
    lg.forEach(([l, c]) => {
      d.rect(lx, y - 7, 8, 8, { fill: c, r: 2 });
      d.text(lx + 12, y, l, { size: 8, color: MU });
      lx += 24 + d.width(l, 8);
    });
    y += 8;
  }
  /* otros datos y conclusión */
  if (m.o.ms.length || m.o.ach.length) {
    section('Otros datos');
    rows('Medidas', m.o.ms.map(([k, v]) => [k, (v > 0 ? '+' : '−') + fmtN(Math.abs(v), 1) + ' cm']));
    if (m.o.ach.length) {
      y += 4;
      para('Logros conseguidos: ' + m.o.ach.join(' · ') + '.', { size: 9.5 });
    }
  }
  section('Conclusión');
  for (const c of conclusions(m)) {
    need(16);
    d.circle(X0 + 3, y + 6.5, 1.8, { fill: ac });
    para(c, { x: X0 + 12, w: WD - 12, size: 10 });
    y += 3;
  }
  return d.bytes((i, k) => {
    d.line(X0, d.H - 40, X0 + WD, d.H - 40, { color: LN, lw: .6 });
    d.text(X0, d.H - 26, 'StrataFit · ' + title + ' · generado el ' + fmtDateShort(dayKey(new Date()), { day: 'numeric', month: 'long', year: 'numeric' }) + ' · V' + APPV, { size: 7.5, color: MU });
    d.text(X0 + WD, d.H - 26, 'Página ' + (i + 1) + ' de ' + k, { size: 7.5, color: MU, align: 'right' });
  });
};
/* — manejadores de esta función (registros A / C / U) — */
A.openAnalysis = () => fullPage(analysisPage());
A.analysisMonth = i => {
  const L = monthList();
  const k = L.indexOf(anaYm) + (i > 0 ? 1 : -1);
  if (k >= 0 && k < L.length) {
    anaYm = L[k];
    sheet(analysisPage());
  }
};
A.analysisDownloadPdf = async () => {
  try {
    const b = await analysisPdf(anaYm);
    const r = await downloadFile('StrataFit-analisis-' + anaYm + '.pdf', b, 'application/pdf');
    toast(r == 'saved' ? 'PDF guardado' : r == 'declined' ? 'No se ha guardado el PDF' : 'No se ha podido guardar el PDF');
  }
  catch (e) {
    logError('análisis en PDF', e);
    toast('No se ha podido crear el PDF');
  }
};
