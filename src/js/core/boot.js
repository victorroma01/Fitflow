/* ═══ core/boot ═══
   Arranque: migraciones, restauración de estado y primer render.
*/
import { $, fmtDuration, fmtMinSec, roundInt, X } from './util.js';
import { Store } from './store.js';
import { logError } from './errors.js';
import { savedFormat, stateRecovered } from './persist.js';
import { parseProgram, PROGRAMS } from '../data/library.js';
import { applyTheme, S, saveState, W } from './state.js';
import { icon } from './icons.js';
import { dialog } from './ui.js';
import { R } from './render.js';
import { restorePlanBackup } from '../routines/builder.js';
import { pendingResume, setPendingResume, WIP_KEY } from '../workout/resume.js';
import { keepAwake } from '../workout/wake.js';
import { generateProgram } from '../programs/create.js';
import { isLevel } from '../programs/levels.js';
import { applyAccent } from '../profile/appearance.js';
import { beep, buzz } from '../profile/feedback.js';
import { isStandalone } from '../system/files.js';
import { plural } from '../system/backup.js';
import { takeSnapshot } from '../system/snapshots.js';
import { showWhatsNew, whatsNewDue } from '../system/updates.js';
import { loadPhotos } from '../extras/measures.js';
import { checkAchievements } from '../extras/achievements.js';
(function () {
  try {
    const A_ = Array.isArray;
    const O_ = x => x && typeof x == 'object' && !A_(x);
    if (!(S.prog >= 0 && S.prog < 5))
      S.prog = 0;
    if (!A_(S.plan) || !S.plan.length || !S.plan.every(d => d && typeof d.n == 'string' && A_(d.ex) && d.ex.every(e => e && typeof e.n == 'string' && +e.s > 0)))
      S.plan = parseProgram(S.prog);
    if (!(S.sel >= 0 && S.sel < S.plan.length))
      S.sel = 0;
    if (!(S.tab >= 0 && S.tab < 4))
      S.tab = 0;
    if (!(S.wk >= 1))
      S.wk = 1;
    ['logs', 'cr', 'cx', 'cf', 'lib'].forEach(k => {
      if (!A_(S[k]))
        S[k] = [];
    });
    ['done', 'last', 'meals', 'hist', 'pr', 'notes', 'bio', 'pf', 'nu'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (!S.nu)
      S.nu = { k: 1942, c: 50, p: 20, f: 30, n: 3 };
    if (!S.done)
      S.done = {};
    if (!S.last)
      S.last = {};
    if (!S.meals)
      S.meals = {};
    if (!S.pf)
      S.pf = {};
  }
  catch (e) {
    S.plan = parseProgram(0);
    S.sel = 0;
    S.tab = 0;
  }
})();
S.bio = S.bio || {};
S.notes = S.notes || {};
S.cr = S.cr || [];
applyTheme();
if (S.v != 4) {
  S.v = 4;
  try {
    const hs = s => {
      let h = 5381;
      for (let i = 0; i < s.length; i++)
        h = (h * 33 ^ s.charCodeAt(i)) >>> 0;
      return h;
    };
    const sg = p => hs(JSON.stringify(p.map(d => [d.n, d.ex.map(e => [e.n, e.s])])));
    const OH = [3226455457, 1146233975, 2463745118, 1205055430, 2599378434];
    if (OH[S.prog] != null && sg(S.plan) == OH[S.prog]) {
      const o = S.plan;
      S.plan = parseProgram(S.prog);
      S.plan.forEach((d, j) => d.ex.forEach(e => {
        const q = o[j] && o[j].ex.find(x => x.n == e.n);
        if (q) {
          if (q.r)
            e.r = q.r;
          if (q.t)
            e.t = q.t;
        }
      }));
    }
  }
  catch (x) {
    logError('arranque: firma del plan', x);
  }
  saveState();
}
applyAccent();
if (typeof MutationObserver != 'undefined')
  new MutationObserver(() => {
    const s = $('#sh');
    if (!s.firstChild)
      s.className = '';
  }).observe($('#sh'), { childList: true });
setInterval(() => {
  if (!W || W.p)
    return;
  const m = $('#tm');
  if (m) {
    const tx = fmtDuration(roundInt((Date.now() - W.t0) / 1e3));
    if (m.textContent !== tx)
      m.textContent = tx;
  }
  if (W.re) {
    const l = Math.ceil((W.re - Date.now()) / 1e3);
    if (l <= 0) {
      const late = Date.now() - W.re > 4000;
      W.re = 0;
      W.lb = 0;
      if (!late) {
        buzz([180, 70, 180]);
        beep(1);
      }
      R();
    }
    else {
      if (l <= 3 && W.lb !== l) {
        W.lb = l;
        beep(0);
      }
      const r = $('#rt');
      if (r) {
        const tx = fmtMinSec(l);
        if (r.textContent !== tx)
          r.textContent = tx;
      }
    }
  }
}, 200);
restorePlanBackup();
S.plan.forEach(d => {
  if (!d.cu && d.img)
    delete d.img;
});
try {
  setPendingResume(JSON.parse(Store.get(WIP_KEY)));
}
catch (e) {
  setPendingResume(null);
}
(() => {
  const z = pendingResume;
  let ok = !!(z && z.W && z.d && Array.isArray(z.W.x) && Date.now() - z.t < 864e5 && z.W.x.length == z.d.ex.length);
  if (ok && !z.pb) {
    const c = S.plan[z.sel];
    ok = !!c && c.ex.length == z.d.ex.length && c.ex.every((x, i) => x.n == z.d.ex[i].n);
  }
  if (!ok) {
    setPendingResume(null);
    try {
      Store.del(WIP_KEY);
    }
    catch (e) {
      logError('arranque: descartar entreno en curso', e);
    }
  }
})();
(function () {
  try {
    const n0 = (S.cp || []).length;
    const okd = d => d && typeof d.n == 'string' && Array.isArray(d.ex) && d.ex.every(e => e && typeof e.n == 'string' && +e.s > 0);
    if (!Array.isArray(S.cp))
      S.cp = [];
    S.cp = S.cp.filter(p => p && typeof p.n == 'string' && Array.isArray(p.plan) && p.plan.length && p.plan.every(okd));
    if (S.cp.length != n0 || !(S.cpi >= 0 && S.cpi < S.cp.length))
      S.cpi = -1;
    if (S.cpi < 0 && (S.lv || 'int') == 'int') {
      const nn = p => p.map(d => d.n).join('|');
      const cu = nn(S.plan);
      if (nn(parseProgram(S.prog)) != cu) {
        for (let i = 0; i < PROGRAMS.length; i++)
          if (nn(parseProgram(i)) == cu) {
            S.prog = i;
            break;
          }
      }
    }
  }
  catch (e) {
    S.cp = [];
    S.cpi = -1;
  }
})();
(() => {
  try {
    if (!isLevel(S.lv))
      S.lv = 'int';
    if (!Array.isArray(S.cp))
      S.cp = [];
    S.cp.forEach(p => {
      if (!p || !p.o)
        return;
      try {
        if (typeof p.o != 'object' || !isLevel(p.o.niv) || !Array.isArray(generateProgram({ ...p.o, vr: p.o.vr || 0 })))
          delete p.o;
      }
      catch (e) {
        delete p.o;
      }
    });
  }
  catch (e) {
    S.lv = 'int';
  }
})();
setInterval(() => {
  if (!W || W.p || !W.re)
    return;
  const r = $('#rt2');
  if (r) {
    const tx = fmtMinSec(Math.max(0, Math.ceil((W.re - Date.now()) / 1000)));
    if (r.textContent !== tx)
      r.textContent = tx;
  }
}, 250);
(function () {
  try {
    const O_ = x => x && typeof x == 'object' && !Array.isArray(x);
    ['fq', 'tp', 'dt', 'dl', 'dq'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (S.un != null && S.un != 'kg' && S.un != 'lb')
      delete S.un;
    ['vol', 'snt'].forEach(k => {
      if (S[k] != null && ![0, 1, 2].includes(S[k]))
        delete S[k];
    });
    ['vib', 'ar', 'awk'].forEach(k => {
      if (S[k] != null && S[k] !== 0 && S[k] !== 1)
        delete S[k];
    });
    if (S.bkd != null && !(+S.bkd > 0))
      delete S.bkd;
    if (S.hist) {
      Object.keys(S.hist).forEach(n => {
        const h = S.hist[n];
        if (!Array.isArray(h)) {
          delete S.hist[n];
          return;
        }
        S.hist[n] = h.filter(x => x && typeof x.d == 'string' && Array.isArray(x.s) && x.s.every(y => Array.isArray(y)));
      });
    }
  }
  catch (e) {
    logError('arranque: reparar nutrición', e);
  }
})();
setInterval(keepAwake, 2500);
try {
  const q = Store.get(Store.K.rs);
  if (q) {
    Store.del(Store.K.rs);
    const o = JSON.parse(q);
    setTimeout(() => {
      try {
        dialog(o.u ? 'Datos recuperados' : 'Copia restaurada', '<div style="display:grid;gap:6px;text-align:left">' + (o.s || []).map(x => '<div>· ' + X(x) + '</div>').join('') + '</div>' + (o.f ? '<div style="margin-top:10px">Se descartaron ' + plural(o.f, 'elemento dañado', 'elementos dañados') + ' de la copia.</div>' : ''), [['Entendido', 'zno', 'pr']]);
      }
      catch (e) {
        logError('arranque: aviso de restauración', e);
      }
    }, 700);
  }
}
catch (e) {
  logError('arranque: resumen de restauración', e);
}
loadPhotos();
(function () {
  try {
    const A_ = Array.isArray;
    const O_ = x => x && typeof x == 'object' && !A_(x);
    if (S.ms != null && !A_(S.ms))
      S.ms = [];
    if (A_(S.ms))
      S.ms = S.ms.filter(m => m && typeof m.d == 'string' && O_(m.v));
    ['ach', 'bc', 'wdc', 'stz'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (S.pc != null && !(S.pc >= 0))
      delete S.pc;
    (S.logs || []).forEach(l => {
      if (l && l.k && l.k != 'c' && l.k != 'w')
        delete l.k;
      if (l && l.k == 'c' && !O_(l.c))
        delete l.k;
    });
  }
  catch (e) {
    logError('arranque: reparar medidas y registros', e);
  }
})();
setTimeout(checkAchievements, 2500);
$('nav').innerHTML = ['workout', 'nutri', 'dash', 'user'].map((n, i) => '<button data-a="tab" data-i="' + i + '"><span style="display:block;line-height:0;padding-bottom:4px">' + icon(n, 28) + '</span>' + ['Workout', 'Nutrición', 'Dashboard', 'Perfil'][i] + '</button>').join('');
R();
window.__ffok = 1;
/* después del primer render: aviso de datos dañados, copia automática del día y almacenamiento persistente */
if (stateRecovered == 1)
  setTimeout(() => dialog('No se pudieron leer tus datos', 'Estaban dañados. Se ha guardado una copia aparte para no perderlos: en Perfil → Ajustes → Diagnóstico puedes descargarla. ' + (S.logs.length || Object.keys(S.meals).length ? 'Tus entrenos y comidas se han podido conservar. ' : '') + 'Si tienes una copia de seguridad o una copia automática, restáurala desde Perfil → Copia de seguridad.', [['Entendido', 'zno', 'pr']]), 600);
else if (stateRecovered == 2)
  setTimeout(() => dialog('No se pudo leer una parte de tus datos', 'Algunos registros estaban dañados y se han apartado; el resto de tus datos está intacto. En Perfil → Ajustes → Diagnóstico puedes descargar lo apartado. Si tienes una copia de seguridad o una copia automática, restáurala desde Perfil → Copia de seguridad.', [['Entendido', 'zno', 'pr']]), 600);
/* datos de la 1.20 o anteriores: se pasan a partes nada más arrancar (core/persist) */
if (savedFormat == 'whole')
  setTimeout(saveState, 1000);
setTimeout(() => takeSnapshot().catch(e => logError('copia automática', e)), 4000);
if (whatsNewDue())
  setTimeout(showWhatsNew, 900);
/* pide al navegador que no borre los datos de la app instalada cuando falte espacio (sin efecto si no lo admite) */
if (isStandalone() && navigator.storage && navigator.storage.persist)
  navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(e => logError('almacenamiento persistente', e));
