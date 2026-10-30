/* ═══ extras/wod ═══
   Temporizadores de WOD (AMRAP, EMOM, Tabata, For time).
   Define: WOD_MODES, WOD_DEFAULTS, WOD_INFO, wodConfig, wodTotal, wodSetup, wodState, wodName, wodSkeleton, wodTick, wodStart, wodClose, wodEnd  · acciones/registros: 13
*/
import { clampInt, dayKey, fmtClock } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, C } from '../core/registry.js';
import { S, saveState, setWodRun, wodRun } from '../core/state.js';
import { icon } from '../core/icons.js';
import { confirmDialog, fullPage, pgHead, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { keepAwake } from '../workout/wake.js';
import { beep, buzz } from '../profile/feedback.js';
import { checkAchievements } from './achievements.js';
import { html, raw } from '../core/html.js';
const WOD_MODES = [['amrap', 'AMRAP'], ['emom', 'EMOM'], ['tabata', 'Tabata'], ['ft', 'For time']];
const WOD_DEFAULTS = { m: 'amrap', a: 12, en: 10, ei: 60, tw: 20, tr: 10, tn: 8, ct: 0, pre: 10 };
const WOD_INFO = { amrap: 'Tantas rondas como puedas en el tiempo marcado. Cuenta cada ronda con un toque.', emom: 'Cada intervalo empieza un trabajo nuevo. Lo que te sobra del intervalo es descanso.', tabata: 'Trabajo y descanso en intervalos cortos. El clásico: 20 s de trabajo, 10 s de descanso, 8 rondas.', ft: 'Cronómetro hacia arriba. Completa el trabajo lo antes posible; opcionalmente con tiempo límite.' };
const wodConfig = () => {
  const c = Object.assign({}, WOD_DEFAULTS, S.wdc && typeof S.wdc == 'object' ? S.wdc : {});
  return { m: WOD_MODES.some(x => x[0] == c.m) ? c.m : 'amrap', a: clampInt(c.a, 1, 180, 12), en: clampInt(c.en, 1, 120, 10), ei: clampInt(c.ei, 10, 600, 60), tw: clampInt(c.tw, 5, 600, 20), tr: clampInt(c.tr, 0, 600, 10), tn: clampInt(c.tn, 1, 99, 8), ct: clampInt(c.ct, 0, 180, 0), pre: clampInt(c.pre, 0, 30, 10) };
};
const wodTotal = c => c.m == 'amrap' ? c.a * 60 : c.m == 'emom' ? c.en * c.ei : c.m == 'tabata' ? (c.tw + c.tr) * c.tn - c.tr : c.ct * 60;
const wodSetup = () => {
  const c = wodConfig();
  const m = c.m;
  const num = (l, k, mn, mx) => html`<div><label>${raw(l)}</label><input type="number" inputmode="numeric" min="${mn}" max="${mx}" value="${c[k]}" data-c="wdv" data-k="${k}" aria-label="${l}"></div>`;
  const sel = (l, k, o) => html`<div><label>${raw(l)}</label><select data-c="wdv" data-k="${k}" aria-label="${l}">${o.map(x => html`<option value="${x[0]}"${c[k] == x[0] ? ' selected' : ''}>${raw(x[1])}</option>`)}</select></div>`;
  let f = '';
  if (m == 'amrap')
    f = num('Duración (min)', 'a', 1, 180);
  else if (m == 'emom')
    f = html`<div class="g2">${raw(num('Rondas', 'en', 1, 120))}${raw(sel('Intervalo', 'ei', [[30, '30 s'], [45, '45 s'], [60, '1 min'], [90, '1:30'], [120, '2 min'], [180, '3 min']]))}</div>`;
  else if (m == 'tabata')
    f = html`<div class="g2" style="grid-template-columns:repeat(3,1fr)">${raw(num('Trabajo (s)', 'tw', 5, 600))}${raw(num('Descanso (s)', 'tr', 0, 600))}${raw(num('Rondas', 'tn', 1, 99))}</div>`;
  else
    f = num('Tiempo límite (min, 0 = sin límite)', 'ct', 0, 180);
  const t = wodTotal(c);
  return html`${pgHead('Temporizador WOD')}<div class="seg" style="grid-template-columns:repeat(4,1fr)">${WOD_MODES.map(x => html`<button class="${m == x[0] ? 'on' : ''}" data-a="wdm" data-v="${x[0]}">${raw(x[1])}</button>`)}</div><p class="mu" style="font-size:13px;margin:10px 2px 4px">${raw(WOD_INFO[m])}</p>${raw(f)}<div class="g2" style="margin-top:2px">${raw(sel('Cuenta atrás inicial', 'pre', [[0, 'Sin cuenta atrás'], [5, '5 s'], [10, '10 s'], [15, '15 s'], [30, '30 s']]))}<div><label>Duración total</label><div class="cd" style="margin:0;padding:10px;text-align:center"><b id="f2tt">${raw(t ? fmtClock(t) : 'Sin límite')}</b></div></div></div><p class="mu" style="font-size:12px;margin:12px 2px 0">Suena un aviso en los últimos 3 segundos de cada tramo y al empezar el siguiente. La pantalla se mantiene encendida. Si bloqueas el móvil, el tiempo sigue corriendo pero el sonido solo se oye con la app abierta.</p><div style="height:90px"></div><div class="sb"><button class="pr" data-a="wdgo" style="width:100%;padding:14px">Empezar</button></div>`;
};
A.wod = () => fullPage(wodSetup());
A.wdm = (i, b) => {
  S.wdc = Object.assign(wodConfig(), { m: b.dataset.v });
  saveState();
  sheet(wodSetup());
};
C.wdv = e => {
  const k = e.dataset.k;
  if (!(k in WOD_DEFAULTS))
    return;
  const c = wodConfig();
  c[k] = +e.value;
  S.wdc = c;
  saveState();
  e.value = wodConfig()[k];
  const t = document.getElementById('f2tt');
  if (t) {
    const T = wodTotal(wodConfig());
    t.textContent = T ? fmtClock(T) : 'Sin límite';
  }
};
function wodState() {
  const c = wodRun.c;
  const e = ((wodRun.pa || Date.now()) - wodRun.t0 - wodRun.pt) / 1000;
  if (e < c.pre)
    return { ph: 'pre', rem: Math.ceil(c.pre - e), id: 'p', len: c.pre, el: e };
  const t = e - c.pre;
  if (c.m == 'amrap') {
    const T = c.a * 60;
    if (t >= T)
      return { fin: 1, t: T };
    return { ph: 'work', rem: Math.ceil(T - t), id: 'a', len: T, el: t };
  }
  if (c.m == 'ft') {
    const T = c.ct * 60;
    if (T && t >= T)
      return { fin: 1, t: T, cap: 1 };
    return { ph: 'work', up: Math.floor(t), id: 'f', len: T, el: t };
  }
  if (c.m == 'emom') {
    const T = c.en * c.ei;
    if (t >= T)
      return { fin: 1, t: T, rd: c.en };
    const i = Math.floor(t / c.ei);
    const w = t - i * c.ei;
    return { ph: 'work', rem: Math.ceil(c.ei - w), id: 'r' + i, len: c.ei, el: w, rd: i + 1, tot: c.en, t };
  }
  const cy = c.tw + c.tr;
  const T = cy * c.tn - c.tr;
  if (t >= T)
    return { fin: 1, t: T, rd: c.tn };
  const i = Math.floor(t / cy);
  const w = t - i * cy;
  if (w < c.tw)
    return { ph: 'work', rem: Math.ceil(c.tw - w), id: 'w' + i, len: c.tw, el: w, rd: i + 1, tot: c.tn, t };
  return { ph: 'rest', rem: Math.ceil(cy - w), id: 'x' + i, len: c.tr, el: w - c.tw, rd: i + 1, tot: c.tn, t };
}
const wodName = c => c.m == 'amrap' ? 'AMRAP ' + c.a + ' min' : c.m == 'emom' ? 'EMOM ' + (c.ei == 60 ? c.en + ' min' : c.en + ' × ' + c.ei + ' s') : c.m == 'tabata' ? 'Tabata ' + c.tw + '/' + c.tr + ' · ' + c.tn + ' rondas' : 'For time' + (c.ct ? ' · tope ' + c.ct + ' min' : '');
function wodSkeleton() {
  const o = document.getElementById('f2w');
  if (!o || !wodRun)
    return;
  const c = wodRun.c;
  const m = c.m;
  o.dataset.ph = wodRun.done ? 'done' : wodRun.ph || 'pre';
  o.classList.toggle('pz', !!wodRun.pa);
  let h = html`<div class="f2hd"><button data-a="wdx" aria-label="Cerrar" class="f2cl">${icon('x', 22)}</button><b>${wodName(c)}</b><span></span></div>`;
  if (wodRun.done) {
    const f = wodRun.fin;
    h += '<div class="f2dn"><small>Terminado</small>';
    if (m == 'amrap')
      h += html`<b class="f2rs" id="f2rs">${raw(wodRun.r)}${wodRun.r == 1 ? ' ronda' : ' rondas'}</b><div class="g2" style="width:100%;margin-top:6px"><div><label for="f2r">Rondas</label><input id="f2r" type="number" inputmode="numeric" min="0" max="999" value="${wodRun.r}"></div><div><label for="f2e">Repeticiones extra</label><input id="f2e" type="number" inputmode="numeric" min="0" max="999" value="0"></div></div>`;
    else if (m == 'ft')
      h += html`<b class="f2rs">${raw(fmtClock(Math.round(f.t)))}</b><small>${raw(f.cap ? 'Tiempo límite alcanzado' : wodRun.r ? wodRun.r + (wodRun.r == 1 ? ' vuelta' : ' vueltas') : '')}</small>`;
    else
      h += html`<b class="f2rs">${raw(f.rd || '')}${f.rd ? (f.rd == 1 ? ' ronda' : ' rondas') : ''}</b><small>${f.early ? 'Terminado antes de tiempo' : 'Completado'} · ${raw(fmtClock(Math.round(f.t)))}</small>`;
    h += '<input id="f2n" aria-label="Nota" maxlength="80" placeholder="Nota (opcional): nombre del WOD, movimientos…" style="margin-top:12px"><div class="g2" style="width:100%;margin-top:12px"><button data-a="wdd">Descartar</button><button class="pr" data-a="wds">Guardar</button></div></div>';
  }
  else {
    h += '<div class="f2p" id="f2p"></div><div class="f2t" id="f2t">0:00</div><div class="f2s" id="f2s"></div><div class="f2b"><i id="f2bar"></i></div><div class="f2sp"></div>';
    if (m == 'amrap')
      h += html`<button class="f2big" data-a="wdr" aria-label="Sumar una ronda"><small>Rondas</small><b id="f2rn">${raw(wodRun.r)}</b><small>Toca para sumar una</small></button><div style="text-align:center"><button data-a="wdu" class="f2sm">Restar una ronda</button></div>`;
    else if (m == 'ft')
      h += html`<button class="f2big" data-a="wdr" aria-label="Marcar vuelta"><small>Vueltas</small><b id="f2rn">${raw(wodRun.r)}</b><small id="f2lp">${raw(wodRun.laps.length ? 'Última: ' + fmtClock(wodRun.laps[wodRun.laps.length - 1] - (wodRun.laps[wodRun.laps.length - 2] || 0)) : 'Toca para marcar una vuelta')}</small></button>`;
    h += html`<div class="g2 f2ct"><button data-a="wdp" id="f2pb">${wodRun.pa ? 'Seguir' : 'Pausa'}</button><button data-a="wdf">Terminar</button></div>`;
  }
  o.innerHTML = h;
}
function wodTick() {
  if (!wodRun || wodRun.done)
    return;
  const s = wodState();
  if (s.fin) {
    wodEnd(s, 0);
    return;
  }
  const o = document.getElementById('f2w');
  if (!o)
    return;
  if (o.dataset.ph !== s.ph)
    o.dataset.ph = s.ph;
  wodRun.ph = s.ph;
  const set = (id, v) => {
    const e = document.getElementById(id);
    if (e && e.textContent !== v)
      e.textContent = v;
  };
  set('f2t', s.up != null ? fmtClock(s.up) : fmtClock(s.rem));
  set('f2p', s.ph == 'pre' ? 'Prepárate' : s.ph == 'rest' ? 'Descanso' : wodRun.c.m == 'ft' ? 'Cronómetro' : 'Trabajo');
  set('f2s', s.rd ? 'Ronda ' + s.rd + ' de ' + s.tot : s.ph == 'pre' ? 'Empieza en ' + s.rem + ' s' : wodRun.c.m == 'ft' && wodRun.c.ct ? 'Límite ' + fmtClock(wodRun.c.ct * 60) : '');
  const bar = document.getElementById('f2bar');
  if (bar)
    bar.style.width = (s.len ? Math.min(100, Math.max(0, s.el / s.len * 100)) : 0) + '%';
  if (!wodRun.pa) {
    if (wodRun.sg !== s.id) {
      if (wodRun.sg !== '') {
        beep(1);
        buzz([120]);
      }
      wodRun.sg = s.id;
    }
    if (s.rem != null && s.rem <= 3 && s.rem >= 1) {
      const k = s.id + ':' + s.rem;
      if (wodRun.bk !== k) {
        wodRun.bk = k;
        beep(0);
      }
    }
  }
}
function wodStart() {
  const c = wodConfig();
  S.wdc = c;
  saveState();
  setWodRun({ c, t0: Date.now(), pt: 0, pa: 0, r: 0, laps: [], sg: '', bk: '', done: 0, ph: 'pre', fin: null });
  sheet();
  let o = document.getElementById('f2w');
  if (!o) {
    o = document.createElement('div');
    o.id = 'f2w';
    document.body.appendChild(o);
  }
  wodSkeleton();
  clearInterval(wodTick.iv);
  wodTick.iv = setInterval(wodTick, 200);
  wodTick();
  beep(1);
  buzz([60]);
  keepAwake();
}
function wodClose() {
  clearInterval(wodTick.iv);
  setWodRun(null);
  const o = document.getElementById('f2w');
  if (o)
    o.remove();
  keepAwake();
}
function wodEnd(s, early) {
  if (!wodRun || wodRun.done)
    return;
  clearInterval(wodTick.iv);
  const c = wodRun.c;
  let t = s.t;
  if (early) {
    const e = ((wodRun.pa || Date.now()) - wodRun.t0 - wodRun.pt) / 1000 - c.pre;
    t = Math.max(0, Math.min(e, wodTotal(c) || e));
  }
  wodRun.done = 1;
  wodRun.fin = { t, cap: !!s.cap, rd: s.rd || 0, early: !!early };
  if (early && s.rd && c.m != 'amrap' && c.m != 'ft')
    wodRun.fin.rd = Math.max(0, s.rd - 1 + (s.ph == 'rest' ? 1 : 0));
  if (!early) {
    beep(1);
    setTimeout(() => beep(1), 500);
    buzz([200, 80, 200]);
  }
  wodSkeleton();
  keepAwake();
}
A.wdgo = () => wodStart();
A.wdr = () => {
  if (!wodRun || wodRun.done || wodRun.pa)
    return;
  const s = wodState();
  if (s.ph == 'pre')
    return;
  wodRun.r++;
  if (wodRun.c.m == 'ft') {
    wodRun.laps.push(Math.round(s.up != null ? s.up : 0));
    const l = document.getElementById('f2lp');
    if (l)
      l.textContent = 'Última: ' + fmtClock(wodRun.laps[wodRun.laps.length - 1] - (wodRun.laps[wodRun.laps.length - 2] || 0));
  }
  const n = document.getElementById('f2rn');
  if (n)
    n.textContent = wodRun.r;
  buzz(25);
};
A.wdu = () => {
  if (!wodRun || wodRun.done || !wodRun.r)
    return;
  wodRun.r--;
  const n = document.getElementById('f2rn');
  if (n)
    n.textContent = wodRun.r;
};
A.wdp = () => {
  if (!wodRun || wodRun.done)
    return;
  if (wodRun.pa) {
    wodRun.pt += Date.now() - wodRun.pa;
    wodRun.pa = 0;
  }
  else
    wodRun.pa = Date.now();
  const o = document.getElementById('f2w');
  if (o)
    o.classList.toggle('pz', !!wodRun.pa);
  const b = document.getElementById('f2pb');
  if (b)
    b.textContent = wodRun.pa ? 'Seguir' : 'Pausa';
  keepAwake();
};
A.wdf = () => {
  if (!wodRun || wodRun.done)
    return;
  const s = wodState();
  if (s.fin) {
    wodEnd(s, 0);
    return;
  }
  if (s.ph == 'pre') {
    wodClose();
    return;
  }
  if (wodRun.c.m == 'ft') {
    wodEnd({ t: s.el }, 0);
    return;
  }
  confirmDialog('¿Terminar antes de tiempo?', 'Podrás guardar lo que llevas hecho.', 'wdf2', 'Terminar');
};
A.wdf2 = () => {
  if (!wodRun || wodRun.done)
    return;
  const s = wodState();
  if (s.fin) {
    wodEnd(s, 0);
    return;
  }
  wodEnd(s, 1);
};
A.wdx = () => {
  if (!wodRun)
    return;
  if (wodRun.done || wodRun.ph == 'pre' && !wodRun.r)
    wodClose();
  else
    confirmDialog('¿Salir del temporizador?', 'Se perderá lo que llevas.', 'wdq', 'Salir');
};
A.wdq = () => wodClose();
A.wdd = () => wodClose();
A.wds = () => {
  if (!wodRun || !wodRun.done)
    return;
  const c = wodRun.c;
  const f = wodRun.fin;
  const nt = ((document.getElementById('f2n') || {}).value || '').trim().slice(0, 80);
  const mins = Math.max(1, Math.round(f.t / 60));
  let x;
  let w = { md: c.m };
  if (c.m == 'amrap') {
    const r = clampInt((document.getElementById('f2r') || {}).value, 0, 999, wodRun.r);
    const ex = clampInt((document.getElementById('f2e') || {}).value, 0, 999, 0);
    x = r + (r == 1 ? ' ronda' : ' rondas') + (ex ? ' + ' + ex + ' reps' : '');
    w.r = r;
    w.e = ex;
  }
  else if (c.m == 'ft') {
    x = fmtClock(Math.round(f.t)) + (f.cap ? ' (tope)' : '') + (wodRun.r ? ' · ' + wodRun.r + (wodRun.r == 1 ? ' vuelta' : ' vueltas') : '');
    w.t = Math.round(f.t);
    w.r = wodRun.r;
  }
  else {
    const rd = f.rd || 0;
    x = rd + (rd == 1 ? ' ronda' : ' rondas') + (f.early ? ' (antes de tiempo)' : '') + ' · ' + fmtClock(Math.round(f.t));
    w.r = rd;
    w.t = Math.round(f.t);
  }
  const l = { d: dayKey(new Date), n: 'WOD · ' + wodName(c), v: 0, s: 0, m: mins, q: 0, k: 'w', x, w };
  if (nt)
    l.nt = nt;
  S.logs.push(l);
  saveState();
  wodClose();
  toast('WOD guardado');
  checkAchievements();
  R();
};
