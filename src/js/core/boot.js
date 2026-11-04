/* ═══ core/boot ═══
   Arranque: deja válido el estado (core/repair), recupera el entreno en curso, pinta la app (o el inicio de sesión, si no hay
   cuenta: account/login) y, con sesión, empieza a sincronizar con Firebase (cloud/sync).
   Define: —
*/
import { $, fmtDuration, fmtMinSec, roundInt } from './util.js';
import { Store } from './store.js';
import { logError } from './errors.js';
import { stateRecovered } from './persist.js';
import { applyTheme, S, saveState, W } from './state.js';
import { icon } from './icons.js';
import { dialog } from './ui.js';
import { R } from './render.js';
import { restorePlanBackup } from '../routines/builder.js';
import { pendingResume, setPendingResume, WIP_KEY } from '../workout/resume.js';
import { keepAwake } from '../workout/wake.js';
import { restEnded } from '../workout/session.js';
import { applyAccent } from '../profile/appearance.js';
import { beep, buzz } from '../profile/feedback.js';
import { isStandalone } from '../system/files.js';
import { plural } from '../system/backup.js';
import { takeSnapshot } from '../system/snapshots.js';
import { showWhatsNew, whatsNewDue } from '../system/updates.js';
import { checkAchievements } from '../extras/achievements.js';
import { html, raw } from './html.js';
import { repairState } from './repair.js';
import { signedIn } from '../cloud/session.js';
import { startSync } from '../cloud/sync.js';
repairState();
applyTheme();
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
      restEnded();
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
setInterval(keepAwake, 2500);
try {
  const q = Store.get(Store.K.rs);
  if (q) {
    Store.del(Store.K.rs);
    const o = JSON.parse(q);
    setTimeout(() => {
      try {
        dialog(o.u ? 'Datos recuperados' : 'Copia restaurada', html`<div style="display:grid;gap:6px;text-align:left">${(o.s || []).map(x => html`<div>· ${x}</div>`)}</div>${o.f ? html`<div style="margin-top:10px">Se descartaron ${raw(plural(o.f, 'elemento dañado', 'elementos dañados'))} de la copia.</div>` : ''}`, [['Entendido', 'zno', 'pr']]);
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
/* las fotos de progreso de la serie de prueba ya no existen (sin datos personales: F-35) */
try {
  indexedDB.deleteDatabase('ffph');
}
catch (e) {
  logError('arranque: borrar fotos de progreso', e);
}
if (signedIn())
  setTimeout(checkAchievements, 2500);
$('nav').innerHTML = ['workout', 'nutri', 'dash', 'user'].map((n, i) => html`<button data-a="tab" data-i="${i}"><span style="display:block;line-height:0;padding-bottom:4px">${icon(n, 28)}</span>${raw(['Workout', 'Nutrición', 'Dashboard', 'Perfil'][i])}</button>`).join('');
R();
window.__ffok = 1;
/* después del primer render: aviso de datos dañados, copia automática del día y almacenamiento persistente */
if (stateRecovered == 1)
  setTimeout(() => dialog('No se pudieron leer tus datos', 'Estaban dañados. Se ha guardado una copia aparte para no perderlos: en Perfil → Ajustes → Diagnóstico puedes descargarla. ' + (S.logs.length || Object.keys(S.meals).length ? 'Tus entrenos y comidas se han podido conservar. ' : '') + 'Si tienes una copia de seguridad o una copia automática, restáurala desde Perfil → Ajustes → Copia de seguridad.', [['Entendido', 'zno', 'pr']]), 600);
else if (stateRecovered == 2)
  setTimeout(() => dialog('No se pudo leer una parte de tus datos', 'Algunos registros estaban dañados y se han apartado; el resto de tus datos está intacto. En Perfil → Ajustes → Diagnóstico puedes descargar lo apartado. Si tienes una copia de seguridad o una copia automática, restáurala desde Perfil → Ajustes → Copia de seguridad.', [['Entendido', 'zno', 'pr']]), 600);
/* lo arreglado al arrancar se guarda (solo se escribe lo que cambió: core/persist) */
setTimeout(saveState, 1000);
if (signedIn()) {
  setTimeout(() => takeSnapshot().catch(e => logError('copia automática', e)), 4000);
  if (whatsNewDue())
    setTimeout(showWhatsNew, 900);
  startSync();
}
/* pide al navegador que no borre los datos de la app instalada cuando falte espacio (sin efecto si no lo admite) */
if (isStandalone() && navigator.storage && navigator.storage.persist)
  navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(e => logError('almacenamiento persistente', e));
